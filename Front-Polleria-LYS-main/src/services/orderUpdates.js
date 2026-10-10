import { insforge } from '../lib/insforge';
import { getCurrentUser } from './authService';

const channels = new Map();
export const ORDER_EVENT = 'lys:pedido-actualizado';
export function watchOrders(refresh, { intervalMs = 10000 } = {}) {
  const user = getCurrentUser();
  const channel = user?.rol === 'cliente' ? `lys:client:${user.id}` : 'lys:staff';
  const realtime = insforge?.realtime;
  let active = true;
  const notify = () => { if (active) refresh(); };
  const visible = () => { if (document.visibilityState !== 'hidden') notify(); };
  let entry = channels.get(channel);
  if (realtime && user && !entry) {
    entry = { listeners: new Set() };
    entry.message = payload => {
      if (payload?.meta?.channel === channel) entry.listeners.forEach(fn => fn());
    };
    entry.connected = () => entry.listeners.forEach(fn => fn());
    channels.set(channel, entry);
    realtime.on(ORDER_EVENT, entry.message);
    realtime.on('connect', entry.connected);
    entry.ready = realtime.connect().then(async () => {
      if (!entry.listeners.size) return;
      const result = await realtime.subscribe(channel);
      if (!entry.listeners.size && !channels.has(channel)) realtime.unsubscribe(channel);
      if (result.ok) entry.connected();
    }).catch(() => {}); // La consulta periódica recupera los cambios si falla WebSocket.
  }
  entry?.listeners.add(notify);
  queueMicrotask(notify);
  const timer = setInterval(visible, intervalMs);
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('online', visible);
  window.addEventListener('focus', visible);
  return () => {
    if (!active) return;
    active = false;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', visible);
    window.removeEventListener('online', visible);
    window.removeEventListener('focus', visible);
    entry?.listeners.delete(notify);
    if (entry && !entry.listeners.size) {
      channels.delete(channel);
      realtime.off(ORDER_EVENT, entry.message);
      realtime.off('connect', entry.connected);
      realtime.unsubscribe(channel);
      if (!channels.size) realtime.disconnect();
    }
  };
}
