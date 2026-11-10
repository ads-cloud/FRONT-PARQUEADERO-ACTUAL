import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import {
  cleanPlateInput,
  getVehicleType,
  isValidPlate,
  VEHICLE_TYPE_LABELS,
} from '../utils/vehicleValidation';
import { TicketExitPrint } from './TicketExitPrint';
import { useAuth } from '../context/AuthContext';

export default function TicketExit() {
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
      setActiveTickets(res.data || []);
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
      let msg = err.response?.data?.message || err.message || 'Error al buscar el ticket';
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
    const reason = window.prompt(
      `¿Seguro que desea ANULAR el ticket activo de la placa ${plate}? Ingrese el motivo:`,
    );
    if (reason === null) return;

    try {
      await axios.post(`/api/tickets/${ticketId}/cancel`, { reason });
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
        Registrar Salida / Cobro
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 h-fit">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Placa o # de Ticket
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  className="w-full text-2xl md:text-3xl font-mono p-4 border-2 border-gray-300 rounded-lg uppercase text-center tracking-widest outline-none focus:border-blue-500 transition-all"
                  placeholder="BUSCAR PLACA..."
                  value={inputValue}
                  onChange={handleChange}
                  autoFocus
                />
                {detectedType && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                    {detectedType}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Ingrese la placa o el número de ticket y presione Enter
              </p>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              Buscar Vehículo
            </button>
          </form>
        </div>

        {info ? (
          <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-green-500 animate-fade-in-up">
            <div className="text-center mb-6">
              <h3 className="text-gray-500 uppercase tracking-widest text-sm font-bold">
                Total a Pagar
              </h3>
              <div className="text-4xl md:text-5xl font-extrabold text-green-600 mt-2">
                ${Number(info.totalAmount || 0).toLocaleString('es-CO')}
              </div>
              {info.isSubscriptionCovered && (
                <div className="mt-2 inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                  ★ Cubierto por Mensualidad Vigente ({info.subscription?.customerName})
                </div>
              )}
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg mb-6 text-sm border border-gray-200">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600">Vehículo:</span>
                <span className="font-bold text-lg md:text-xl text-gray-900 tracking-wider bg-white px-2 py-1 rounded border font-mono">
                  {info.ticket.licensePlate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-bold text-gray-900">
                  {info.ticket.vehicleTypeName || info.ticket.vehicleTypeCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entrada:</span>
                <span className="font-mono text-gray-900">
                  {new Date(info.ticket.entryTime).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Salida:</span>
                <span className="font-mono text-gray-900">
                  {new Date(info.exitTime).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-600">Tarifa Minuto:</span>
                <span className="font-mono text-gray-900">
                  ${Number(info.minuteRate || 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-600">Tiempo Total:</span>
                <span className="font-bold text-gray-900">{info.minutes} min</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg md:text-xl shadow-lg transition-transform transform active:scale-[0.98]"
            >
              {info.isSubscriptionCovered
                ? 'CONFIRMAR SALIDA (MENSUALIDAD) ✅'
                : 'CONFIRMAR PAGO Y SALIDA 💰'}
            </button>

            <button
              onClick={() => {
                setInfo(null);
                setInputValue('');
                inputRef.current?.focus();
              }}
              className="w-full mt-3 text-red-500 hover:text-red-700 text-sm font-semibold p-2 hover:bg-red-50 rounded"
            >
              Cancelar Operación
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-[300px]">
            <div className="text-center">
              <span className="text-4xl block mb-2">🧾</span>
              <p>Ingrese una placa o seleccione un vehículo activo para liquidar</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm md:text-base font-bold text-gray-700 uppercase tracking-wide">
            Vehículos activos en parqueadero ({activeTickets.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActiveList((prev) => !prev)}
              className="text-xs md:text-sm px-3 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
            >
              {showActiveList ? 'Ocultar' : 'Mostrar'} lista
            </button>
            {showActiveList && (
              <>
                <input
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  placeholder="Filtrar por placa o tipo"
                  className="text-xs md:text-sm border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchActiveTickets}
                  className="text-xs md:text-sm px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                >
                  Actualizar
                </button>
              </>
            )}
          </div>
        </div>

        {!showActiveList ? (
          <p className="text-sm text-gray-500">
            Lista colapsada. Presione “Mostrar lista” para ver los vehículos activos.
          </p>
        ) : loadingActive ? (
          <p className="text-sm text-gray-500">Cargando vehículos activos...</p>
        ) : activeTickets.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay vehículos activos en este momento.
          </p>
        ) : filteredActiveTickets.length === 0 ? (
          <p className="text-sm text-gray-500">
            Sin resultados para el filtro aplicado.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Placa</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Entrada</th>
                  <th className="py-2 pr-4">Modalidad</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-bold tracking-wider uppercase font-mono">
                      {ticket.licensePlate}
                    </td>
                    <td className="py-2 pr-4">
                      {ticket.vehicleTypeName || ticket.vehicleTypeCode}
                    </td>
                    <td className="py-2 pr-4">
                      {new Date(ticket.entryTime).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      {ticket.hasActiveSubscription ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                          Mensualidad
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Por Tiempo</span>
                      )}
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <button
                        onClick={() => {
                          setInputValue(ticket.licensePlate);
                          setInfo(null);
                          handleSearch(undefined, ticket.licensePlate);
                        }}
                        className="px-3 py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 font-semibold"
                      >
                        Cobrar / Salida
                      </button>
                      {canCancelTicket && (
                        <button
                          onClick={() =>
                            handleCancelTicket(ticket.id, ticket.licensePlate)
                          }
                          className="px-2.5 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
