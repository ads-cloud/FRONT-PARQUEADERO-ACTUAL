import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { cleanPlateInput, getVehicleType, isValidPlate } from '../utils/vehicleValidation';
import { TicketExitPrint } from './TicketExitPrint';

export default function TicketExit() {
  const [inputValue, setInputValue] = useState(''); // Puede ser placa o ID
  const [info, setInfo] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [activeTickets, setActiveTickets] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [showActiveList, setShowActiveList] = useState(false);
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
  }, []);

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

  // Detectar tipo visualmente mientras escribe
  useEffect(() => {
    const type = getVehicleType(inputValue);
    if (type) {
        setDetectedType(type);
    } else {
        setDetectedType(null);
    }
  }, [inputValue]);

  // --- NUEVA FUNCIONALIDAD: Búsqueda automática ---
  useEffect(() => {
    // Si tiene 6 caracteres y no estamos mostrando info (para evitar bucles o recargas innecesarias)
    if (inputValue.length === 6 && !info) {
      // Pequeño timeout para dar sensación de fluidez y asegurar que el usuario terminó de teclear
      const timeoutId = setTimeout(() => {
        handleSearch(); 
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    // Si el usuario borra caracteres, limpiamos la info para permitir nuevas búsquedas
    if (inputValue.length < 6 && info) {
      setInfo(null);
    }
  }, [inputValue]);
  // ------------------------------------------------

  const handleSearch = async (e, forcedValue) => {
    if (e) e.preventDefault(); // Solo prevenimos default si hay evento
    const valueToSearch = forcedValue || inputValue;
    if (!valueToSearch) return;
    
    // Evitar múltiples búsquedas si ya tenemos la info mostrada
    if (info && info.ticket.placa === valueToSearch) return;

    const toastId = toast.loading('Buscando ticket...');
    setInfo(null);
    let searchId = valueToSearch;

    try {
      // 1. Si es una placa válida (6 chars), buscar ID usando endpoint específico
      if (isValidPlate(valueToSearch)) {
         try {
             const resPlaca = await axios.get(`/api/tickets/placa/${valueToSearch}`);
             
             if (resPlaca.data && resPlaca.data.id) {
                 searchId = resPlaca.data.id;
             } else {
                 throw new Error('Vehículo no encontrado');
             }
         } catch (searchErr) {
             // Si el error viene del backend (ej: 404), usar su mensaje
             const msg = searchErr.response?.data?.message || 'No se encontró un ticket activo para esta placa';
             throw new Error(msg);
         }
      }

      // 2. Calcular salida usando el ID encontrado
      const res = await axios.get(`/api/tickets/${searchId}/calculate`);
      setInfo(res.data);
      toast.success('Ticket encontrado', { id: toastId });

    } catch (err) {
      // console.error(err); // Opcional
      // CORRECCIÓN: Leer el mensaje del backend si existe
      let msg = err.response?.data?.message; 
      if (!msg) msg = err.message || 'Error al buscar el ticket';
      
      toast.error(msg, { id: toastId });
      setInfo(null);
    }
  };

  const handlePay = async () => {
    if(!info) return;
    const toastId = toast.loading('Procesando pago...');
    try {
      const currentCalculation = info;
      const res = await axios.post(`/api/tickets/${info.ticket.id}/exit`);
      const paidTicket = res.data;

      setLastPaidReceipt({
        ticket: paidTicket,
        minutos: currentCalculation.minutos,
        valorMinuto: currentCalculation.valorMinuto,
        total: currentCalculation.total,
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

  const handleChange = (e) => {
    const val = cleanPlateInput(e.target.value);
    setInputValue(val);
  };

  const filteredActiveTickets = activeTickets.filter((ticket) => {
    const q = activeFilter.trim().toUpperCase();
    if (!q) return true;
    return (
      ticket.placa?.toUpperCase().includes(q) ||
      ticket.tipoVehiculo?.toUpperCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Registrar Salida / Cobro</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Formulario de Búsqueda */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 h-fit">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Placa</label>
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
                  Ingrese la placa (6 caracteres) o el número de ticket
                </p>
            </div>
          </form>
        </div>

        {/* Resumen de Cobro */}
        {info ? (
          <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-green-500 animate-fade-in-up">
            <div className="text-center mb-6">
              <h3 className="text-gray-500 uppercase tracking-widest text-sm font-bold">Total a Pagar</h3>
              <div className="text-4xl md:text-5xl font-extrabold text-green-600 mt-2">
                ${parseFloat(info.total).toLocaleString()}
              </div>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg mb-6 text-sm border border-gray-200">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600">Vehículo:</span>
                <span className="font-bold text-lg md:text-xl text-gray-900 tracking-wider bg-white px-2 py-1 rounded border">{info.ticket.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-bold text-gray-900">{info.ticket.tipoVehiculo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entrada:</span>
                <span className="font-mono text-gray-900">{new Date(info.ticket.fechaIngreso).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Salida:</span>
                <span className="font-mono text-gray-900">{new Date(info.fechaSalida).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-600">Valor Minuto:</span>
                <span className="font-mono text-gray-900">${info.valorMinuto}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-600">Tiempo Total:</span>
                <span className="font-bold text-gray-900">{info.minutos} min</span>
              </div>
            </div>

            <button 
              onClick={handlePay}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg md:text-xl shadow-lg transition-transform transform active:scale-[0.98]"
            >
              CONFIRMAR PAGO 💰
            </button>
            
            <button 
              onClick={() => { setInfo(null); setInputValue(''); inputRef.current?.focus(); }}
              className="w-full mt-3 text-red-500 hover:text-red-700 text-sm font-semibold p-2 hover:bg-red-50 rounded"
            >
              Cancelar Operación
            </button>
          </div>
        ) : (
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-[300px]">
                <div className="text-center">
                    <span className="text-4xl block mb-2">🧾</span>
                    <p>Ingrese una placa para ver el cobro</p>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm md:text-base font-bold text-gray-700 uppercase tracking-wide">Vehículos activos en parqueadero</h3>
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
          <p className="text-sm text-gray-500">Lista colapsada. Presione “Mostrar lista” para ver los vehículos activos.</p>
        ) : loadingActive ? (
          <p className="text-sm text-gray-500">Cargando vehículos activos...</p>
        ) : activeTickets.length === 0 ? (
          <p className="text-sm text-gray-500">No hay vehículos activos en este momento.</p>
        ) : filteredActiveTickets.length === 0 ? (
          <p className="text-sm text-gray-500">Sin resultados para el filtro aplicado.</p>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Placa</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Entrada</th>
                  <th className="py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-bold tracking-wider uppercase">{ticket.placa}</td>
                    <td className="py-2 pr-4">{ticket.tipoVehiculo}</td>
                    <td className="py-2 pr-4">{new Date(ticket.fechaIngreso).toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => {
                          setInputValue(ticket.placa);
                          setInfo(null);
                          handleSearch(undefined, ticket.placa);
                        }}
                        className="px-3 py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 font-semibold"
                      >
                        Cobrar
                      </button>
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