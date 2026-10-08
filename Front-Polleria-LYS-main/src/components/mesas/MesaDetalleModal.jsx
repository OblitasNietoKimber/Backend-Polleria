import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';
import mesaService from '../../services/mesaService';
import cocinaService from '../../services/cocinaService';

export default function MesaDetalleModal({ mesa, onClose, onMesaUpdated }) {
  const navigate = useNavigate();

  const [modoReserva, setModoReserva] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [horaReservaInput, setHoraReservaInput] = useState('20:00');
  const [comensalesReserva, setComensalesReserva] = useState(() => mesa?.capacidad || 4);
  const [telefonoReserva, setTelefonoReserva] = useState('');
  const [errorReserva, setErrorReserva] = useState('');

  const pedidoActivo = useMemo(() => {
    if (!mesa?.pedidoId) return null;
    const pedidos = cocinaService.getPedidos();
    return pedidos.find((p) => p.id === mesa.pedidoId) || null;
  }, [mesa]);

  if (!mesa) return null;

  const { numero, capacidad, estado, inicioAt, totalAcumulado, horaReserva } = mesa;
  const minutos = mesaService.getMinutosOcupada(inicioAt);

  function handleIrAPedido() {
    onClose();
    navigate(`/mesas/${numero}/pedido`);
  }

  function handleConfirmarReserva() {
    if (!clienteNombre.trim()) {
      setErrorReserva('Por favor ingresa el nombre del cliente o familia.');
      return;
    }
    mesaService.reservarMesa(numero, {
      cliente: clienteNombre.trim(),
      hora: horaReservaInput,
      comensales: comensalesReserva,
      telefono: telefonoReserva.trim(),
    });
    mesaService.registrarActividad({
      mesaNumero: numero,
      tipo: 'reserva',
      titulo: `Mesa ${numero}`,
      descripcion: `Reserva confirmada a nombre de ${clienteNombre.trim()}`,
      ordenCodigo: `${horaReservaInput} hrs`,
      tipoColor: 'amarillo',
    });
    window.dispatchEvent(new Event('storage'));
    if (onMesaUpdated) onMesaUpdated();
    onClose();
  }

  function handleLiberarMesa() {
    if (window.confirm(`¿Confirmas liberar la Mesa ${numero}?`)) {
      mesaService.liberarMesa(numero);
      mesaService.registrarActividad({
        mesaNumero: numero,
        tipo: 'pedido_completado',
        titulo: `Mesa ${numero}`,
        descripcion: 'Mesa liberada',
        ordenCodigo: mesa.pedidoId ? `Orden ${mesa.pedidoId}` : '',
        tipoColor: 'verde',
      });
      if (onMesaUpdated) onMesaUpdated();
      onClose();
    }
  }

  function handleSolicitarCuenta() {
    if (mesa.pedidoId) {
      try {
        const raw = localStorage.getItem('lys_pedidos');
        const pedidos = raw ? JSON.parse(raw) : [];
        const actualizados = pedidos.map((p) => {
          if (p.id === mesa.pedidoId) {
            return { ...p, cuentaSolicitada: true };
          }
          return p;
        });
        localStorage.setItem('lys_pedidos', JSON.stringify(actualizados));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error(err);
      }
    }

    mesaService.registrarActividad({
      mesaNumero: numero,
      tipo: 'pedido_actualizado',
      titulo: `Mesa ${numero}`,
      descripcion: 'Cuenta solicitada a caja',
      ordenCodigo: mesa.pedidoId || '',
      tipoColor: 'amarillo',
    });

    alert(`Se ha solicitado la cuenta de la Mesa ${numero} para Caja.`);
    if (onMesaUpdated) onMesaUpdated();
    onClose();
  }

  function handleCancelarReserva() {
    if (window.confirm(`¿Confirmas cancelar la reserva de la Mesa ${numero}?`)) {
      mesaService.liberarMesa(numero);
      mesaService.registrarActividad({
        mesaNumero: numero,
        tipo: 'reserva',
        titulo: `Mesa ${numero}`,
        descripcion: 'Reserva cancelada · Mesa liberada',
        ordenCodigo: 'Cancelada',
        tipoColor: 'amarillo',
      });
      if (onMesaUpdated) onMesaUpdated();
      onClose();
    }
  }

  return (
    <div className="mesa-modal-backdrop" onClick={onClose}>
      <div className="mesa-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="mesa-modal-header">
          <div>
            <h3 className="mesa-modal-section-title">Mesa {numero}</h3>
            <span className="mesa-modal-subtitle">
              Capacidad: {capacidad} comensales · Zona {mesa.zona === 'terraza' ? 'Terraza' : mesa.zona === 'segundo_piso' ? 'Segundo piso' : 'Salón principal'}
            </span>
          </div>
          <span className={`mesa-status-badge ${estado}`}>
            {estado}
          </span>
        </div>

        <div className="mesa-modal-body">
          {estado === 'libre' && !modoReserva && (
            <div className="mesa-empty-state">
              <p className="mesa-empty-text">
                Esta mesa se encuentra disponible para nuevos comensales.
              </p>
              <div className="mesa-actions-col">
                <button
                  className="btn-nuevo-pedido mesa-btn-block mesa-btn-block-lg"
                  onClick={handleIrAPedido}
                >
                  + Tomar pedido ahora
                </button>
                <button type="button" className="mesa-btn-reservar" onClick={() => setModoReserva(true)}>
                  <Calendar size={16} />
                  <span>Reservar esta mesa</span>
                </button>
              </div>
            </div>
          )}

          {estado === 'libre' && modoReserva && (
            <div className="mesa-reserva-form">
              <div className="mesa-reserva-form-head">
                <Calendar size={18} />
                <h4 className="mesa-reserva-form-title">Nueva reserva · Mesa {numero}</h4>
              </div>

              {errorReserva && <div className="mesa-reserva-error">{errorReserva}</div>}

              <div className="mesa-reserva-fields">
                <div>
                  <label className="mesa-reserva-label">Nombre del cliente / grupo:</label>
                  <input
                    type="text"
                    placeholder="Ej: Familia López, Carlos Vega..."
                    value={clienteNombre}
                    onChange={(e) => {
                      setClienteNombre(e.target.value);
                      if (errorReserva) setErrorReserva('');
                    }}
                    className="mesa-reserva-input"
                  />
                </div>

                <div className="mesa-reserva-row">
                  <div>
                    <label className="mesa-reserva-label">Hora programada:</label>
                    <input
                      type="time"
                      value={horaReservaInput}
                      onChange={(e) => setHoraReservaInput(e.target.value)}
                      className="mesa-reserva-input"
                    />
                  </div>

                  <div>
                    <label className="mesa-reserva-label">Comensales:</label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={comensalesReserva}
                      onChange={(e) => setComensalesReserva(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mesa-reserva-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="mesa-reserva-label">Teléfono de contacto (opcional):</label>
                  <input
                    type="tel"
                    placeholder="Ej: 987 654 321"
                    value={telefonoReserva}
                    onChange={(e) => setTelefonoReserva(e.target.value)}
                    className="mesa-reserva-input"
                  />
                </div>

                <div className="mesa-reserva-actions">
                  <button type="button" onClick={handleConfirmarReserva} className="mesa-reserva-save-btn">
                    Guardar reserva
                  </button>
                  <button type="button" onClick={() => setModoReserva(false)} className="mesa-reserva-cancel-btn">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {estado === 'ocupada' && (
            <div>
              <div className="mesa-ocupada-info">
                <div className="mesa-ocupada-row">
                  <span className="mesa-ocupada-label">Tiempo en mesa:</span>
                  <span className="mesa-ocupada-value">
                    <Clock size={14} className="mesa-inline-icon" />
                    {minutos} minutos
                  </span>
                </div>
                <div className="mesa-ocupada-row">
                  <span className="mesa-ocupada-label">Total consumido:</span>
                  <span className="mesa-ocupada-total">S/ {Number(totalAcumulado || 0).toFixed(2)}</span>
                </div>
                {pedidoActivo && (
                  <div className="mesa-ocupada-row">
                    <span className="mesa-ocupada-label">Estado en cocina:</span>
                    <span className="mesa-ocupada-estado-cocina">
                      {pedidoActivo.estadoCocina?.replace('_', ' ') || 'En espera'}
                    </span>
                  </div>
                )}
              </div>

              {pedidoActivo?.items?.length > 0 && (
                <div className="mesa-comanda-box">
                  <h4 className="mesa-comanda-title">Comanda actual</h4>
                  <ul className="mesa-comanda-list">
                    {pedidoActivo.items.map((it, idx) => (
                      <li key={idx}>
                        {it.cantidad}x {it.nombre} - S/ {(it.precio * it.cantidad).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mesa-actions-col">
                <button className="btn-nuevo-pedido mesa-btn-block" onClick={handleIrAPedido}>
                  Ver / Agregar a la comanda
                </button>
                <button type="button" className="mesa-btn-secondary-warn" onClick={handleSolicitarCuenta}>
                  Solicitar cuenta para caja
                </button>
                <button type="button" className="mesa-btn-secondary-neutral" onClick={handleLiberarMesa}>
                  Liberar mesa manualmente
                </button>
              </div>
            </div>
          )}

          {estado === 'reservada' && (
            <div className="mesa-reservada-wrap">
              <div className="mesa-reservada-card">
                <div className="mesa-reservada-head">
                  <div className="mesa-reservada-icon-wrap">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h4 className="mesa-reservada-title">Reserva programada</h4>
                    <span className="mesa-reservada-subtitle">Mesa reservada y apartada</span>
                  </div>
                </div>

                <div className="mesa-reservada-grid mesa-reservada-grid-first">
                  <div>
                    <span className="mesa-reservada-field-label">Cliente:</span>
                    <strong className="mesa-reservada-field-value">{mesa.clienteReserva || 'Cliente'}</strong>
                  </div>
                  <div>
                    <span className="mesa-reservada-field-label">Hora:</span>
                    <strong className="mesa-reservada-field-value-accent">{horaReserva || '20:00'} hrs</strong>
                  </div>
                </div>

                <div className="mesa-reservada-grid">
                  <div>
                    <span className="mesa-reservada-field-label">Comensales:</span>
                    <strong className="mesa-reservada-field-value">{mesa.comensalesReserva || capacidad} personas</strong>
                  </div>
                  <div>
                    <span className="mesa-reservada-field-label">Teléfono:</span>
                    <span className="mesa-reservada-field-text">{mesa.telefonoReserva || 'Sin registrar'}</span>
                  </div>
                </div>
              </div>

              <div className="mesa-actions-col">
                <button className="btn-nuevo-pedido mesa-btn-block" onClick={handleIrAPedido}>
                  <CheckCircle2 size={18} className="mesa-btn-icon-inline" />
                  Llegó el cliente · Sentar y abrir pedido
                </button>
                <button type="button" className="mesa-btn-secondary-neutral" onClick={handleCancelarReserva}>
                  Cancelar / Liberar reserva
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mesa-modal-footer">
          <button type="button" className="mesa-modal-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
