import { beforeEach, expect, test, vi } from 'vitest'
const fake = vi.hoisted(() => ({ from: vi.fn(), user: null }))
vi.mock('../src/lib/insforge', () => ({ insforge: { database: { from: fake.from } }, configurationError: '' }))
import { getCategories, getProducts } from '../src/services/productService'

let requests
let responses
beforeEach(() => {
  requests = []
  responses = []
  fake.user = null
  fake.from.mockImplementation(table => {
    const request = { table }
    requests.push(request)
    const query = {
      select: columns => { request.columns = columns; return query },
      order: column => { request.order = column; return query },
      range: (from, to) => { request.range = [from, to]; return Promise.resolve(responses.shift()) },
    }
    return query
  })
})

test('consulta categorías persistidas, conserva sus campos y acepta una tabla vacía', async () => {
  responses.push({ data: [{ id: 'nueva', nombre: 'Nueva categoría', descripcion: 'Desde PostgreSQL', imagen: null }], error: null })
  expect(await getCategories()).toEqual([{ id: 'nueva', label: 'Nueva categoría', desc: 'Desde PostgreSQL', image: null }])
  expect(requests[0]).toMatchObject({ table: 'categorias', range: [0, 99] })
  responses.push({ data: [], error: null })
  expect(await getCategories()).toEqual([])
})

test('recorre lotes de categorías sin truncar y propaga un fallo de red', async () => {
  const first = Array.from({ length: 100 }, (_, id) => ({ id: String(id), nombre: `Categoría ${id}` }))
  responses.push({ data: first }, { data: [{ id: 'ultima', nombre: 'Última' }] })
  expect(await getCategories()).toHaveLength(101)
  expect(requests[1].range).toEqual([100, 199])
  responses.push({ data: null, error: { message: 'Sin conexión' } })
  await expect(getCategories()).rejects.toThrow('Sin conexión')
})

test('consulta todos los campos y conserva precio, imagen nula y disponibilidad falsa', async () => {
  responses.push({ data: [{ id: '18', categoria_id: 'nueva', nombre: 'Nuevo plato', descripcion: 'Persistido', imagen: null, precio: '19.50', disponible: false }] })
  expect(await getProducts()).toEqual([{ id: 18, category: 'nueva', name: 'Nuevo plato', desc: 'Persistido', image: null, price: 19.5, available: false }])
  expect(requests[0].columns).toBe('id,categoria_id,nombre,descripcion,imagen,precio,disponible')
  expect(requests[0]).toMatchObject({ table: 'productos', order: 'id', range: [0, 99] })
})

test('recorre lotes de productos sin limitar el catálogo a los primeros cien', async () => {
  responses.push({ data: Array.from({ length: 100 }, (_, id) => ({ id: id + 1, precio: '10' })) }, { data: [{ id: 101, precio: '11' }] })
  const products = await getProducts()
  expect(products).toHaveLength(101)
  expect(products.at(-1)).toMatchObject({ id: 101, price: 11 })
  expect(requests[1].range).toEqual([100, 199])
})
