export function generateOrderNumber() {
  return 'LS-' + crypto.randomUUID()
}
