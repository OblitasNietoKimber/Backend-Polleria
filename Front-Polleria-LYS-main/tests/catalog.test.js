import { beforeEach, expect, test, vi } from 'vitest'
const fake = vi.hoisted(() => ({ from: vi.fn(), currentUser: vi.fn() }))
vi.mock('../src/lib/insforge', () => ({ insforge: { database: { from: fake.from }, auth: { getCurrentUser: fake.currentUser } }, configurationError: '' }))
import { getCategories, getProducts, getProduct, createProduct } from '../src/services/productService'

let requests
let responses
beforeEach(() => {
  requests = []
  responses = []
  fake.currentUser.mockResolvedValue({ data: { user: null }, error: null })
  fake.from.mockImplementation(table => {
    const request = { table }
    requests.push(request)
    const query = {
      select: columns => { request.columns = columns; return query },
      order: column => { request.order = column; return query },
      eq: (column, value) => { request.eq = [column, value]; return query },
      ilike: (column, value) => { request.ilike = [column, value]; return query },
      maybeSingle: () => Promise.resolve(responses.shift()),
      single: () => Promise.resolve(responses.shift()),
      insert: rows => { request.insert = rows; return query },
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

test('consulta un detalle por ID y reconoce un producto retirado', async () => {
  responses.push({ data: { id: 18, nombre: 'Detalle', precio: '12', disponible: false } })
  expect(await getProduct('18')).toMatchObject({ id: 18, name: 'Detalle', price: 12, available: false })
  expect(requests[0].eq).toEqual(['id', 18])
  responses.push({ data: null })
  expect(await getProduct(19)).toBeNull()
})

test('no consulta identificadores inválidos ni oculta errores del detalle', async () => {
  for (const id of ['abc', -1, 1.5, '', null, '9007199254740992']) {
    await expect(getProduct(id)).rejects.toThrow('identificador')
  }
  expect(requests).toHaveLength(0)
  responses.push({ data: null, error: { message: 'Error del servidor' } })
  await expect(getProduct(1)).rejects.toThrow('Error del servidor')
})

test('busca en PostgreSQL, recorta espacios y escapa los comodines escritos', async () => {
  responses.push({ data: [] })
  await getProducts({ search: '  Pollo%_  ' })
  expect(requests[0].ilike).toEqual(['nombre', '%Pollo\\%\\_%'])
  responses.push({ data: [] })
  await getProducts({ search: '   ' })
  expect(requests[1].ilike).toBeUndefined()
})

test('combina categoría y búsqueda en todos los lotes de la consulta', async () => {
  responses.push({ data: Array.from({ length: 100 }, (_, id) => ({ id: id + 1 })) }, { data: [] })
  await getProducts({ category: 'especiales', search: 'pollo' })
  expect(requests).toHaveLength(2)
  for (const request of requests) {
    expect(request.eq).toEqual(['categoria_id', 'especiales'])
    expect(request.ilike).toEqual(['nombre', '%pollo%'])
  }
  responses.push({ data: [] })
  await getProducts({ category: 'todos' })
  expect(requests[2].eq).toBeUndefined()
})

const validProduct = { name: '  Pollo nuevo  ', category: ' pollos ', desc: ' Descripción ', price: 24.5, image: 'https://example.com/pollo.png', available: false }

test('el Administrador crea un producto y PostgreSQL asigna su ID', async () => {
  fake.currentUser.mockResolvedValue({ data: { user: { id: 'admin-id', profile: { rol: 'cliente' } } } })
  responses.push({ data: { rol: 'admin' } }, { data: { id: 18, categoria_id: 'pollos', nombre: 'Pollo nuevo', precio: '24.50', disponible: false } })
  expect(await createProduct({ ...validProduct, id: 1, rol: 'admin' })).toMatchObject({ id: 18, name: 'Pollo nuevo', price: 24.5, available: false })
  expect(requests[0]).toMatchObject({ table: 'perfiles', eq: ['id', 'admin-id'], columns: 'rol' })
  expect(requests[1].insert).toEqual([{ nombre: 'Pollo nuevo', categoria_id: 'pollos', descripcion: 'Descripción', precio: 24.5, imagen: validProduct.image, disponible: false }])
})

test('no acepta metadata editable como autorización ni crea productos sin sesión', async () => {
  await expect(createProduct(validProduct)).rejects.toThrow('iniciar sesión')
  expect(requests).toHaveLength(0)
  fake.currentUser.mockResolvedValue({ data: { user: { id: 'cliente', profile: { rol: 'admin' } } } })
  responses.push({ data: { rol: 'cliente' } })
  await expect(createProduct(validProduct)).rejects.toThrow('Solo el Administrador')
  expect(requests.every(request => !request.insert)).toBe(true)
})

test('valida los datos antes de consultar la sesión o realizar una escritura', async () => {
  for (const patch of [{ name: ' ' }, { category: '' }, { price: -1 }, { price: NaN }, { price: '10' }, { available: 'true' }, { image: 'javascript:alert(1)' }]) {
    await expect(createProduct({ ...validProduct, ...patch })).rejects.toThrow()
  }
  expect(fake.currentUser).not.toHaveBeenCalled()
  expect(requests).toHaveLength(0)
})

test('no oculta una denegación de RLS aunque la comprobación previa permita al Administrador', async () => {
  fake.currentUser.mockResolvedValue({ data: { user: { id: 'admin-id' } } })
  responses.push({ data: { rol: 'admin' } }, { data: null, error: { message: 'new row violates row-level security policy' } })
  await expect(createProduct(validProduct)).rejects.toThrow('row-level security')
})
