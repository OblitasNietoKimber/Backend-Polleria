/**
 * Renderiza una ilustración vectorial limpia y estilizada de la mesa con sus sillas
 * según su capacidad (2, 4, 6 u 8 comensales) y forma.
 */
export default function MesaIlustracion({ capacidad, forma, estado }) {
  // Colores sutiles de la mesa según estado
  const colorMesa = estado === 'ocupada' ? '#EFE6DD' : '#F4EFEA';
  const colorBorde = estado === 'ocupada' ? '#D6C7B7' : '#E2D9CF';
  const colorSilla = '#D8CABE';

  if (capacidad === 2) {
    return (
      <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
        {/* Silla superior */}
        <rect x="26" y="2" width="18" height="8" rx="4" fill={colorSilla} />
        {/* Mesa redonda */}
        <circle cx="35" cy="35" r="22" fill={colorMesa} stroke={colorBorde} strokeWidth="2.5" />
        {/* Silla inferior */}
        <rect x="26" y="60" width="18" height="8" rx="4" fill={colorSilla} />
      </svg>
    );
  }

  if (capacidad === 6) {
    return (
      <svg width="84" height="70" viewBox="0 0 84 70" fill="none">
        {/* 3 sillas superiores */}
        <rect x="12" y="2" width="16" height="7" rx="3.5" fill={colorSilla} />
        <rect x="34" y="2" width="16" height="7" rx="3.5" fill={colorSilla} />
        <rect x="56" y="2" width="16" height="7" rx="3.5" fill={colorSilla} />
        {/* Mesa rectangular redondeada */}
        <rect x="6" y="14" width="72" height="42" rx="14" fill={colorMesa} stroke={colorBorde} strokeWidth="2.5" />
        {/* 3 sillas inferiores */}
        <rect x="12" y="61" width="16" height="7" rx="3.5" fill={colorSilla} />
        <rect x="34" y="61" width="16" height="7" rx="3.5" fill={colorSilla} />
        <rect x="56" y="61" width="16" height="7" rx="3.5" fill={colorSilla} />
      </svg>
    );
  }

  if (capacidad === 8) {
    return (
      <svg width="104" height="70" viewBox="0 0 104 70" fill="none">
        {/* Cabecera izquierda */}
        <rect x="2" y="26" width="7" height="18" rx="3.5" fill={colorSilla} />
        {/* 3 sillas superiores */}
        <rect x="20" y="2" width="18" height="7" rx="3.5" fill={colorSilla} />
        <rect x="43" y="2" width="18" height="7" rx="3.5" fill={colorSilla} />
        <rect x="66" y="2" width="18" height="7" rx="3.5" fill={colorSilla} />
        {/* Mesa rectangular grande */}
        <rect x="14" y="14" width="76" height="42" rx="10" fill={colorMesa} stroke={colorBorde} strokeWidth="2.5" />
        {/* 3 sillas inferiores */}
        <rect x="20" y="61" width="18" height="7" rx="3.5" fill={colorSilla} />
        <rect x="43" y="61" width="18" height="7" rx="3.5" fill={colorSilla} />
        <rect x="66" y="61" width="18" height="7" rx="3.5" fill={colorSilla} />
        {/* Cabecera derecha */}
        <rect x="95" y="26" width="7" height="18" rx="3.5" fill={colorSilla} />
      </svg>
    );
  }

  // Por defecto 4 comensales (cuadrada o redonda)
  if (forma === 'redonda') {
    return (
      <svg width="74" height="74" viewBox="0 0 74 74" fill="none">
        <rect x="28" y="2" width="18" height="7" rx="3.5" fill={colorSilla} />
        <rect x="28" y="65" width="18" height="7" rx="3.5" fill={colorSilla} />
        <rect x="2" y="28" width="7" height="18" rx="3.5" fill={colorSilla} />
        <rect x="65" y="28" width="7" height="18" rx="3.5" fill={colorSilla} />
        <circle cx="37" cy="37" r="23" fill={colorMesa} stroke={colorBorde} strokeWidth="2.5" />
      </svg>
    );
  }

  // Cuadrada de 4 comensales
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" fill="none">
      <rect x="28" y="2" width="18" height="7" rx="3.5" fill={colorSilla} />
      <rect x="28" y="65" width="18" height="7" rx="3.5" fill={colorSilla} />
      <rect x="2" y="28" width="7" height="18" rx="3.5" fill={colorSilla} />
      <rect x="65" y="28" width="7" height="18" rx="3.5" fill={colorSilla} />
      <rect x="14" y="14" width="46" height="46" rx="10" fill={colorMesa} stroke={colorBorde} strokeWidth="2.5" />
    </svg>
  );
}

