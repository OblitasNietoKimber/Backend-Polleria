import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CheckoutSteps from '../../components/CheckoutSteps'
import DeliveryForm from '../../components/DeliveryForm'
import { useCart } from '../../context/CartContext'
import '../../styles/compras.css'

export default function EntregaPage() {
  const navigate = useNavigate()
  const { deliveryType, setDeliveryType, form, updateFormField } = useCart()
  const [errors, setErrors] = useState({})

  function validate() {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Ingresa tu nombre.'
    if (!form.phone.trim()) nextErrors.phone = 'Ingresa un teléfono de contacto.'
    else if (!/^9\d{8}$/.test(form.phone.trim())) nextErrors.phone = 'El teléfono debe tener 9 dígitos y empezar con 9.'
    if (deliveryType === 'delivery' && !form.address.trim()) nextErrors.address = 'Ingresa tu dirección.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  return (
    <section className="checkout-page">
      <button
        onClick={() => navigate('/catalogo')}
        className="lys-navlink checkout-back-link"
      >
        <ArrowLeft size={15} /> Seguir comprando
      </button>

      <CheckoutSteps step={1} />

      <DeliveryForm
        deliveryType={deliveryType}
        form={form}
        errors={errors}
        onTypeChange={setDeliveryType}
        onFormChange={updateFormField}
        onContinue={() => {
          if (validate()) navigate('/checkout/pago')
        }}
      />
    </section>
  )
}
