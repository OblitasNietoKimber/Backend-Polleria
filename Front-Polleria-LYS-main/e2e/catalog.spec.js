import { test, expect } from '@playwright/test'

const categories = [{ id: 'especiales', nombre: 'Especiales persistidos', descripcion: 'Categoría del servidor', imagen: null }]
const products = [
  { id: 101, categoria_id: 'especiales', nombre: 'Plato del servidor', descripcion: 'Descripción persistida', imagen: null, precio: '21.50', disponible: true },
  { id: 102, categoria_id: 'especiales', nombre: 'Plato agotado', descripcion: 'Temporalmente agotado', imagen: null, precio: '12.00', disponible: false },
]

async function mockCatalog(page) {
  const calls = []
  await page.route('https://mpy5z5dn.us-east.insforge.app/**', async route => {
    const url = new URL(route.request().url())
    calls.push(url)
    let status = 200
    let response = []
    if (url.pathname === '/api/auth/refresh') {
      status = 401
      response = { message: 'No active session', statusCode: 401 }
    } else if (url.pathname.endsWith('/categorias')) response = categories
    else if (url.pathname.endsWith('/productos')) response = products
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
