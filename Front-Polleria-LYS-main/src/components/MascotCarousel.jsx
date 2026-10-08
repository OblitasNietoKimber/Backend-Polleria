import { useEffect, useState } from 'react'
import '../styles/home.css'

// Mismos 2 personajes repetidos para llenar los 4 "roles" (centro, izquierda,
// derecha, atrás) que usa la animación de TOONHUB.
const MASCOTS = [
  { src: 'https://res.cloudinary.com/msprqskb/image/upload/v1789276539/MascotaV2LYS.png', scaleClass: 'mascot-img-scale-a' },
  { src: 'https://res.cloudinary.com/msprqskb/image/upload/v1789277395/MascotaV2.png', scaleClass: 'mascot-img-scale-b' },
]

const SLIDES = [MASCOTS[0], MASCOTS[1], MASCOTS[0], MASCOTS[1]]

export default function MascotCarousel({ interval = 3200 }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length)
    }, interval)
    return () => clearInterval(timer)
  }, [interval])

  const center = activeIndex
  const left = (activeIndex + 3) % SLIDES.length
  const right = (activeIndex + 1) % SLIDES.length
  const back = (activeIndex + 2) % SLIDES.length

  const roleFor = (index) =>
    index === center ? 'center' : index === left ? 'left' : index === right ? 'right' : 'back'

  return (
    <div className="mascot-carousel">
      {SLIDES.map(({ src, scaleClass }, index) => (
        <div key={`${src}-${index}`} className={`mascot-slide mascot-slide-${roleFor(index)}`}>
          <img
            src={src}
            alt="Mascota Leña y Sabores"
            draggable={false}
            className={`mascot-img ${scaleClass}`}
          />
        </div>
      ))}
    </div>
  )
}
