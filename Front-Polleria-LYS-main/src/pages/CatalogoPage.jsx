import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogResource } from '../hooks/useCatalogResource'
import { getCategories, getProducts, getProduct } from '../services/productService'
import ProductCard from '../components/ProductCard'
import ProductDetailModal from '../components/ProductDetailModal'
import '../styles/catalogo.css'

export default function CatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryResource = useCatalogResource(getCategories, 'categorias')

  const activeCategory = searchParams.get('categoria') || 'todos'
  const search = searchParams.get('buscar') || ''
  const loadProducts = useCallback(() => getProducts({ search, category: activeCategory }), [search, activeCategory])
  const productResource = useCatalogResource(loadProducts, JSON.stringify([search, activeCategory]), 250)
  const products = productResource.data || []
  const selectedProductId = searchParams.get('producto')
  const loadDetail = useCallback(() => selectedProductId ? getProduct(selectedProductId) : Promise.resolve(null), [selectedProductId])
  const detailResource = useCatalogResource(loadDetail, `producto:${selectedProductId || ''}`)

  const filteredProducts = products
  const selectedProduct = detailResource.data

  function updateParams(next) {
    const params = new URLSearchParams(searchParams)
    if ('buscar' in next || 'categoria' in next) params.delete('producto')
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'todos') params.delete(key)
      else params.set(key, value)
    })
    setSearchParams(params, { replace: 'buscar' in next })
  }

  function openProduct(product) {
    updateParams({ producto: product.id })
  }

  function closeProduct() {
    updateParams({ producto: null })
  }

  return (
    <section className="catalogo-page">
      <h1 className="font-display catalogo-title">
        Nuestro menú
      </h1>
      <p className="catalogo-subtitle">Elige tus platos y arma tu pedido.</p>

      <div className="catalogo-filters">
        <div className="catalogo-search">
          <Search size={16} className="catalogo-search-icon" />
          <input
            className="lys-input catalogo-search-input"
            placeholder="Buscar un plato..."
            aria-label="Buscar un plato"
            value={search}
            onChange={(event) => updateParams({ buscar: event.target.value })}
          />
        </div>
      </div>

      <div className="catalogo-categories">
        <button
          className={`chip ${activeCategory === 'todos' ? 'active' : ''}`}
          aria-pressed={activeCategory === 'todos'}
          onClick={() => updateParams({ categoria: 'todos' })}
        >
          Todos
        </button>
        {(categoryResource.data || []).map((c) => (
          <button
            key={c.id}
            className={`chip ${activeCategory === c.id ? 'active' : ''}`}
            aria-pressed={activeCategory === c.id}
            onClick={() => updateParams({ categoria: c.id })}
          >
            <img src={c.image} alt="" className="catalogo-chip-icon" /> {c.label}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="catalogo-empty">
          No encontramos platos que coincidan con tu búsqueda.
        </div>
      ) : (
        <div className="catalogo-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onSelect={openProduct} />
          ))}
        </div>
      )}

      <ProductDetailModal product={selectedProduct} onClose={closeProduct} />
    </section>
  )
}
import { useCallback } from 'react'
