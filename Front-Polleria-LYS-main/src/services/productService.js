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

