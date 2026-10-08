export function filterProducts(products, { category = 'todos', search = '' } = {}) {
  const normalizedSearch = search.trim().toLowerCase()

  return products.filter((product) => {
    const matchesCategory = category === 'todos' || product.category === category
    const matchesSearch = product.name.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })
}
import { insforge, configurationError } from '../lib/insforge'

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

