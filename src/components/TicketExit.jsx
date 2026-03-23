import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { cleanPlateInput, getVehicleType, isValidPlate } from '../utils/vehicleValidation';

export default function TicketExit() {
  const [inputValue, setInputValue] = useState(''); // Puede ser placa o ID
  const [info, setInfo] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleSearch = async (e) => {
    if (e) e.preventDefault(); // Solo prevenimos default si hay evento
    if (!inputValue) return;
    
    // Evitar múltiples búsquedas si ya tenemos la info mostrada
    if (info && info.ticket.placa === inputValue) return;

    const toastId = toast.loading('Buscando ticket...');
    setInfo(null);
    let searchId = inputValue;

    try {
      // 1. Si es una placa válida (6 chars), buscar ID usando endpoint específico
      if (isValidPlate(inputValue)) {
         try {
             const resPlaca = await axios.get(`/api/tickets/placa/${inputValue}`);
             
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
      await axios.post(`/api/tickets/${info.ticket.id}/exit`);
      toast.success('¡Salida registrada exitosamente!', { id: toastId });
      setInfo(null);
      setInputValue('');
      setDetectedType(null);
      inputRef.current?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al registrar la salida';
      toast.error(msg, { id: toastId });
    }
  };

  const handleChange = (e) => {
    const val = cleanPlateInput(e.target.value);
    setInputValue(val);
  };

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
    </div>
  );
}