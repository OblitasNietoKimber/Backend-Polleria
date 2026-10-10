import { expect, test, vi } from 'vitest';
vi.mock('../src/services/pagoService', () => ({ getPedidos: vi.fn(), getPedidosPendientes: vi.fn(), getPedidoPorId: vi.fn(), getVentas: vi.fn(), calcularTotal: p => Number(p.total) }));
import caja from '../src/services/cajaService';
const pedidos = [
  { id: 'uno', estado: 'pagado', total: 48.9, tipo: 'delivery', pagadoAt: '2026-10-09T12:00:00', pago: { metodo: 'Yape' }, items: [{ id: 1, nombre: 'Pollo vendido', precio: 42.9, cantidad: 1 }] },
  { id: 'dos', estado: 'pagado', total: 24.9, tipo: 'salon', pagadoAt: '2026-10-08T12:00:00', pago: { metodo: 'Efectivo' }, items: [{ id: 2, nombre: 'Mostrito', precio: 24.9, cantidad: 1 }] },
  { id: 'tres', estado: 'pendiente', total: 1000, createdAt: '2026-10-09T12:00:00', items: [] },
  { id: 'cuatro', estado: 'cancelado', total: 1000, createdAt: '2026-10-09T12:00:00', items: [] },
];
test('cuenta únicamente ventas pagadas y conserva el envío en ingresos', () => {
  expect(caja.getResumenVentas({}, pedidos).total).toEqual({ cantidadPedidos: 2, totalVentas: 73.8 });
});
test('filtra por la fecha del cobro y agrupa métodos persistidos', () => {
  const filtros = { fechaInicio: '2026-10-09', fechaFin: '2026-10-09' };
  expect(caja.getVentasPorMetodoPago(filtros, pedidos)).toEqual([{ nombre: 'Yape', cantidad: 1, total: 48.9 }]);
  expect(caja.getHistorialVentas(filtros, pedidos).map(p => p.id)).toEqual(['uno']);
});
test('el ranking usa productos vendidos y excluye pendientes y cancelados', () => {
  expect(caja.getProductosMasVendidos({}, pedidos)).toHaveLength(2);
  expect(caja.getProductosMasVendidos({}, pedidos)[0]).toMatchObject({ nombre: 'Pollo vendido', cantidad: 1, total: 42.9 });
});
test('sin datos cargados devuelve resúmenes vacíos para el estado inicial', () => {
  expect(caja.getResumenVentas().total).toEqual({ cantidadPedidos: 0, totalVentas: 0 });
  expect(caja.getHistorialVentas()).toEqual([]);
});
