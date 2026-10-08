export default function CheckoutSteps({ step }) {
  return (
    <div className="checkout-steps">
      <div className={`step-stub ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>01 · Entrega</div>
      <div className={`step-stub ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>02 · Pago</div>
      <div className={`step-stub ${step === 3 ? 'active' : ''}`}>03 · Resumen</div>
    </div>
  )
}
