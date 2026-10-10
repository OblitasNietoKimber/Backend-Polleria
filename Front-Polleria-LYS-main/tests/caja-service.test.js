import { beforeEach, expect, test, vi } from 'vitest';
const { query, rpc, user } = vi.hoisted(() => ({ query: {}, rpc: vi.fn(), user: vi.fn() }));
vi.mock('../src/lib/insforge', () => ({ configurationError: '', insforge: { database: { from: vi.fn(() => query), rpc } } }));
vi.mock('../src/services/authService', () => ({ getCurrentUser: user }));
import pagos from '../src/services/pagoService';
const row = { id: 'uuid', codigo: 'PED-01', tipo: 'salon', estado_id: 'preparacion', estado_pago: 'pendiente', cuenta_solicitada: true, subtotal: '42.90', envio: '0', total: '42.90', mesas: { numero: '01' }, creado_en: '2026-10-09', detalles_pedido: [{ producto_id: 1, cantidad: 1, precio_unitario: '42.9', nombre_producto: 'Nombre vendido' }], pagos: [] };
const recibo = { id: 'uuid', codigo: 'PED-01', total: '42.90', subtotal: '42.90', envio: '0', estado: 'pagado', items: [{ id: 1, nombre: 'Nombre vendido', precio: '42.9', cantidad: 1 }], pago: { id: 'pago', metodo: 'efectivo', monto: '50', importe: '42.9', vuelto: '7.1' } };
beforeEach(() => {
  vi.clearAllMocks(); user.mockReturnValue({ rol: 'caja' });
  for (const method of ['select','eq','neq','gt','order','range']) query[method] = vi.fn(() => query);
  query.then = resolve => resolve({ data: [row], error: null });
  query.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  rpc.mockResolvedValue({ data: recibo, error: null });
});
test('consulta pendientes persistidos y excluye cancelados y pedidos vacíos', async () => {
  const result = await pagos.getPedidosPendientes();
  expect(result[0]).toMatchObject({ id: 'uuid', codigo: 'PED-01', mesa: '01', total: 42.9, estado: 'pendiente', cuentaSolicitada: true });
  expect(query.eq).toHaveBeenCalledWith('estado_pago', 'pendiente');
  expect(query.neq).toHaveBeenCalledWith('estado_id', 'cancelado');
  expect(query.gt).toHaveBeenCalledWith('total', 0);
});
test('recorre páginas completas para no omitir pedidos', async () => {
  query.then = resolve => resolve({ data: query.range.mock.calls.length === 1 ? Array(100).fill(row) : [row], error: null });
  expect(await pagos.getPedidos()).toHaveLength(101);
  expect(query.range).toHaveBeenLastCalledWith(100, 199);
});
test('envía una sola RPC sin confiar en total o vuelto propuestos por el navegador', async () => {
  const result = await pagos.registrarCobro('uuid', { metodo: 'Efectivo', monto: 50, idempotencia: 'clave', totalEsperado: 42.9, vuelto: 999 });
  expect(rpc).toHaveBeenCalledWith('registrar_cobro', { p_pedido_id: 'uuid', p_metodo: 'efectivo', p_recibido: 50, p_idempotencia: 'clave', p_total_esperado: 42.9, p_referencia: null });
  expect(result.pago).toMatchObject({ metodo: 'Efectivo', monto: 50, vuelto: 7.1 });
});
test('muestra el comprobante guardado sin recalcularlo con productos nuevos', async () => {
  query.maybeSingle.mockResolvedValue({ data: { ...row, total: '99', pagos: [{ comprobante: recibo }] }, error: null });
  expect((await pagos.getPedidoPorId('uuid')).total).toBe(42.9);
});
test('propaga errores y exige un comprobante del servidor antes de confirmar', async () => {
  rpc.mockResolvedValue({ error: { message: 'El total cambió' } });
  await expect(pagos.registrarCobro('uuid', {})).rejects.toThrow('El total cambió');
  rpc.mockResolvedValue({ data: null, error: null });
  await expect(pagos.registrarCobro('uuid', {})).rejects.toThrow('comprobante válido');
  query.then = resolve => resolve({ error: { message: 'Sin conexión' } });
  await expect(pagos.getPedidos()).rejects.toThrow('Sin conexión');
});
test('un rol ajeno a caja no consulta ni registra cobros', async () => {
  user.mockReturnValue({ rol: 'mesera' });
  await expect(pagos.getPedidos()).rejects.toThrow('caja');
  await expect(pagos.registrarCobro('uuid', {})).rejects.toThrow('caja');
  expect(rpc).not.toHaveBeenCalled();
});
