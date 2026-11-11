import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { TicketPrint } from './TicketPrint';
import toast from 'react-hot-toast';
import {
  cleanPlateInput,
  doesPlateMatchTariff,
  getMatchingTariffsForPlate,
  parseAutoPrefixPattern,
  describeNomenclature,
  getVehicleIcon,
} from '../utils/vehicleValidation';
import { useAuth } from '../context/AuthContext';

export default function TicketEntry({ occupancyByType = [], onTicketCreated }) {
  const { user } = useAuth();
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleTypeCode, setVehicleTypeCode] = useState('');
  const [lastTicket, setLastTicket] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [rememberedTypeLabel, setRememberedTypeLabel] = useState(null);

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [parking, setParking] = useState(null);

  const inputRef = useRef();
  const printRef = useRef();
  const manualTypeSelectionRef = useRef(false);

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
    setRememberedTypeLabel(null);

    if (!licensePlate) {
      if (!manualTypeSelectionRef.current) {
        setVehicleTypeCode('');
      }
      setIsValid(false);
      return;
    }

    const matchingTariffs = getMatchingTariffsForPlate(licensePlate, vehicleTypes);

    // Si la placa no coincide con la nomenclatura de NINGÚN tipo de vehículo (ej: 1TR67H),
    // desmarcamos cualquier botón para evitar registros erróneos.
    if (matchingTariffs.length === 0) {
      if (licensePlate.length >= 5) {
        setVehicleTypeCode('');
        manualTypeSelectionRef.current = false;
      }
      setIsValid(false);
      return;
    }

    // Verificar si el botón actualmente seleccionado es compatible con esta placa
    const currentIsCompatible = matchingTariffs.some(
      (t) => t.vehicleTypeCode === vehicleTypeCode,
    );

    let chosenCode = currentIsCompatible
      ? vehicleTypeCode
      : matchingTariffs[0].vehicleTypeCode;

    if (chosenCode !== vehicleTypeCode) {
      setVehicleTypeCode(chosenCode);
    }
    setIsValid(true);

    // Si varios tipos comparten la misma nomenclatura (ej: Automóvil y Camión comparten AAA123)
    // y el cajero no acaba de forzar manualmente el botón, consultamos si la placa ya existe en BD
    let cancelled = false;
    if (matchingTariffs.length > 1 && !manualTypeSelectionRef.current) {
      axios
        .get(`/api/tickets/lookup-vehicle/${licensePlate}`)
        .then((res) => {
          if (cancelled || !res.data?.found) return;
          const dbCode = res.data.vehicleTypeCode;
          const isDbCodeCompatible = matchingTariffs.some(
            (t) => t.vehicleTypeCode === dbCode,
          );
          if (isDbCodeCompatible) {
            setVehicleTypeCode(dbCode);
            setRememberedTypeLabel(res.data.vehicleTypeName || dbCode);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [licensePlate, vehicleTypes]);

  const handleSelectVehicleType = async (vt) => {
    manualTypeSelectionRef.current = true;
    const autoInfo = parseAutoPrefixPattern(vt.platePattern);

    // Si el tipo de vehículo tiene Consecutivo Autogenerado (ej: Chaza -> AUTO:CHZ),
    // al hacer clic en el botón generamos y completamos automáticamente el siguiente consecutivo libre (CHZ001)
    if (autoInfo.isAuto) {
      try {
        const res = await axios.get(`/api/tickets/next-code/${vt.vehicleTypeCode}`);
        const generated = res.data?.code || `${autoInfo.prefix}001`;
        setVehicleTypeCode(vt.vehicleTypeCode);
        setLicensePlate(generated);
        setIsValid(true);
        toast.success(
          `Código consecutivo asignado: ${generated} (${vt.vehicleTypeName})`,
          { id: 'auto-code-toast' },
        );
        inputRef.current?.focus();
        return;
      } catch {
        const fallbackCode = `${autoInfo.prefix}001`;
        setVehicleTypeCode(vt.vehicleTypeCode);
        setLicensePlate(fallbackCode);
        setIsValid(true);
        inputRef.current?.focus();
        return;
      }
    }

    // Para tipos con placa estándar (Carro, Camión, Moto, Bici):
    if (!licensePlate) {
      setVehicleTypeCode(vt.vehicleTypeCode);
      setIsValid(false);
      inputRef.current?.focus();
      return;
    }

    if (doesPlateMatchTariff(licensePlate, vt)) {
      setVehicleTypeCode(vt.vehicleTypeCode);
      setIsValid(true);
      inputRef.current?.focus();
    } else {
      const nom = describeNomenclature(vt.platePattern, vt.vehicleTypeCode);
      toast.error(
        `La placa "${licensePlate}" no corresponde a ${vt.vehicleTypeName}. Formato requerido: ${nom.badge}`,
        { id: 'invalid-nomenclature-toast' },
      );
      inputRef.current?.focus();
    }
  };

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

      manualTypeSelectionRef.current = false;
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
    manualTypeSelectionRef.current = false;
    const val = cleanPlateInput(e.target.value);
    if (val.length <= 10) setLicensePlate(val);
  };

  const selectedTariff = vehicleTypes.find(
    (vt) => vt.vehicleTypeCode === vehicleTypeCode,
  );
  const matchingTariffs = getMatchingTariffsForPlate(licensePlate, vehicleTypes);

  const desktopGridColsClass =
    vehicleTypes.length === 1
      ? 'sm:grid-cols-1 max-w-sm mx-auto'
      : vehicleTypes.length === 2
        ? 'sm:grid-cols-2'
        : vehicleTypes.length === 3
          ? 'sm:grid-cols-3'
          : vehicleTypes.length === 4
            ? 'sm:grid-cols-2 lg:grid-cols-4'
            : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5';

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 md:p-8 w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección Superior: Placa / Código de Ingreso */}
        <div className="flex flex-col items-center justify-center bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6">
          <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-3 uppercase tracking-widest">
            Placa / Código de Ingreso
          </label>

          <div className="relative w-full max-w-md">
            <div
              className={`rounded-2xl p-2 transition-all duration-200 shadow-sm ${
                isValid
                  ? 'bg-emerald-500 ring-4 ring-emerald-100'
                  : licensePlate.length >= 5 && !isValid
                    ? 'bg-red-500 ring-4 ring-red-100'
                    : 'bg-amber-400'
              }`}
            >
              <div className="bg-amber-50 rounded-xl border-2 border-slate-900 px-4 py-3.5 flex flex-col items-center">
                <span className="text-[10px] font-extrabold tracking-[0.35em] text-slate-600 uppercase mb-1">
                  COLOMBIA • PARQUEADERO
                </span>
                <input
                  ref={inputRef}
                  className="w-full bg-transparent text-4xl sm:text-5xl font-black font-mono uppercase text-center tracking-[0.22em] text-slate-900 outline-none placeholder:text-slate-300"
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
                  manualTypeSelectionRef.current = false;
                  setLicensePlate('');
                  setVehicleTypeCode('');
                  setIsValid(false);
                  inputRef.current?.focus();
                }}
                className="absolute -right-3 -top-3 w-8 h-8 rounded-full bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold shadow-md flex items-center justify-center cursor-pointer"
                title="Limpiar placa"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-3.5 text-xs sm:text-sm text-center space-y-1">
            {licensePlate.length === 0 ? (
              <span className="text-slate-500">
                Ejemplos: <strong className="font-mono text-slate-700">ABC123</strong> (Carro/Camión) •{' '}
                <strong className="font-mono text-slate-700">ABC12D</strong> (Moto) •{' '}
                <strong className="font-mono text-slate-700">123456</strong> (Bici) •{' '}
                <span className="text-indigo-600 font-semibold">
                  O seleccione un tipo con consecutivo automático (ej. Chaza)
                </span>
              </span>
            ) : isValid ? (
              <div className="space-y-1">
                <span className="text-emerald-700 font-bold block">
                  ✅ Nomenclatura válida ({selectedTariff?.vehicleTypeName}) — Presione Enter para registrar
                </span>
                {rememberedTypeLabel && (
                  <span className="inline-block text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full font-semibold">
                    📌 Vehículo reconocido automáticamente como {rememberedTypeLabel}
                  </span>
                )}
                {!rememberedTypeLabel && matchingTariffs.length > 1 && (
                  <span className="inline-block text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                    💡 Placa compatible con:{' '}
                    {matchingTariffs.map((t) => t.vehicleTypeName).join(' / ')} — puede cambiar el tipo abajo si aplica
                  </span>
                )}
              </div>
            ) : licensePlate.length >= 5 ? (
              <span className="text-red-600 font-bold">
                ❌ Placa o código inválido (“{licensePlate}”) — No coincide con la nomenclatura de ningún vehículo
              </span>
            ) : (
              <span className="text-amber-700 font-semibold">
                Complete los caracteres de la placa o seleccione un vehículo con consecutivo automático
              </span>
            )}
          </div>
        </div>

        {/* Sección Inferior: Tipo de Vehículo y Cupo Disponible */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Tipo de Vehículo y Cupo Disponible
            </span>
            {selectedTariff && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                {selectedTariff.chargeFlatDay && Number(selectedTariff.dayRate || 0) > 0
                  ? `Tarifa Fija por Día: $${Number(selectedTariff.dayRate || 0).toLocaleString('es-CO')}/día`
                  : `Tarifa seleccionada: $${Number(selectedTariff.minuteRate || 0).toLocaleString('es-CO')}/min • $${Number(selectedTariff.hourRate || 0).toLocaleString('es-CO')}/hora${
                      selectedTariff.chargeByHour
                        ? ` (Hora/Fracción desde min ${selectedTariff.hourThresholdMinutes || 15})`
                        : ''
                    }`}
              </span>
            )}
          </div>

          {loadingTypes ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-4 ${desktopGridColsClass}`}>
              {vehicleTypes.map((vt) => {
                const active = vehicleTypeCode === vt.vehicleTypeCode;
                const occInfo = occupancyByType.find(
                  (o) => o.code === vt.vehicleTypeCode,
                );
                const cap = occInfo ? occInfo.capacity : Number(vt.capacity || 0);
                const available = occInfo ? occInfo.available : cap;
                const isFull = cap > 0 && available <= 0;
                const nomInfo = describeNomenclature(vt.platePattern, vt.vehicleTypeCode);
                const isIncompatibleWithTypedPlate =
                  licensePlate.length >= 5 &&
                  nomInfo.mode !== 'AUTO_PREFIX' &&
                  !doesPlateMatchTariff(licensePlate, vt);

                return (
                  <button
                    type="button"
                    key={vt.id}
                    onClick={() => handleSelectVehicleType(vt)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                      active
                        ? 'border-blue-600 bg-blue-50/90 text-blue-900 shadow-sm ring-2 ring-blue-100'
                        : isIncompatibleWithTypedPlate
                          ? 'border-slate-200 bg-slate-100/60 text-slate-400 opacity-60 hover:opacity-90'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/70 text-slate-600 mb-1">
                      {nomInfo.badge}
                    </span>
                    <span className="text-3xl sm:text-4xl mb-1.5">
                      {getVehicleIcon(vt.vehicleTypeCode, vt.vehicleTypeName)}
                    </span>
                    <span className="font-extrabold text-sm uppercase tracking-wider">
                      {vt.vehicleTypeName || vt.vehicleTypeCode}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 font-medium">
                      {vt.chargeFlatDay && Number(vt.dayRate || 0) > 0
                        ? `$${Number(vt.dayRate || 0).toLocaleString('es-CO')}/día (Fijo)`
                        : vt.chargeByHour && Number(vt.hourRate || 0) > 0
                          ? `$${Number(vt.hourRate || 0).toLocaleString('es-CO')}/h • $${Number(vt.minuteRate || 0).toLocaleString('es-CO')}/min`
                          : `$${Number(vt.minuteRate || 0).toLocaleString('es-CO')}/min`}
                    </span>
                    <span
                      className={`mt-2 text-xs font-extrabold px-3 py-0.5 rounded-full ${
                        isFull
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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

        {/* Botón de Confirmación */}
        <button
          type="submit"
          disabled={!isValid || !vehicleTypeCode}
          className={`w-full font-extrabold py-4 rounded-xl text-base sm:text-lg shadow-md transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 ${
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
      </form>

      <div className="hidden">
        <TicketPrint ref={printRef} ticket={lastTicket} parking={parking} />
      </div>
    </div>
  );
}
