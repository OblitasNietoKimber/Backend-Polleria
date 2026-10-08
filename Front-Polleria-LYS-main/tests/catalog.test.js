import { beforeEach, expect, test, vi } from 'vitest'
const fake = vi.hoisted(() => ({ from: vi.fn(), user: null }))
vi.mock('../src/lib/insforge', () => ({ insforge: { database: { from: fake.from } }, configurationError: '' }))
import { getCategories } from '../src/services/productService'

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
