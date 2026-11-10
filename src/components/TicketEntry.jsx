import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { TicketPrint } from './TicketPrint';
import toast from 'react-hot-toast';
import {
  cleanPlateInput,
  getVehicleType,
  isValidPlate,
} from '../utils/vehicleValidation';
import { useAuth } from '../context/AuthContext';

const getIconForType = (code) => {
  const t = (code || '').toUpperCase();
  if (t.includes('MOTO')) return '🏍️';
  if (t.includes('BICY') || t.includes('BICI')) return '🚲';
  if (t.includes('TRUCK') || t.includes('CAMION')) return '🚚';
  return '🚗';
};

export default function TicketEntry() {
  const { user } = useAuth();
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleTypeCode, setVehicleTypeCode] = useState('');
  const [lastTicket, setLastTicket] = useState(null);
  const [isValid, setIsValid] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [parking, setParking] = useState(null);

  const printRef = useRef();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoadingTypes(true);
        const [tariffsRes, parkingRes] = await Promise.all([
          axios.get('/api/parking/tariffs'),
          axios.get('/api/parking/me'),
        ]);
        setVehicleTypes(tariffsRes.data || []);
        setParking(parkingRes.data);
      } catch (error) {
        console.error(error);
        toast.error('Error cargando configuración del parqueadero');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, [user?.parkingId]);

  useEffect(() => {
    const detectedCode = getVehicleType(licensePlate);
    let selectedCode = vehicleTypeCode;

    if (detectedCode) {
      const exists = vehicleTypes.find((t) => t.vehicleTypeCode === detectedCode);
      if (exists) {
        selectedCode = detectedCode;
      }
    } else if (isValidPlate(licensePlate) && !selectedCode && vehicleTypes.length > 0) {
      selectedCode = vehicleTypes[0].vehicleTypeCode;
    } else if (!licensePlate) {
      selectedCode = '';
    }

    if (selectedCode !== vehicleTypeCode) {
      setVehicleTypeCode(selectedCode);
    }

    const validFormat = isValidPlate(licensePlate);
    setIsValid(validFormat && !!selectedCode);
  }, [licensePlate, vehicleTypes]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setLastTicket(null),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || !vehicleTypeCode) {
      return toast.error('Placa inválida o tipo de vehículo no seleccionado');
    }

    const toastId = toast.loading('Registrando ingreso...');
    try {
      const res = await axios.post('/api/tickets', {
        licensePlate,
        vehicleTypeCode,
      });
      const created = res.data;
      setLastTicket(created);

      if (created.hasActiveSubscription) {
        toast.success(
          `Ingreso registrado: ${licensePlate} (Cliente con Mensualidad Vigente)`,
          { id: toastId, duration: 4000 },
        );
      } else {
        toast.success(`Ingreso registrado: ${licensePlate}`, { id: toastId });
      }

      setLicensePlate('');
      setVehicleTypeCode('');
      setIsValid(false);
      setTimeout(() => handlePrint(), 400);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar ingreso', {
        id: toastId,
      });
    }
  };

  const handleChange = (e) => {
    const val = cleanPlateInput(e.target.value);
    if (val.length <= 10) setLicensePlate(val);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col justify-center min-h-[500px]">
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-gray-800">
          Registrar Nuevo Ingreso
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest text-center">
              Placa del Vehículo
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                className={`w-full text-3xl md:text-5xl font-mono p-4 border-2 rounded-xl uppercase text-center tracking-[0.2em] outline-none transition-all shadow-inner
                  ${isValid ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300 focus:border-blue-500'}
                  ${licensePlate.length >= 6 && !isValid ? 'border-red-500 bg-red-50 text-red-800' : ''}
                `}
                placeholder="------"
                value={licensePlate}
                onChange={handleChange}
                autoFocus
              />
              {licensePlate.length >= 5 && (
                <div className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2 text-2xl md:text-3xl">
                  {isValid ? '✅' : '❌'}
                </div>
              )}
            </div>
            <p className="text-gray-400 text-center text-xs mt-2">
              Detecta automáticamente el tipo o selecciónelo manualmente abajo
            </p>
          </div>

          {loadingTypes ? (
            <div className="text-center text-gray-400">Cargando tipos...</div>
          ) : (
            <div
              className={`grid gap-4 ${vehicleTypes.length > 2 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}
            >
              {vehicleTypes.map((vt) => (
                <button
                  type="button"
                  key={vt.id}
                  onClick={() => {
                    setVehicleTypeCode(vt.vehicleTypeCode);
                    if (isValidPlate(licensePlate)) setIsValid(true);
                  }}
                  className={`
                    p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer
                    ${
                      vehicleTypeCode === vt.vehicleTypeCode
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg scale-105'
                        : 'border-gray-100 text-gray-400 hover:border-gray-300 opacity-75'
                    }
                  `}
                >
                  <span className="text-3xl md:text-4xl mb-2">
                    {getIconForType(vt.vehicleTypeCode)}
                  </span>
                  <span className="font-bold text-xs uppercase tracking-wider truncate w-full text-center">
                    {vt.vehicleTypeName || vt.vehicleTypeCode}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || !vehicleTypeCode}
            className={`w-full font-extrabold py-5 rounded-xl text-lg md:text-xl shadow-lg transition-all transform active:scale-[0.98] 
              ${
                isValid && vehicleTypeCode
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white cursor-pointer shadow-green-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }
            `}
          >
            {isValid ? 'CONFIRMAR INGRESO 🎟️' : 'Complete la Placa...'}
          </button>
        </form>
      </div>

      <div className="hidden">
        <TicketPrint ref={printRef} ticket={lastTicket} parking={parking} />
      </div>
    </div>
  );
}
