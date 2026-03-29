import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { TicketPrint } from './TicketPrint';
import toast from 'react-hot-toast';
import { cleanPlateInput, getVehicleType, isValidPlate } from '../utils/vehicleValidation';

// Icon mapping helper
const getIconForType = (type) => {
  const t = type.toUpperCase();
  if (t.includes('OTO')) return '🏍️';
  if (t.includes('BICI')) return '🚲';
  if (t.includes('CAMION')) return '🚚';
  return '🚗';
};

export default function TicketEntry() {
  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState('');
  const [lastTicket, setLastTicket] = useState(null);
  const [isValid, setIsValid] = useState(false);
  
  // Dynamic types state
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [parking, setParking] = useState(null);

  const printRef = useRef();

  // 1. Cargar tipos disponibles y datos del parqueadero
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const [tarifasRes, parkingRes] = await Promise.all([
          axios.get('/api/parking/tarifas'),
          axios.get('/api/parking/me'),
        ]);
        setVehicleTypes(tarifasRes.data);
        setParking(parkingRes.data);
        setLoadingTypes(false);
      } catch (error) {
        console.error(error);
        toast.error('Error cargando configuración del parqueadero');
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  // 2. Detección automática y validación (CORREGIDA)
  useEffect(() => {
    const detectedType = getVehicleType(placa);
    let typeToSet = null; // <-- Por defecto limpia la selección

    // Si detectamos un patrón conocido estrictamente
    if (detectedType) {
       // Buscar si existe en backend para seleccionarlo
       const exists = vehicleTypes.find(t => t.tipoVehiculo === detectedType);
       if (exists) {
           typeToSet = detectedType;
       }
    } 
    // Si no detectamos patrón pero ES VÁLIDA y no tenemos tipo, seleccionamos el primero
    // Esto es CLAVE: solo entra aquí si isValidPlate es true
    else if (isValidPlate(placa) && !tipo && vehicleTypes.length > 0) {
        typeToSet = vehicleTypes[0].tipoVehiculo;
    }

    if (typeToSet !== tipo) setTipo(typeToSet);

    // Validación final ESTRICTA
    // Debe tener 6 caracteres, tener un tipo seleccionado Y CUMPLIR EL FORMATO
    const isFormatValid = isValidPlate(placa);
    const hasType = !!(detectedType || typeToSet);

    if (placa.length === 6) {
        if (isFormatValid && hasType) {
            setIsValid(true);
        } else {
            setIsValid(false);
            // Solo mostrar error si tiene longitud correcta pero formato incorrecto
            if (!isFormatValid) {
                 // Opcional: toast.error('Formato inválido: AAA123, AAA12B o 123456');
            }
        }
    } else {
        setIsValid(false);
    }
  }, [placa, vehicleTypes]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setLastTicket(null)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || !tipo) return toast.error('Placa inválida o tipo no seleccionado');

    const toastId = toast.loading('Registrando ingreso...');
    try {
      const res = await axios.post('/api/tickets', { placa, tipoVehiculo: tipo });
      setLastTicket(res.data);
      toast.success(`Ingreso registrado: ${placa}`, { id: toastId });
      setPlaca('');
      setIsValid(false);
      setTimeout(() => handlePrint(), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar ingreso', { id: toastId });
    }
  };

  const handleChange = (e) => {
    const val = cleanPlateInput(e.target.value);
    if (val.length <= 6) setPlaca(val);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col justify-center min-h-[500px]">
      
      {/* Formulario de Ingreso Centrado */}
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-gray-800">Registrar Nuevo Ingreso</h2>

          <form onSubmit={handleSubmit} className="space-y-8">
             {/* Input Placa */}
             <div>
                <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest text-center">Placa del Vehículo</label>
                <div className="relative max-w-xs mx-auto">
                  <input 
                    className={`w-full text-3xl md:text-5xl font-mono p-4 border-2 rounded-xl uppercase text-center tracking-[0.2em] outline-none transition-all shadow-inner
                      ${isValid ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300 focus:border-blue-500'}
                      ${placa.length === 6 && !isValid ? 'border-red-500 bg-red-50 text-red-800 animate-pulse' : ''}
                    `}
                    placeholder="------"
                    value={placa}
                    onChange={handleChange}
                    autoFocus
                  />
                  {placa.length === 6 && (
                    <div className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2 text-2xl md:text-3xl animate-bounce">
                      {isValid ? '✅' : '❌'}
                    </div>
                  )}
                </div>
                {placa.length === 6 && !isValid && (
                    <p className="text-red-500 text-center text-xs mt-2 font-bold">
                        Formato inválido. Use: AAA123, AAA12B o 123456
                    </p>
                )}
             </div>
             
             {/* Indicadores de Tipo Dinámicos */}
             {loadingTypes ? (
                 <div className="text-center text-gray-400">Cargando tipos...</div>
             ) : (
                 <div className={`grid gap-4 ${vehicleTypes.length > 2 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                    {vehicleTypes.map((vt) => (
                        <div 
                            key={vt.id}
                            // onClick eliminado para evitar selección manual
                            className={`
                                p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300
                                ${tipo === vt.tipoVehiculo 
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg scale-105' 
                                    : 'border-gray-100 text-gray-400 opacity-50'} 
                            `}
                        >
                            <span className="text-3xl md:text-4xl mb-2">{getIconForType(vt.tipoVehiculo)}</span>
                            <span className="font-bold text-xs uppercase tracking-wider truncate w-full text-center">{vt.tipoVehiculo}</span>
                        </div>
                    ))}
                 </div>
             )}

             <button 
              disabled={!isValid || !tipo}
              className={`w-full font-extrabold py-5 rounded-xl text-lg md:text-xl shadow-lg transition-all transform active:scale-[0.98] 
                ${isValid && tipo 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white cursor-pointer shadow-green-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}
              `}
             >
               {isValid ? 'CONFIRMAR INGRESO 🎟️' : 'Complete la Placa...'}
             </button>
          </form>
      </div>
      
      {/* Ticket oculto para impresión */}
      <div className="hidden"><TicketPrint ref={printRef} ticket={lastTicket} parking={parking} /></div>
    </div>
  );
}