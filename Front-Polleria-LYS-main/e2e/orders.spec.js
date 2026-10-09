import { test, expect } from '@playwright/test'
const identity = { id:'00000000-0000-0000-0000-000000000001', email:'cliente@example.test',emailVerified:true,profile:{name:'Cliente'} }
const form={name:'Cliente Prueba',phone:'987654321',address:'Av. Prueba 123',reference:''}
async function backend(page,{type='delivery',failFirst=false,foreign=false}={}) {
  let saved=null; const confirmations=[]
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
