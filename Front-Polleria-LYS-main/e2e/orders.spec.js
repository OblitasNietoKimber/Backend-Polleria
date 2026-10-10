import { test, expect } from '@playwright/test'
const identity = { id:'00000000-0000-0000-0000-000000000001', email:'cliente@example.test',emailVerified:true,profile:{name:'Cliente'} }
const form={name:'Cliente Prueba',phone:'987654321',address:'Av. Prueba 123',reference:''}
async function backend(page,{type='delivery',failFirst=false,foreign=false,initialOrder=false}={}) {
  let saved=initialOrder ? {
    id:'00000000-0000-0000-0000-000000000099',
    codigo:'LS-1e71413b-1343-4300-bb1b-8c9112178ec9',tipo:type,
    entrega:form,subtotal:'128.70',envio:'6.00',total:'134.70',
    estado_id:'recibido',creado_en:'2026-10-10T06:16:00Z',
    detalles_pedido:[{producto_id:1,cantidad:3,precio_unitario:'42.90',
      nombre_producto:'Pollo a la Brasa con papas, ensalada y todas las cremas de la casa'}],
  } : null; const confirmations=[]
  await page.addInitScript(({type,form}) => {
    localStorage.setItem('lys-cart',JSON.stringify({1:1}))
    localStorage.setItem('lys-checkout-delivery',JSON.stringify({deliveryType:type,form}))
    localStorage.setItem('lys-checkout-payment','efectivo')
  },{type,form})
  await page.route('https://mpy5z5dn.us-east.insforge.app/**',async route => {
    const req=route.request(),url=new URL(req.url()),path=url.pathname
    let response={},status=200
    if(path==='/api/auth/refresh') {
      const token=`${btoa(JSON.stringify({alg:'HS256'}))}.${btoa(JSON.stringify({sub:identity.id,exp:Math.floor(Date.now()/1000)+3600}))}.signature`
      response={user:identity,accessToken:token}
    } else if(path==='/api/auth/public-config') response={oAuthProviders:[]}
    else if(path==='/api/database/records/perfiles') response={id:identity.id,nombre:'Cliente',apellido:'Prueba',telefono:form.phone,rol:'cliente',preferencias:{}}
    else if(path==='/api/database/records/productos') response={id:1,categoria_id:'pollos',nombre:'Pollo a la Brasa',precio:'42.90',descripcion:'',disponible:true}
    else if(path.includes('/rpc/crear_pedido_cliente')) {
      const body=req.postDataJSON(); confirmations.push(body)
      saved={id:'00000000-0000-0000-0000-000000000099',codigo:body.p_codigo,tipo:body.p_tipo,entrega:body.p_entrega,subtotal:'42.90',envio:type==='delivery'?'6.00':'0.00',total:type==='delivery'?'48.90':'42.90',estado_id:'recibido',creado_en:'2026-10-08T22:00:00Z',metodo_pago_solicitado:'efectivo',detalles_pedido:[{producto_id:1,cantidad:1,precio_unitario:'42.90',nombre_producto:'Pollo a la Brasa'}]}
      if(failFirst&&confirmations.length===1) { status=503; response={message:'Conexión interrumpida',code:'503'} }
      else response=saved.id
    } else if(path==='/api/database/records/pedidos') {
      if(foreign) response=null
      else if(url.searchParams.get('select')==='estado_id') response={estado_id:'recibido'}
      else response=url.searchParams.has('codigo') ? saved : saved?[saved]:[]
    } else if(path==='/api/database/records/historial_estados_pedido') response=[{id:1,estado_anterior:null,estado_id:'recibido',cambiado_por:identity.id,cambiado_en:'2026-10-08T22:00:00Z'}]
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)})
  })
  return confirmations
}
for(const type of ['delivery','recojo']) {
  test(`confirma ${type} y muestra el pedido guardado en historial`,async({page}) => {
    const calls=await backend(page,{type})
    await page.setViewportSize({width:390,height:844})
    await page.goto('/checkout/resumen')
    await page.getByRole('button',{name:/Confirmar pedido/}).click()
    await expect(page.getByText('¡Pedido confirmado!')).toBeVisible()
    expect(calls).toHaveLength(1)
    expect(calls[0].p_items).toEqual([{producto_id:1,cantidad:1}])
    expect(calls[0]).not.toHaveProperty('total')
    await expect(page.getByRole('link',{name:'Ver mi pedido'})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('link',{name:'Ver mi pedido'}).click()
    await expect(page.getByRole('heading',{name:`Pedido ${calls[0].p_codigo}`})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('region',{name:'Historial de estados'})).toContainText('Recibido')
    await expect(page.locator('.order-item-row.total')).toContainText(type==='delivery'?'S/ 48.90':'S/ 42.90')
    expect(await page.evaluate(()=>localStorage.getItem('lys-client-orders'))).toBeNull()
  })
}
test('reintenta una respuesta perdida usando el mismo código de pedido',async({page}) => {
  const calls=await backend(page,{failFirst:true})
  await page.goto('/checkout/resumen')
  await page.getByRole('button',{name:/Confirmar pedido/}).click()
  await expect(page.getByRole('alert')).toContainText('Conexión interrumpida')
  await page.reload()
  await page.getByRole('button',{name:/Confirmar pedido/}).click()
  await expect(page.getByText('¡Pedido confirmado!')).toBeVisible()
  expect(calls).toHaveLength(2); expect(calls[0].p_codigo).toBe(calls[1].p_codigo)
})
test('no muestra detalles cuando el backend no devuelve un pedido ajeno',async({page}) => {
  await backend(page,{foreign:true})
  await page.goto('/pedidos/LS-ajeno')
  await expect(page.getByText('No encontramos ese pedido.')).toBeVisible()
  await expect(page.getByRole('region',{name:'Historial de estados'})).toHaveCount(0)
})

for (const width of [320, 390, 768, 876, 1280]) {
  test(`tarjeta de pedido legible sin superposiciones a ${width}px`, async ({ page }) => {
    await backend(page, { initialOrder: true })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/pedidos')
    const card = page.locator('.order-card')
    await expect(card).toBeVisible()
    await expect(card.locator('.order-card-product-name')).toContainText('Pollo a la Brasa')
    await expect(card.locator('.order-card-total')).toHaveText('S/ 134.70')
    // Medir tras la animación de entrada y la carga de las fuentes.
    await card.evaluate(async element => {
      await document.fonts.ready
      await Promise.all(element.getAnimations().map(animation => animation.finished))
    })
    const layout = await card.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const selectors = ['.order-card-icon', '.order-card-info', '.order-card-product',
        '.order-card-status-col', '.order-card-cta']
      const boxes = selectors.map(selector => element.querySelector(selector).getBoundingClientRect())
      const contained = boxes.every(box => box.left >= bounds.left && box.right <= bounds.right
        && box.top >= bounds.top && box.bottom <= bounds.bottom)
      const overlaps = boxes.some((a, i) => boxes.slice(i + 1).some(b =>
        Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1
        && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1))
      const textVisible = ['.order-card-id', '.order-card-product-name', '.order-card-count-tag']
        .every(selector => {
          const node = element.querySelector(selector)
          return node.clientWidth > 0 && node.scrollWidth <= node.clientWidth + 1
        })
      return { contained, overlaps, textVisible,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth }
    })
    expect(layout).toEqual({ contained: true, overlaps: false, textVisible: true, pageOverflow: false })
    await card.click()
    await expect(page.getByRole('heading', { name: 'Pedido LS-1e71413b-1343-4300-bb1b-8c9112178ec9' })).toBeVisible()
  })
}
