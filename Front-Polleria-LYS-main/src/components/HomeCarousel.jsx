import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function HomeCarousel({ slides, interval = 5000, showArrows = true, showDots = true }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return undefined
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, interval)
    return () => clearInterval(timer)
  }, [slides.length, interval])

  function goTo(next) {
    setIndex((next + slides.length) % slides.length)
  }

  if (slides.length === 0) return null

  return (
    <div className="home-carousel">
      {slides.map((slide, i) => (
        <img
          key={slide.id}
          src={slide.image}
          alt={slide.alt}
          className={`home-carousel-slide ${i === index ? 'active' : ''}`}
        />
      ))}

      {showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            className="home-carousel-arrow home-carousel-arrow-left"
            onClick={() => goTo(index - 1)}
            aria-label="Diapositiva anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="home-carousel-arrow home-carousel-arrow-right"
            onClick={() => goTo(index + 1)}
            aria-label="Siguiente diapositiva"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {showDots && slides.length > 1 && (
        <div className="home-carousel-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={`home-carousel-dot ${i === index ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
