import { beforeEach, afterEach, expect, test, vi } from 'vitest';
const { realtime, user }=vi.hoisted(()=>({realtime:{connect:vi.fn(),subscribe:vi.fn(),unsubscribe:vi.fn(),disconnect:vi.fn(),on:vi.fn(),off:vi.fn()},user:vi.fn()}));
vi.mock('../src/lib/insforge',()=>({insforge:{realtime}}));
vi.mock('../src/services/authService',()=>({getCurrentUser:user}));
import { watchOrders, ORDER_EVENT } from '../src/services/orderUpdates';
const cleanups=[];
const flush=async()=>{ await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
beforeEach(()=>{
 vi.useFakeTimers(); vi.clearAllMocks(); user.mockReturnValue({id:'cliente-id',rol:'cliente'});
 realtime.connect.mockResolvedValue(); realtime.subscribe.mockResolvedValue({ok:true});
 vi.stubGlobal('window',new EventTarget()); vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));
});
afterEach(()=>{cleanups.splice(0).forEach(fn=>fn());vi.useRealTimers();vi.unstubAllGlobals();});
function watch(fn){const stop=watchOrders(fn,{intervalMs:5000});cleanups.push(stop);return stop;}
test('comparte el canal entre componentes y libera la conexión al salir del último',async()=>{
 const a=vi.fn(),b=vi.fn();const stopA=watch(a);const stopB=watch(b);await flush();
 expect(realtime.subscribe).toHaveBeenCalledTimes(1); expect(realtime.subscribe).toHaveBeenCalledWith('lys:client:cliente-id');
 stopA();expect(realtime.unsubscribe).not.toHaveBeenCalled();stopB();expect(realtime.unsubscribe).toHaveBeenCalledWith('lys:client:cliente-id');
});
test('el evento correcto recarga desde PostgreSQL y descarta otros canales',async()=>{
 const fn=vi.fn();watch(fn);await flush();fn.mockClear();
 const listener=realtime.on.mock.calls.find(([name])=>name===ORDER_EVENT)[1];
 listener({meta:{channel:'lys:client:otro'},pedidoId:'ajeno'});expect(fn).not.toHaveBeenCalled();
 listener({meta:{channel:'lys:client:cliente-id'},pedidoId:'db-id'});expect(fn).toHaveBeenCalledTimes(1);
});
test('recupera cambios por intervalo, visibilidad, reconexión y red',async()=>{
 const fn=vi.fn();watch(fn);await flush();fn.mockClear();
 await vi.advanceTimersByTimeAsync(5000);expect(fn).toHaveBeenCalledTimes(1);
 document.visibilityState='hidden';await vi.advanceTimersByTimeAsync(5000);expect(fn).toHaveBeenCalledTimes(1);
 document.visibilityState='visible';document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'));
 realtime.on.mock.calls.find(([name])=>name==='connect')[1]();expect(fn).toHaveBeenCalledTimes(4);
});
test('mantiene actualización automática si la suscripción falla',async()=>{
 realtime.connect.mockRejectedValue(new Error('offline'));const fn=vi.fn();watch(fn);await flush();await vi.advanceTimersByTimeAsync(5000);expect(fn).toHaveBeenCalled();
});
test('desmontar durante connect no crea una suscripción tardía',async()=>{
 let resolve;realtime.connect.mockReturnValue(new Promise(done=>{resolve=done;}));const fn=vi.fn();const stop=watch(fn);stop();resolve();await flush();
 expect(realtime.subscribe).not.toHaveBeenCalled();expect(fn).not.toHaveBeenCalled();
});
