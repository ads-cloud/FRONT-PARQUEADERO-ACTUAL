/*
  Validación y detección de placas con códigos normalizados en inglés:
  - CAR (Automóvil): AAA123 (3 letras, 3 números)
  - MOTORCYCLE (Motocicleta): AAA12B o AAA12 (3 letras, 2 números y 1 letra opcional)
  - BICYCLE (Bicicleta): 123456 (4 a 10 caracteres alfanuméricos/numéricos)
*/

const PATTERNS = {
  CAR: /^[A-Z]{3}[0-9]{3}$/,
  MOTORCYCLE: /^[A-Z]{3}[0-9]{2}[A-Z]?$/,
  BICYCLE: /^[0-9]{4,10}$/,
};

export const VEHICLE_TYPE_LABELS = {
  CAR: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BICYCLE: 'Bicicleta',
};

export const cleanPlateInput = (value) => {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};

export const getVehicleType = (plate) => {
  if (!plate || plate.length < 5) return null;

  if (PATTERNS.CAR.test(plate)) return 'CAR';
  if (PATTERNS.MOTORCYCLE.test(plate)) return 'MOTORCYCLE';
  if (PATTERNS.BICYCLE.test(plate)) return 'BICYCLE';

  return null;
};

export const isValidPlate = (plate) => {
  if (!plate || plate.length < 4 || plate.length > 10) return false;
  return (
    PATTERNS.CAR.test(plate) ||
    PATTERNS.MOTORCYCLE.test(plate) ||
    PATTERNS.BICYCLE.test(plate) ||
    /^[A-Z0-9]{5,8}$/.test(plate)
  );
};
