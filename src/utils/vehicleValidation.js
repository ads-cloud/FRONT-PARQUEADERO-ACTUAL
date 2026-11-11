/*
  Validación y detección estricta de nomenclatura por tipo de vehículo:
  - Placa Automóvil / Camioneta / Camión: AAA123 (3 letras, 3 números) -> ^[A-Z]{3}[0-9]{3}$
  - Placa Motocicleta: AAA12B o AAA12 (3 letras, 2 números y 1 letra opc.) -> ^[A-Z]{3}[0-9]{2}[A-Z]?$
  - Código Numérico / Bicicleta / Cédula: 4 a 10 dígitos numéricos -> ^[0-9]{4,10}$
  - Consecutivo Autogenerado con Prefijo: AUTO:CHZ -> ^CHZ[0-9]{1,6}$ (ej: CHZ001)
*/

export const PATTERNS = {
  CAR: /^[A-Z]{3}[0-9]{3}$/,
  MOTORCYCLE: /^[A-Z]{3}[0-9]{2}[A-Z]?$/,
  BICYCLE: /^[0-9]{4,10}$/,
};

export const VEHICLE_TYPE_LABELS = {
  CAR: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BICYCLE: 'Bicicleta',
};

const CUSTOM_FALLBACK_ICONS = ['🏷️', '🛺', '📦', '🅿️', '🛞', '🚜'];

export const getVehicleIcon = (code, name = '') => {
  const cleanCode = (code || '').trim().toUpperCase();
  const text = `${cleanCode} ${(name || '').trim().toUpperCase()}`;

  if (cleanCode === 'CAR' || /\b(CARRO|AUTOMOVIL|AUTOMÓVIL|AUTO)\b/.test(text)) {
    return '🚗';
  }
  if (cleanCode === 'MOTORCYCLE' || text.includes('MOTO')) {
    return '🏍️';
  }
  if (cleanCode === 'BICYCLE' || text.includes('BICY') || text.includes('BICI')) {
    return '🚲';
  }
  if (
    text.includes('CHAZ') ||
    text.includes('CHASA') ||
    text.includes('CARRET') ||
    text.includes('VENDED') ||
    text.includes('PUESTO')
  ) {
    return '🛒';
  }
  if (text.includes('SCOOT') || text.includes('PATIN')) {
    return '🛴';
  }
  if (text.includes('CAMIONETA') || text.includes('SUV') || text.includes('PICKUP')) {
    return '🚙';
  }
  if (text.includes('TRUCK') || text.includes('CAMION') || text.includes('CAMIÓN') || text.includes('FURG')) {
    return '🚚';
  }
  if (text.includes('BUS') || text.includes('VAN') || text.includes('MICRO')) {
    return '🚐';
  }
  if (text.includes('REMOLQ') || text.includes('TRAILER')) {
    return '🚛';
  }

  // Para cualquier nuevo tipo personalizado no reconocido, usar un ícono distintivo (nunca el carro 🚗 para no confundir)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_FALLBACK_ICONS[hash % CUSTOM_FALLBACK_ICONS.length];
};

export const cleanPlateInput = (value) => {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};

export const parseAutoPrefixPattern = (platePattern) => {
  const raw = (platePattern || '').trim().toUpperCase();
  if (raw.startsWith('AUTO:')) {
    const prefix = raw
      .slice(5)
      .trim()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5);
    return { isAuto: true, prefix: prefix || 'VEH' };
  }
  return { isAuto: false, prefix: '' };
};

export const getEffectivePatternForTariff = (tariff) => {
  const raw = (tariff?.platePattern || '').trim();
  if (raw) {
    const autoInfo = parseAutoPrefixPattern(raw);
    if (autoInfo.isAuto) {
      return new RegExp(`^(${autoInfo.prefix}[0-9]{1,6}|[0-9]{4,10})$`);
    }
    try {
      return new RegExp(raw);
    } catch {
      // Fallback below
    }
  }

  const code = (tariff?.vehicleTypeCode || tariff?.code || '').toUpperCase();
  if (code === 'CAR') return PATTERNS.CAR;
  if (code === 'MOTORCYCLE') return PATTERNS.MOTORCYCLE;
  if (code === 'BICYCLE') return PATTERNS.BICYCLE;
  return PATTERNS.CAR;
};

export const doesPlateMatchTariff = (plate, tariff) => {
  if (!plate || plate.length < 4 || !tariff) return false;
  const regex = getEffectivePatternForTariff(tariff);
  return regex.test(plate.toUpperCase());
};

export const getMatchingTariffsForPlate = (plate, tariffs = []) => {
  if (!plate || plate.length < 4) return [];
  return tariffs.filter((t) => doesPlateMatchTariff(plate, t));
};

export const describeNomenclature = (platePattern, code = '') => {
  const raw = (platePattern || '').trim();
  const autoInfo = parseAutoPrefixPattern(raw);
  if (autoInfo.isAuto) {
    return {
      mode: 'AUTO_PREFIX',
      prefix: autoInfo.prefix,
      badge: `Auto: ${autoInfo.prefix}001`,
      description: `Autogenera consecutivo (${autoInfo.prefix}001, ${autoInfo.prefix}002...) al seleccionar el botón`,
    };
  }
  if (raw === '^[A-Z]{3}[0-9]{2}[A-Z]?$' || code === 'MOTORCYCLE') {
    return {
      mode: 'MOTO_PLATE',
      prefix: '',
      badge: 'Placa Moto (AAA12D)',
      description: '3 letras + 2 números + 1 letra opcional (Ej: ABC12D)',
    };
  }
  if (raw === '^[0-9]{4,10}$' || raw === '^[0-9]{6}$' || code === 'BICYCLE') {
    return {
      mode: 'NUMERIC',
      prefix: '',
      badge: 'Numérico (123456)',
      description: '4 a 10 dígitos numéricos o cédula (Ej: 123456)',
    };
  }
  return {
    mode: 'CAR_PLATE',
    prefix: '',
    badge: 'Placa Carro/Camión (AAA123)',
    description: '3 letras + 3 números (Ej: ABC123)',
  };
};

export const buildPlatePatternFromMode = (mode, prefix = 'CHZ') => {
  const cleanPrefix = (prefix || 'CHZ')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || 'CHZ';
  if (mode === 'AUTO_PREFIX') return `AUTO:${cleanPrefix}`;
  if (mode === 'MOTO_PLATE') return '^[A-Z]{3}[0-9]{2}[A-Z]?$';
  if (mode === 'NUMERIC') return '^[0-9]{4,10}$';
  return '^[A-Z]{3}[0-9]{3}$';
};

export const getVehicleType = (plate) => {
  if (!plate || plate.length < 4) return null;

  if (PATTERNS.CAR.test(plate)) return 'CAR';
  if (PATTERNS.MOTORCYCLE.test(plate)) return 'MOTORCYCLE';
  if (PATTERNS.BICYCLE.test(plate)) return 'BICYCLE';

  return null;
};

export const isValidPlate = (plate, tariffs = []) => {
  if (!plate || plate.length < 4 || plate.length > 10) return false;
  if (Array.isArray(tariffs) && tariffs.length > 0) {
    return getMatchingTariffsForPlate(plate, tariffs).length > 0;
  }
  return (
    PATTERNS.CAR.test(plate) ||
    PATTERNS.MOTORCYCLE.test(plate) ||
    PATTERNS.BICYCLE.test(plate) ||
    /^[A-Z]{2,5}[0-9]{3,6}$/.test(plate)
  );
};
