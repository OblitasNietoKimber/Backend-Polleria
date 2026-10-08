export function filterProducts(products, { category = 'todos', search = '' } = {}) {
  const normalizedSearch = search.trim().toLowerCase()

  return products.filter((product) => {
    const matchesCategory = category === 'todos' || product.category === category
    const matchesSearch = product.name.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })
}
