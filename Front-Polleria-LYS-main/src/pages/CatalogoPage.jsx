import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { PRODUCTS } from '../data/products'
import { filterProducts } from '../services/productService'
import ProductCard from '../components/ProductCard'
import ProductDetailModal from '../components/ProductDetailModal'
import '../styles/catalogo.css'

export default function CatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeCategory = searchParams.get('categoria') || 'todos'
  const search = searchParams.get('buscar') || ''
  const selectedProductId = searchParams.get('producto')

  const filteredProducts = filterProducts(PRODUCTS, { category: activeCategory, search })
  const selectedProduct = selectedProductId
    ? PRODUCTS.find((product) => product.id === Number(selectedProductId))
    : null

  function updateParams(next) {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'todos') params.delete(key)
      else params.set(key, value)
    })
    setSearchParams(params)
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
            value={search}
            onChange={(event) => updateParams({ buscar: event.target.value })}
          />
        </div>
      </div>

      <div className="catalogo-categories">
        <button
          className={`chip ${activeCategory === 'todos' ? 'active' : ''}`}
          onClick={() => updateParams({ categoria: 'todos' })}
        >
          Todos
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`chip ${activeCategory === c.id ? 'active' : ''}`}
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
