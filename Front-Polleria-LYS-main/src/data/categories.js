import { Flame, GlassWater, Soup, UtensilsCrossed } from 'lucide-react'

export const CATEGORIES = [
  {
    id: 'pollos',
    label: 'Pollos a la Leña',
    desc: 'El sabor tradicional que nos identifica.',
    image: 'https://res.cloudinary.com/msprqskb/image/upload/v1789275353/01-pollos-a-la-lena.png',
    icon: Flame,
    color: 'red',
  },
  {
    id: 'parrillas',
    label: 'Parrillas',
    desc: 'Carnes jugosas a la parrilla.',
    image: 'https://res.cloudinary.com/msprqskb/image/upload/v1789275353/02-parrillas.png',
    icon: UtensilsCrossed,
    color: 'brown',
  },
  {
    id: 'entradas',
    label: 'Entradas',
    desc: 'El complemento perfecto.',
    image: 'https://res.cloudinary.com/msprqskb/image/upload/v1789275353/03-entradas.png',
    icon: Soup,
    color: 'gold',
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    desc: 'Refresca tu experiencia.',
    image: 'https://res.cloudinary.com/msprqskb/image/upload/v1789275353/04-bebidas.png',
    icon: GlassWater,
    color: 'red',
  },
]
