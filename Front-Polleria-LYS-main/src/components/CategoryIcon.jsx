import { CATEGORIES } from '../data/categories'

const TAMANOS = {
  sm: 'category-icon-sm',
  md: 'category-icon-md',
  lg: 'category-icon-lg',
}

export default function CategoryIcon({ id, size = 'md' }) {
  const category = CATEGORIES.find((item) => item.id === id)
  if (!category) return null

  const claseTamano = TAMANOS[size] || TAMANOS.md

  return (
    <img
      src={category.image}
      alt={category.label}
      className={`category-icon ${claseTamano}`}
    />
  )
}
