import { ArrowRight, Flame, Heart, Truck, UtensilsCrossed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { BANNERS } from '../data/banners'
import HomeCarousel from '../components/HomeCarousel'
import MascotCarousel from '../components/MascotCarousel'
import '../styles/home.css'

const FEATURES = [
  { icon: Flame, title: 'Sabor auténtico', desc: 'Cocción a la leña' },
  { icon: Truck, title: 'Delivery rápido', desc: 'Hasta tu puerta' },
  { icon: UtensilsCrossed, title: 'Productos frescos', desc: 'Calidad garantizada' },
  { icon: Heart, title: 'Clientes felices', desc: 'Tu confianza nos inspira' },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <>
      <header className="home-hero">
        <div className="home-hero-media">
          <HomeCarousel slides={BANNERS} showArrows={false} showDots />
          <div className="home-hero-overlay" />
          <MascotCarousel />
        </div>

        <span className="home-hero-tagline">
          Más que pollo,
          <br />
          es tradición ♡
        </span>

        <div className="home-hero-content">
          <div className="home-hero-inner">
            <h1 className="font-display home-hero-title">
              El sabor que solo <span className="home-hero-highlight">da la leña.</span>
            </h1>
            <p className="home-hero-text">
              Pollos y parrillas cocinados a fuego de leña, con la receta de siempre. Pide online y recíbelo en tu
              mesa o en tu puerta.
            </p>
            <div className="home-hero-actions">
              <button className="btn-ember" onClick={() => navigate('/catalogo')}>
                Ver el menú completo
              </button>
              <button className="btn-outline home-hero-secondary" onClick={() => navigate('/catalogo')}>
                Hacer un pedido
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="home-features">
        <div className="home-features-inner">
          {FEATURES.map((feature) => (
            <div className="home-feature" key={feature.title}>
              <span className="home-feature-icon">
                <feature.icon size={20} />
              </span>
              <div>
                <strong>{feature.title}</strong>
                <p>{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-categories">
        <div className="home-categories-head">
          <div>
            <span className="home-categories-eyebrow">Explora nuestro menú</span>
            <h2 className="font-display home-categories-title">
              Nuestras <span className="home-categories-script">Categorías</span>
            </h2>
            <p className="home-categories-subtitle">Descubre todo lo que tenemos para ti</p>
          </div>
          <button onClick={() => navigate('/catalogo')} className="lys-navlink home-categories-link">
            Ver todo →
          </button>
        </div>

        <div className="home-categories-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/catalogo?categoria=${c.id}`)}
              className="home-category-card"
            >
              <div className="home-category-media">
                <img src={c.image} alt={c.label} />
                <span className={`home-category-tag home-category-tag-${c.color}`}>
                  <c.icon size={16} />
                </span>
              </div>
              <div className="home-category-body">
                <div>
                  <div className="font-display home-category-label">{c.label}</div>
                  <p className="home-category-desc">{c.desc}</p>
                </div>
                <span className="home-category-arrow">
                  <ArrowRight size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="home-divider">
        <span className="home-divider-line" />
        <Flame size={16} />
        <span className="home-divider-text">Más que pollo, es tradición</span>
        <Flame size={16} />
        <span className="home-divider-line" />
      </div>
    </>
  )
}
