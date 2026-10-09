export const ESTADOS_MESA = {
  LIBRE: 'libre',
  OCUPADA: 'ocupada',
  RESERVADA: 'reservada',
};

export const ZONAS_SALON = [
  { id: 'salon_principal', nombre: 'Salón principal' },
  { id: 'terraza', nombre: 'Terraza' },
  { id: 'segundo_piso', nombre: 'Segundo piso' },
  { id: 'todas', nombre: 'Todas las zonas' },
];

export const SEED_MESAS = [
  { id: 1, numero: '01', capacidad: 2, forma: 'redonda', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 2, numero: '02', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 3, numero: '03', capacidad: 4, forma: 'redonda', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 4, numero: '04', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 5, numero: '05', capacidad: 4, forma: 'redonda', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 6, numero: '06', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 7, numero: '07', capacidad: 6, forma: 'redonda_grande', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 8, numero: '08', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 9, numero: '09', capacidad: 2, forma: 'redonda', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 10, numero: '10', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'salon_principal', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 11, numero: '11', capacidad: 6, forma: 'redonda_grande', estado: ESTADOS_MESA.LIBRE, zona: 'terraza', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 12, numero: '12', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'terraza', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 13, numero: '13', capacidad: 6, forma: 'rectangular', estado: ESTADOS_MESA.LIBRE, zona: 'terraza', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 14, numero: '14', capacidad: 4, forma: 'cuadrada', estado: ESTADOS_MESA.LIBRE, zona: 'terraza', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 15, numero: '15', capacidad: 4, forma: 'redonda', estado: ESTADOS_MESA.LIBRE, zona: 'segundo_piso', pedidoId: null, totalAcumulado: 0, inicioAt: null },
  { id: 16, numero: '16', capacidad: 8, forma: 'banquete', estado: ESTADOS_MESA.LIBRE, zona: 'segundo_piso', pedidoId: null, totalAcumulado: 0, inicioAt: null },
];

export const SEED_ACTIVIDADES = [];
