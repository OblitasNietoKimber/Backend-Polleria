import { test, expect } from '@playwright/test'

const categories = [
  { id: 'especiales', nombre: 'Especiales persistidos', descripcion: 'Categoría del servidor', imagen: null },
  { id: 'otras', nombre: 'Otras categorías', descripcion: '', imagen: null },
]
const products = [
  { id: 101, categoria_id: 'especiales', nombre: 'Plato del servidor', descripcion: 'Descripción persistida', imagen: null, precio: '21.50', disponible: true },
  { id: 102, categoria_id: 'otras', nombre: 'Plato agotado', descripcion: 'Temporalmente agotado', imagen: null, precio: '12.00', disponible: false },
]

async function mockCatalog(page, options = {}) {
  const calls = []
  let failProducts = Boolean(options.failProducts)
  await page.route('https://mpy5z5dn.us-east.insforge.app/**', async route => {
    const url = new URL(route.request().url())
    calls.push(url)
    let status = 200
    let response = []
    if (url.pathname === '/api/auth/refresh') {
      status = 401
      response = { message: 'No active session', statusCode: 401 }
    } else if (url.pathname.endsWith('/categorias')) response = categories
    else if (url.pathname.endsWith('/productos')) {
      if (options.beforeProducts) await options.beforeProducts()
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay))
      const id = url.searchParams.get('id')
      response = id ? products.filter(product => `eq.${product.id}` === id) : products
      const pattern = url.searchParams.get('nombre')
      if (pattern) response = response.filter(product => product.nombre.toLowerCase().includes(pattern.slice(7, -1).toLowerCase()))
      const category = url.searchParams.get('categoria_id')
      if (category) response = response.filter(product => `eq.${product.categoria_id}` === category)
      if (failProducts) { failProducts = false; status = 400; response = { message: 'No se pudo consultar el catálogo' } }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) })
  })
  return calls
}

test('muestra categorías nuevas recibidas del servidor', async ({ page }) => {
  const calls = await mockCatalog(page)
  await page.goto('/catalogo')
  await expect(page.getByRole('button', { name: 'Especiales persistidos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pollos a la Leña' })).toHaveCount(0)
  expect(calls.some(url => url.pathname.endsWith('/categorias'))).toBe(true)
})

test('muestra los campos persistidos y bloquea agregar un producto agotado', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/catalogo')
  const available = page.locator('.ticket-card').filter({ hasText: 'Plato del servidor' })
  await expect(available).toContainText('Descripción persistida')
  await expect(available).toContainText('21.50')
  await expect(page.locator('.ticket-card')).toHaveCount(2)
  await expect(page.locator('.ticket-card').filter({ hasText: 'Plato agotado' }).getByRole('button', { name: 'Agotado' })).toBeDisabled()
  await available.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: 'Ver carrito' }).click()
  await expect(page.locator('.cart-drawer-item-name')).toHaveText('Plato del servidor')
  await expect(page.locator('.cart-drawer-subtotal')).toContainText('21.50')
})

test('consulta el detalle directamente por ID y muestra sus campos', async ({ page }) => {
  const calls = await mockCatalog(page)
  await page.goto('/catalogo?producto=101')
  await expect(page.locator('.product-modal-title')).toHaveText('Plato del servidor')
  await expect(page.locator('.product-modal-desc')).toHaveText('Descripción persistida')
  await expect(page.locator('.product-modal-price')).toContainText('21.50')
  expect(calls.some(url => url.searchParams.get('id') === 'eq.101')).toBe(true)
  await page.getByRole('button', { name: 'Cerrar detalle del producto' }).click()
  await expect(page.locator('.product-modal-title')).toHaveCount(0)
})

test('la búsqueda consulta al servidor y conserva el texto en la URL', async ({ page }) => {
  const calls = await mockCatalog(page)
  await page.goto('/catalogo')
  await expect(page.locator('.ticket-card')).toHaveCount(2)
  await page.getByRole('textbox', { name: 'Buscar un plato' }).fill('AGOTADO')
  await expect(page.locator('.ticket-card')).toHaveCount(1)
  await expect(page.locator('.product-card-name')).toHaveText('Plato agotado')
  await expect(page).toHaveURL(/buscar=AGOTADO/)
  expect(calls.some(url => url.searchParams.get('nombre') === 'ilike.%AGOTADO%')).toBe(true)
})

test('combina el filtro de categoría con la búsqueda persistida', async ({ page }) => {
  const calls = await mockCatalog(page)
  await page.goto('/catalogo')
  await page.getByRole('button', { name: 'Especiales persistidos' }).click()
  await expect(page.locator('.ticket-card')).toHaveCount(1)
  await expect(page.locator('.product-card-name')).toHaveText('Plato del servidor')
  await page.getByRole('textbox', { name: 'Buscar un plato' }).fill('agotado')
  await expect(page.getByText('No encontramos platos que coincidan con tu búsqueda.')).toBeVisible()
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(page.locator('.product-card-name')).toHaveText('Plato agotado')
  expect(calls.some(url => url.searchParams.get('categoria_id') === 'eq.especiales' && url.searchParams.get('nombre') === 'ilike.%agotado%')).toBe(true)
})

test('distingue carga, error y reintento sin usar productos estáticos', async ({ page }) => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  await mockCatalog(page, { failProducts: true, beforeProducts: () => pending })
  await page.goto('/catalogo', { waitUntil: 'domcontentloaded' })
  try { await expect(page.getByText('Cargando el menú actualizado...')).toBeVisible() }
  finally { release() }
  await expect(page.getByRole('alert')).toContainText('No se pudo consultar el catálogo')
  await expect(page.locator('.ticket-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'Reintentar productos' }).click()
  await expect(page.locator('.ticket-card')).toHaveCount(2)
})

test('muestra el estado vacío y un detalle retirado', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/catalogo?buscar=inexistente&producto=999')
  await expect(page.getByText('No encontramos platos que coincidan con tu búsqueda.')).toBeVisible()
  await expect(page.getByText('Este producto ya no está en el catálogo.')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar detalle', exact: true }).click()
  await expect(page).not.toHaveURL(/producto=/)
})
