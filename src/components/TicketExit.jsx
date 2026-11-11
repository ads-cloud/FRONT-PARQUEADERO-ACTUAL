import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useReactToPrint } from 'react-to-print';
import {
  cleanPlateInput,
  getVehicleType,
  isValidPlate,
  VEHICLE_TYPE_LABELS,
} from '../utils/vehicleValidation';
import { TicketExitPrint } from './TicketExitPrint';
import { useAuth } from '../context/AuthContext';

const getVehicleBadgeIcon = (code) => {
  const c = (code || '').toUpperCase();
  if (c.includes('MOTO')) return '🏍️';
  if (c.includes('BICY') || c.includes('BICI')) return '🚲';
  return '🚗';
};

export default function TicketExit({ onActiveCountChange }) {
  const { user, hasPermission } = useAuth();
  const canCancelTicket = hasPermission('TICKET_EXIT', 'delete');
  const [inputValue, setInputValue] = useState('');
  const [info, setInfo] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [activeTickets, setActiveTickets] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [showActiveList, setShowActiveList] = useState(true);
  const [parking, setParking] = useState(null);
  const [lastPaidReceipt, setLastPaidReceipt] = useState(null);

  const inputRef = useRef();
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setLastPaidReceipt(null),
  });

  useEffect(() => {
    inputRef.current?.focus();
    fetchActiveTickets();
    fetchParkingInfo();
  }, [user?.parkingId]);

  const fetchActiveTickets = async () => {
    try {
      setLoadingActive(true);
      const res = await axios.get('/api/tickets/active');
      const list = res.data || [];
      setActiveTickets(list);
      if (typeof onActiveCountChange === 'function') {
        onActiveCountChange(list.length);
      }
    } catch (error) {
      toast.error('No se pudo cargar la lista de vehículos activos');
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchParkingInfo = async () => {
    try {
      const res = await axios.get('/api/parking/me');
      setParking(res.data || null);
    } catch (error) {
      setParking(null);
    }
  };

  useEffect(() => {
    const type = getVehicleType(inputValue);
    setDetectedType(type ? VEHICLE_TYPE_LABELS[type] || type : null);
  }, [inputValue]);

  useEffect(() => {
    if (inputValue.length === 6 && !info) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    if (inputValue.length < 5 && info) {
      setInfo(null);
    }
  }, [inputValue]);

  const handleSearch = async (e, forcedValue) => {
    if (e) e.preventDefault();
    const valueToSearch = (forcedValue || inputValue || '').trim().toUpperCase();
    if (!valueToSearch) return;

    if (info && info.ticket?.licensePlate === valueToSearch) return;

    const toastId = toast.loading('Buscando ticket...');
    setInfo(null);
    let searchId = valueToSearch;

    try {
      const isNumericTicketId = /^\d{1,5}$/.test(valueToSearch);
      if (!isNumericTicketId && isValidPlate(valueToSearch)) {
        try {
          const resPlate = await axios.get(`/api/tickets/plate/${valueToSearch}`);
          if (resPlate.data && resPlate.data.id) {
            searchId = resPlate.data.id;
          } else {
            throw new Error('Vehículo no encontrado');
          }
        } catch (searchErr) {
          const msg =
            searchErr.response?.data?.message ||
            'No se encontró un ticket activo para esta placa';
          throw new Error(msg);
        }
      }

      const res = await axios.get(`/api/tickets/${searchId}/calculate`);
      setInfo(res.data);
      toast.success('Ticket encontrado', { id: toastId });
    } catch (err) {
      let msg =
        err.response?.data?.message || err.message || 'Error al buscar el ticket';
      toast.error(msg, { id: toastId });
      setInfo(null);
    }
  };

  const handlePay = async () => {
    if (!info) return;
    const toastId = toast.loading('Procesando salida...');
    try {
      const currentCalculation = info;
      const res = await axios.post(`/api/tickets/${info.ticket.id}/exit`);
      const paidTicket = res.data;

      setLastPaidReceipt({
        ticket: paidTicket,
        minutes: currentCalculation.minutes,
        minuteRate: currentCalculation.minuteRate,
        hourRate: currentCalculation.hourRate,
        chargeByHour: currentCalculation.chargeByHour,
        billingExplanation: currentCalculation.billingExplanation,
        totalAmount: currentCalculation.totalAmount,
        isSubscriptionCovered: currentCalculation.isSubscriptionCovered,
      });

      toast.success('¡Salida registrada exitosamente!', { id: toastId });
      setInfo(null);
      setInputValue('');
      setDetectedType(null);
      fetchActiveTickets();
      inputRef.current?.focus();
      setTimeout(() => handlePrint(), 300);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al registrar la salida';
      toast.error(msg, { id: toastId });
    }
  };

  const handleCancelTicket = async (ticketId, plate) => {
    const { isConfirmed, value: reason } = await Swal.fire({
      title: `¿Anular ticket de ${plate}?`,
      text: 'Ingrese el motivo de la anulación del ticket activo:',
      input: 'text',
      inputPlaceholder: 'Ej: Placa mal digitada / Vehículo se retiró de inmediato',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, anular ticket',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Debe ingresar un motivo para anular el ticket';
        }
        return null;
      },
    });
    if (!isConfirmed) return;

    try {
      await axios.post(`/api/tickets/${ticketId}/cancel`, { reason: reason.trim() });
      toast.success(`Ticket de ${plate} anulado`);
      if (info?.ticket?.id === ticketId) setInfo(null);
      fetchActiveTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo anular el ticket');
    }
  };

  const handleChange = (e) => {
    const val = cleanPlateInput(e.target.value);
    setInputValue(val);
  };

  const filteredActiveTickets = activeTickets.filter((ticket) => {
    const q = activeFilter.trim().toUpperCase();
    if (!q) return true;
    return (
      ticket.licensePlate?.toUpperCase().includes(q) ||
      ticket.vehicleTypeName?.toUpperCase().includes(q) ||
      ticket.vehicleTypeCode?.toUpperCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Panel Izquierdo: Buscador de Placa / Ticket */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-xs border border-slate-200/90 p-5 flex flex-col justify-between">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                🔍 Liquidar Salida (Placa o # Ticket)
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  className="w-full text-2xl sm:text-3xl font-black font-mono p-3 border-2 border-slate-300 rounded-xl uppercase text-center tracking-[0.2em] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all bg-slate-50/50"
                  placeholder="ABC123"
                  value={inputValue}
                  onChange={handleChange}
                  autoFocus
                />
                {detectedType && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200">
                    {detectedType}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Búsqueda automática al digitar 6 caracteres
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>⚡</span>
                <span>Calcular Cobro</span>
              </button>
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setInfo(null);
                    inputRef.current?.focus();
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-colors text-xs"
                >
                  Limpiar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Panel Derecho: Resumen de Liquidación y Pago */}
        <div className="lg:col-span-8">
          {info ? (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-500 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getVehicleBadgeIcon(info.ticket.vehicleTypeCode)}
                  </span>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-emerald-100 block">
                      Liquidación Lista • Ticket #{info.ticket.id}
                    </span>
                    <span className="font-mono text-2xl font-black tracking-widest">
                      {info.ticket.licensePlate}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-emerald-100 block">
                    Total a Cobrar
                  </span>
                  <span className="text-3xl md:text-4xl font-black">
                    ${Number(info.totalAmount || 0).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {info.isSubscriptionCovered && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-emerald-900">
                    <span className="text-2xl">🌟</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Vehículo con Mensualidad Activa
                      </p>
                      <p className="text-sm font-semibold">
                        Titular: {info.subscription?.customerName || 'Suscriptor'} (Sin cobro adicional)
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block">
                      Tipo Vehículo
                    </span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {info.ticket.vehicleTypeName || info.ticket.vehicleTypeCode}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block">
                      Tiempo Total
                    </span>
                    <span className="font-bold text-blue-700 text-sm mt-0.5 block">
                      ⏱️ {info.minutes} min
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block">
                      {info.chargeByHour && Number(info.hourRate || 0) > 0
                        ? `Tarifa Hora (min ${info.hourThresholdMinutes || 15}+)`
                        : 'Tarifa / Min'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                      {info.chargeByHour && Number(info.hourRate || 0) > 0
                        ? `$${Number(info.hourRate || 0).toLocaleString('es-CO')} /h ($${Number(info.minuteRate || 0).toLocaleString('es-CO')}/m)`
                        : `$${Number(info.minuteRate || 0).toLocaleString('es-CO')}`}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block">
                      Modalidad
                    </span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {info.billingExplanation ||
                        (info.isSubscriptionCovered ? 'Mensualidad' : 'Por Tiempo')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                  <div className="flex justify-between sm:block">
                    <span className="text-slate-400 font-semibold uppercase block">
                      Hora de Entrada:
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {new Date(info.ticket.entryTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-slate-400 font-semibold uppercase block">
                      Hora de Salida:
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {new Date(info.exitTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={handlePay}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-4 px-6 rounded-xl text-base md:text-lg shadow-lg shadow-emerald-600/20 transition-transform transform active:scale-[0.99]"
                  >
                    {info.isSubscriptionCovered
                      ? '✅ CONFIRMAR SALIDA (MENSUALIDAD)'
                      : '💰 CONFIRMAR PAGO E IMPRIMIR RECIBO'}
                  </button>

                  <button
                    onClick={() => {
                      setInfo(null);
                      setInputValue('');
                      inputRef.current?.focus();
                    }}
                    className="px-5 py-4 text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 text-sm font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200 h-full min-h-[185px] p-5">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                🧾
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">
                  Listo para Liquidar Salida
                </h4>
                <p className="text-xs text-slate-400 max-w-md mt-0.5">
                  Digite la placa a la izquierda o presione{' '}
                  <strong className="text-emerald-600">“Cobrar / Salida”</strong> en
                  cualquier vehículo de la tabla inferior.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Vehículos Activos en Parqueadero */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm md:text-base font-bold text-slate-800 uppercase tracking-wide">
              Vehículos Activos en Parqueadero ({activeTickets.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showActiveList && (
              <div className="relative">
                <input
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  placeholder="Filtrar por placa o tipo..."
                  className="text-xs md:text-sm border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {activeFilter && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <button
              onClick={fetchActiveTickets}
              className="text-xs md:text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold border border-blue-200/60 transition-colors"
            >
              ↻ Actualizar
            </button>
            <button
              onClick={() => setShowActiveList((prev) => !prev)}
              className="text-xs md:text-sm px-3 py-1.5 rounded-lg bg-slate-200/70 text-slate-700 hover:bg-slate-300/70 font-semibold transition-colors"
            >
              {showActiveList ? 'Ocultar lista' : 'Mostrar lista'}
            </button>
          </div>
        </div>

        {!showActiveList ? (
          <p className="p-6 text-sm text-slate-500 text-center">
            Lista oculta. Presione “Mostrar lista” para ver los vehículos dentro del parqueadero.
          </p>
        ) : loadingActive ? (
          <p className="p-8 text-sm text-slate-500 text-center">
            Cargando vehículos activos...
          </p>
        ) : activeTickets.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <span className="text-3xl block mb-2">🅿️</span>
            <p className="text-sm font-medium">
              No hay vehículos activos en el parqueadero en este momento.
            </p>
          </div>
        ) : filteredActiveTickets.length === 0 ? (
          <p className="p-8 text-sm text-slate-500 text-center">
            Sin resultados para el filtro <strong>“{activeFilter}”</strong>.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100/95 text-slate-600 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 text-left">Placa</th>
                  <th className="py-3 px-4 text-left">Tipo de Vehículo</th>
                  <th className="py-3 px-4 text-left">Hora de Entrada</th>
                  <th className="py-3 px-4 text-left">Modalidad</th>
                  <th className="py-3 px-6 text-right">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActiveTickets.map((ticket) => {
                  const isSelected = info?.ticket?.id === ticket.id;
                  return (
                    <tr
                      key={ticket.id}
                      className={`transition-colors ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                    >
                      <td className="py-3 px-6">
                        <span className="font-mono font-black text-base tracking-wider uppercase bg-amber-100/80 text-slate-900 border border-amber-300 px-2.5 py-1 rounded-md">
                          {ticket.licensePlate}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{getVehicleBadgeIcon(ticket.vehicleTypeCode)}</span>
                          <span>{ticket.vehicleTypeName || ticket.vehicleTypeCode}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {new Date(ticket.entryTime).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {ticket.hasActiveSubscription ? (
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                            ★ Mensualidad
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium">
                            ⏱️ Por Tiempo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setInputValue(ticket.licensePlate);
                            setInfo(null);
                            handleSearch(undefined, ticket.licensePlate);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm transition-colors"
                        >
                          💰 Cobrar / Salida
                        </button>
                        {canCancelTicket && (
                          <button
                            onClick={() =>
                              handleCancelTicket(ticket.id, ticket.licensePlate)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold border border-red-200"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="hidden">
        <TicketExitPrint ref={printRef} receipt={lastPaidReceipt} parking={parking} />
      </div>
    </div>
  );
}
