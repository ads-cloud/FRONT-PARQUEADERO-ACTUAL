import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function TarifasAdmin() {
  const { user } = useAuth();
  const [parking, setParking] = useState(null);
  const [tarifas, setTarifas] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user && user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      return <Navigate to="/dashboard" replace />;
  }

  const fetchParkingData = async () => {
    try {
      const [parkingRes, tarifasRes] = await Promise.all([
        axios.get('/api/parking/me'),
        axios.get('/api/parking/tarifas')
      ]);
      setParking(parkingRes.data);
      setTarifas(tarifasRes.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingData();
  }, []);

  const handleUpdateTarifa = async (tipoVehiculo, valores) => {
    try {
        await axios.post('/api/parking/tarifas', {
            tipoVehiculo,
            valorMinuto: Number(valores.valorMinuto),
            valorHora: Number(valores.valorHora),
            valorDia: Number(valores.valorDia),
            valorMes: Number(valores.valorMes)
        });
        Swal.fire({
            title: '¡Actualizado!',
            text: `Tarifa de ${tipoVehiculo} guardada correctamente`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        fetchParkingData(); // Reload
    } catch (e) {
        Swal.fire('Error', 'No se pudo actualizar la tarifa', 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!parking) return <div>No se encontró información del parqueadero.</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ⚙️ Configuración de Tarifas
        </h2>
        <p className="text-gray-500">
            Administra los precios para cada tipo de vehículo en <strong>{parking.nombre}</strong>.
            <br/><span className="text-xs text-gray-400">{parking.direccion}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Automóviles */}
        <TarifaCard 
            title="Automóviles" 
            emoji="🚗"
            tipo="CARRO"
            color="blue"
            current={tarifas.find(t => t.tipoVehiculo === 'CARRO')}
            onSave={handleUpdateTarifa}
        />
        
        {/* Motocicletas */}
         <TarifaCard 
            title="Motocicletas" 
            emoji="🏍️"
            tipo="MOTO" 
            color="green"
            current={tarifas.find(t => t.tipoVehiculo === 'MOTO')}
            onSave={handleUpdateTarifa}
        />
        
        {/* Bicicletas */}
         <TarifaCard 
            title="Bicicletas" 
            emoji="🚲"
            tipo="BICICLETA" 
            color="orange"
            current={tarifas.find(t => t.tipoVehiculo === 'BICICLETA')}
            onSave={handleUpdateTarifa}
        />
      </div>
    </div>
  );
}

function TarifaCard({ title, emoji, tipo, color, current, onSave }) {
    const [valores, setValores] = useState({
        valorMinuto: 0,
        valorHora: 0,
        valorDia: 0,
        valorMes: 0
    });

    useEffect(() => {
        if(current) {
            setValores({
                valorMinuto: current.valorMinuto || 0,
                valorHora: current.valorHora || 0,
                valorDia: current.valorDia || 0,
                valorMes: current.valorMes || 0
            });
        }
    }, [current]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValores(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const colorClasses = {
        blue: "border-blue-500 bg-blue-50 text-blue-700",
        green: "border-emerald-500 bg-emerald-50 text-emerald-700",
        orange: "border-orange-500 bg-orange-50 text-orange-700",
    };

    const btnClasses = {
        blue: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        green: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
        orange: "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500",
    };

    return (
        <div className={`rounded-xl shadow-lg border-t-4 bg-white overflow-hidden transition-all hover:shadow-xl ${colorClasses[color].split(' ')[0]}`}>
            <div className={`p-4 border-b flex items-center justify-between ${colorClasses[color]}`}>
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="text-2xl">{emoji}</span> {title}
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-white/50 rounded">
                    {tipo}
                </span>
            </div>
            
            <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Minuto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input 
                                type="number" 
                                name="valorMinuto"
                                value={valores.valorMinuto} 
                                onChange={handleChange}
                                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Hora</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input 
                                type="number" 
                                name="valorHora"
                                value={valores.valorHora} 
                                onChange={handleChange}
                                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Día (24h)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input 
                                type="number" 
                                name="valorDia"
                                value={valores.valorDia} 
                                onChange={handleChange}
                                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Mensualidad</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input 
                                type="number" 
                                name="valorMes"
                                value={valores.valorMes} 
                                onChange={handleChange}
                                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => onSave(tipo, valores)}
                    className={`w-full py-3 px-4 rounded-lg text-white font-bold shadow-md transition-transform active:scale-[0.98] focus:ring-2 focus:ring-offset-2 ${btnClasses[color]}`}
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}