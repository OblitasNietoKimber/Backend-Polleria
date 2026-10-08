import { insforge, configurationError } from '../lib/insforge'

const PRODUCT_COLUMNS = 'id,categoria_id,nombre,descripcion,imagen,precio,disponible'

function productFromRow(row) {
  return {
    id: Number(row.id), category: row.categoria_id, name: row.nombre,
    desc: row.descripcion, image: row.imagen, price: Number(row.precio), available: row.disponible,
  }
}

function database() {
  if (configurationError) throw new Error(configurationError)
  return insforge.database
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'No se pudo consultar el catálogo.')
  return data
}

// Cada petición tiene un límite; el bucle conserva todas las categorías persistidas.
export async function getCategories() {
  const categories = []
  for (let from = 0; ; from += 100) {
    const rows = unwrap(await database().from('categorias')
      .select('id,nombre,descripcion,imagen').order('id').range(from, from + 99)) || []
    categories.push(...rows.map(row => ({
      id: row.id, label: row.nombre, desc: row.descripcion, image: row.imagen,
    })))
    if (rows.length < 100) return categories
  }
}

export async function getProducts({ search = '', category = 'todos' } = {}) {
  const term = search.trim()
  const products = []
  for (let from = 0; ; from += 100) {
    let query = database().from('productos').select(PRODUCT_COLUMNS)
    if (category !== 'todos') query = query.eq('categoria_id', category)
    if (term) query = query.ilike('nombre', `%${term.replace(/[\\%_]/g, '\\$&')}%`)
    const rows = unwrap(await query.order('id').range(from, from + 99)) || []
    products.push(...rows.map(productFromRow))
    if (rows.length < 100) return products
  }
}

function productId(value) {
  const id = Number(value)
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(id)) {
    throw new Error('El identificador del producto no es válido.')
  }
  return id
}

export async function getProduct(value) {
  const id = productId(value)
  const row = unwrap(await database().from('productos').select(PRODUCT_COLUMNS)
    .eq('id', id).maybeSingle())
  return row ? productFromRow(row) : null
}

async function requireAdministrator() {
  database()
  const session = unwrap(await insforge.auth.getCurrentUser())
  if (!session?.user) throw new Error('Debes iniciar sesión para modificar productos.')
  const profile = unwrap(await database().from('perfiles').select('rol')
    .eq('id', session.user.id).maybeSingle())
  if (profile?.rol !== 'admin') throw new Error('Solo el Administrador puede modificar productos.')
  // PostgreSQL vuelve a comprobar el rol al ejecutar la escritura.
}

function productValues(product) {
  if (typeof product?.name !== 'string' || !product.name.trim()) throw new Error('El nombre es obligatorio.')
  if (typeof product.category !== 'string' || !product.category.trim()) throw new Error('La categoría es obligatoria.')
  if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0 || product.price > 99999999.99) {
    throw new Error('El precio debe ser un número válido mayor o igual a cero.')
  }
  const available = product.available ?? true
  if (typeof available !== 'boolean') throw new Error('La disponibilidad debe ser verdadera o falsa.')
  if (product.desc !== undefined && typeof product.desc !== 'string') throw new Error('La descripción no es válida.')
  if (product.image != null && typeof product.image !== 'string') throw new Error('La imagen debe ser una URL.')
  const image = product.image?.trim() || null
  if (image) {
    let url
    try { url = new URL(image) } catch { throw new Error('La imagen debe ser una URL válida.') }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('La imagen debe usar una URL HTTP o HTTPS.')
  }
  return {
    nombre: product.name.trim(), categoria_id: product.category.trim(), precio: product.price,
    descripcion: product.desc?.trim() || '', imagen: image, disponible: available,
  }
}

export async function createProduct(product) {
  const values = productValues(product)
  await requireAdministrator()
  return productFromRow(unwrap(await database().from('productos').insert([values])
    .select(PRODUCT_COLUMNS).single()))
}

export async function updateProduct(value, product) {
  const id = productId(value)
  const values = productValues(product)
  await requireAdministrator()
  return productFromRow(unwrap(await database().from('productos').update(values)
    .eq('id', id).select(PRODUCT_COLUMNS).single()))
}
