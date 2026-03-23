/*
  Valida formatos de placa colombiana:
  - Carro: AAA123 (3 letras, 3 números)
  - Moto: AAA12B (3 letras, 2 números, 1 letra)
  - Bicicleta: 123456 (6 dígitos numéricos) 
*/

// Patrones regex estrictos
const PATTERNS = {
  CARRO: /^[A-Z]{3}[0-9]{3}$/,
  MOTO: /^[A-Z]{3}[0-9]{2}[A-Z]$/,
  BICICLETA: /^[0-9]{6}$/
};

/**
 * Limpia el input dejando solo caracteres alfanuméricos y convierte a mayúsculas
 */
export const cleanPlateInput = (value) => {
  if (!value) return '';
  // Permitimos letras y números, eliminamos espacios y especiales
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); // Max 6 caracteres
};

/**
 * Detecta el tipo de vehículo basado en el patrón de la placa
 * Retorna: 'CARRO' | 'MOTO' | 'BICICLETA' | null
 */
export const getVehicleType = (placa) => {
  if (!placa || placa.length < 6) return null;

  if (PATTERNS.CARRO.test(placa)) return 'CARRO';
  if (PATTERNS.MOTO.test(placa)) return 'MOTO';
  if (PATTERNS.BICICLETA.test(placa)) return 'BICICLETA';

  return null;
};

/**
 * Valida si es una placa válida (Carro, Moto o Bicicleta)
 * Retorna true SÓLO si coincide con alguno de los patrones definidos.
 */
export const isValidPlate = (placa) => {
  if (!placa || placa.length !== 6) return false;
  
  return (
    PATTERNS.CARRO.test(placa) || 
    PATTERNS.MOTO.test(placa) || 
    PATTERNS.BICICLETA.test(placa)
  );
};