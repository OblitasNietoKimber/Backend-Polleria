import { detectCardBrand, luhnCheck, validateCardForm, BRAND_LABELS } from '../utils/cardValidation'

/**
 * Simula el llamado a una pasarela de pago real (tipo Culqi/Niubiz/Stripe):
 * valida de nuevo los datos en "backend" (defensa en profundidad, nunca confiar
 * solo en la validación del formulario), simula latencia de red y devuelve una
 * autorización con los datos que normalmente entregaría el procesador
 * (código de autorización, marca y últimos 4 dígitos), sin exponer el número
 * completo ni el CVV.
 *
 * NOTA: esta app no tiene backend propio ni credenciales de un procesador de
 * pagos real, por lo que esta función no mueve dinero de verdad; simula el
 * flujo completo (incluyendo posibles rechazos) para que la experiencia de
 * usuario y las validaciones sean las mismas que con una pasarela real.
 */
export function chargeCard({ number, name, expiry, cvv, amount }) {
  return new Promise((resolve, reject) => {
    const errors = validateCardForm({ number, name, expiry, cvv })
    if (Object.keys(errors).length > 0) {
      reject(Object.assign(new Error('Los datos de la tarjeta no son válidos.'), { fieldErrors: errors }))
      return
    }

    const digits = number.replace(/\D/g, '')
    const brand = detectCardBrand(digits)

    if (!amount || amount <= 0) {
      reject(new Error('El monto a cobrar no es válido.'))
      return
    }

    setTimeout(() => {
      if (!luhnCheck(digits)) {
        reject(new Error('La tarjeta fue rechazada por el emisor.'))
        return
      }

      resolve({
        success: true,
        authCode: `AUTH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        brand,
        brandLabel: BRAND_LABELS[brand] || 'Tarjeta',
        last4: digits.slice(-4),
        amount,
        chargedAt: new Date().toISOString(),
      })
    }, 1600)
  })
}
