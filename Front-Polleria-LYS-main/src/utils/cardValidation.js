/* Validación de tarjeta para la pasarela de pago (checkout). */

/** Algoritmo de Luhn: valida que el número de tarjeta sea matemáticamente correcto. */
export function luhnCheck(digits) {
  if (!digits) return false
  let sum = 0
  let shouldDouble = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i])
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

/** Detecta la marca de la tarjeta a partir de los primeros dígitos (BIN). */
export function detectCardBrand(digits) {
  if (!digits) return null
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]))/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^3(0[0-5]|[68])/.test(digits)) return 'diners'
  if (/^6(011|5)/.test(digits)) return 'discover'
  return null
}

export const BRAND_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  diners: 'Diners Club',
  discover: 'Discover',
}

/** Formatea el número de tarjeta en grupos (4-4-4-4, o 4-6-5 para Amex) mientras se escribe. */
export function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  const brand = detectCardBrand(digits)
  if (brand === 'amex') {
    const a = digits.slice(0, 4)
    const b = digits.slice(4, 10)
    const c = digits.slice(10, 15)
    return [a, b, c].filter(Boolean).join(' ')
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Formatea la fecha de vencimiento como MM/AA mientras se escribe. */
export function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/** Deja solo dígitos, limitando el CVV a 4 caracteres (Amex usa 4, el resto 3). */
export function formatCvv(value) {
  return value.replace(/\D/g, '').slice(0, 4)
}

/**
 * Valida los datos de la tarjeta y devuelve un objeto de errores por campo.
 * Un objeto vacío significa que todos los datos son válidos.
 */
export function validateCardForm({ number, name, expiry, cvv }) {
  const errors = {}
  const digits = (number || '').replace(/\D/g, '')
  const brand = detectCardBrand(digits)

  if (!digits) {
    errors.number = 'Ingresa el número de tarjeta.'
  } else if (digits.length < 13 || digits.length > 19) {
    errors.number = 'El número de tarjeta no es válido.'
  } else if (!luhnCheck(digits)) {
    errors.number = 'El número de tarjeta no es válido.'
  } else if (!brand) {
    errors.number = 'No reconocemos esta marca de tarjeta.'
  }

  const trimmedName = (name || '').trim()
  if (!trimmedName) {
    errors.name = 'Ingresa el nombre del titular.'
  } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/.test(trimmedName)) {
    errors.name = 'Ingresa el nombre tal como aparece en la tarjeta.'
  }

  const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(expiry || '')
  if (!expiry) {
    errors.expiry = 'Ingresa la fecha de vencimiento.'
  } else if (!expiryMatch) {
    errors.expiry = 'Usa el formato MM/AA.'
  } else {
    const month = Number(expiryMatch[1])
    const year = 2000 + Number(expiryMatch[2])
    if (month < 1 || month > 12) {
      errors.expiry = 'El mes debe estar entre 01 y 12.'
    } else {
      const endOfMonth = new Date(year, month, 0, 23, 59, 59)
      if (endOfMonth < new Date()) {
        errors.expiry = 'La tarjeta está vencida.'
      }
    }
  }

  const cvvLength = brand === 'amex' ? 4 : 3
  const cvvDigits = (cvv || '').replace(/\D/g, '')
  if (!cvvDigits) {
    errors.cvv = 'Ingresa el CVV.'
  } else if (cvvDigits.length !== cvvLength) {
    errors.cvv = `El CVV debe tener ${cvvLength} dígitos.`
  }

  return errors
}
