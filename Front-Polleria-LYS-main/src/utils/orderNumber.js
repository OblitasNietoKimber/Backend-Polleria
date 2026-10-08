export function generateOrderNumber() {
  return 'LS-' + Math.floor(1000 + Math.random() * 9000)
}
