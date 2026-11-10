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

export default function TicketEntry({ occupancyByType = [], onTicketCreated }) {
  const { user } = useAuth();
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleTypeCode, setVehicleTypeCode] = useState('');
  const [lastTicket, setLastTicket] = useState(null);
  const [isValid, setIsValid] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [parking, setParking] = useState(null);

  const inputRef = useRef();
  const printRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
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
      if (typeof onTicketCreated === 'function') {
        onTicketCreated(created);
      }
      inputRef.current?.focus();
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

  const selectedTariff = vehicleTypes.find(
    (vt) => vt.vehicleTypeCode === vehicleTypeCode,
  );

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-5 md:p-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
      >
        {/* Columna Izquierda: Placa Vehicular */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200/80 rounded-xl p-5">
          <label className="block text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-widest">
            Placa / Código de Ingreso
          </label>

          <div className="relative w-full max-w-xs">
            <div
              className={`rounded-xl p-1.5 transition-all duration-200 shadow-xs ${
                isValid
                  ? 'bg-emerald-500 ring-4 ring-emerald-100'
                  : licensePlate.length >= 6 && !isValid
                    ? 'bg-red-500 ring-4 ring-red-100'
                    : 'bg-amber-400'
              }`}
            >
              <div className="bg-amber-50 rounded-lg border-2 border-slate-900 px-3 py-2.5 flex flex-col items-center">
                <span className="text-[9px] font-extrabold tracking-[0.3em] text-slate-600 uppercase mb-0.5">
                  COLOMBIA • PARQUEADERO
                </span>
                <input
                  ref={inputRef}
                  className="w-full bg-transparent text-3xl sm:text-4xl font-black font-mono uppercase text-center tracking-[0.2em] text-slate-900 outline-none placeholder:text-slate-300"
                  placeholder="ABC123"
                  value={licensePlate}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            </div>

            {licensePlate.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLicensePlate('');
                  setVehicleTypeCode('');
                  setIsValid(false);
                  inputRef.current?.focus();
                }}
                className="absolute -right-2.5 -top-2.5 w-7 h-7 rounded-full bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold shadow flex items-center justify-center"
                title="Limpiar placa"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-3 text-xs text-center">
            {licensePlate.length === 0 ? (
              <span className="text-slate-400">
                Ej: <strong className="font-mono">ABC123</strong> (Carro),{' '}
                <strong className="font-mono">ABC12D</strong> (Moto),{' '}
                <strong className="font-mono">123456</strong> (Bici)
              </span>
            ) : isValid ? (
              <span className="text-emerald-700 font-bold">
                ✅ Placa válida — Presione Enter para imprimir
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Complete los 6 caracteres de la placa
              </span>
            )}
          </div>
        </div>

        {/* Columna Derecha: Selección de Vehículo con Cupos Independientes y Botón */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tipo de Vehículo y Cupo Disponible
              </span>
              {selectedTariff && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  ${Number(selectedTariff.minuteRate || 0).toLocaleString('es-CO')}/min • $
                  {Number(selectedTariff.hourRate || 0).toLocaleString('es-CO')}/h
                </span>
              )}
            </div>

            {loadingTypes ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-24 rounded-xl bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div
                className={`grid gap-3 ${
                  vehicleTypes.length > 2 ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {vehicleTypes.map((vt) => {
                  const active = vehicleTypeCode === vt.vehicleTypeCode;
                  const occInfo = occupancyByType.find(
                    (o) => o.code === vt.vehicleTypeCode,
                  );
                  const cap = occInfo ? occInfo.capacity : Number(vt.capacity || 0);
                  const available = occInfo ? occInfo.available : cap;
                  const isFull = cap > 0 && available <= 0;

                  return (
                    <button
                      type="button"
                      key={vt.id}
                      onClick={() => {
                        setVehicleTypeCode(vt.vehicleTypeCode);
                        if (isValidPlate(licensePlate)) setIsValid(true);
                        inputRef.current?.focus();
                      }}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                        active
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                          : 'border-slate-200 bg-slate-50/40 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl mb-1">
                        {getIconForType(vt.vehicleTypeCode)}
                      </span>
                      <span className="font-bold text-xs uppercase tracking-wider">
                        {vt.vehicleTypeName || vt.vehicleTypeCode}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        ${Number(vt.minuteRate || 0).toLocaleString('es-CO')}/min
                      </span>
                      <span
                        className={`mt-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isFull
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isFull
                          ? 'Sin cupo (0)'
                          : `${available} / ${cap} libres`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || !vehicleTypeCode}
            className={`w-full font-extrabold py-4 rounded-xl text-base shadow-md transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 ${
              isValid && vehicleTypeCode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
            }`}
          >
            <span>🎟️</span>
            <span>
              {isValid
                ? `CONFIRMAR INGRESO E IMPRIMIR TIQUETE (${licensePlate})`
                : 'INGRESE UNA PLACA VÁLIDA PARA REGISTRAR'}
            </span>
          </button>
        </div>
      </form>

      <div className="hidden">
        <TicketPrint ref={printRef} ticket={lastTicket} parking={parking} />
      </div>
    </div>
  );
}
