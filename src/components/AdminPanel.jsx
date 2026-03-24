import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [parkings, setParkings] = useState([]);
  const { user, switchParking } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParkings();
  }, []);

  const fetchParkings = async () => {
    try {
        const res = await axios.get('/api/parking/summary');
        setParkings(res.data);
    } catch (error) {
        console.error(error);
        toast.error('Error al cargar parqueaderos');
    } finally {
        setLoading(false);
    }
  };

  const handleEnter = async (parkingId) => {
    const success = await switchParking(parkingId);
    if (success) {
        navigate('/dashboard');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <header className="mb-8 flex justify-between items-center max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-gray-500">Bienvenido, {user?.username}</p>
            </div>
            <button 
                onClick={() => navigate('/dashboard')}
                className="text-blue-600 hover:underline"
            >
                Ir a Dashboard Actual &rarr;
            </button>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cards */}
            {parkings.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{p.nombre}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    📍 {p.direccion}
                                </p>
                            </div>
                            {user?.parkingId === p.id && (
                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                    Activo
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-blue-600 uppercase font-bold">Ocupación</p>
                                <p className="text-2xl font-bold text-blue-900">{p.ocupacion}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-green-600 uppercase font-bold">Ingresos Hoy</p>
                                <p className="text-xl font-bold text-green-900">${p.ingresosHoy?.toLocaleString('es-CO')}</p>
                            </div>
                            {p.vencimientosSoon > 0 && (
                                <div className="col-span-2 bg-red-50 p-3 rounded-lg flex items-center justify-between text-red-800 border border-red-100">
                                    <span className="text-sm font-semibold flex items-center gap-2">
                                        ⚠️ Mensualidades por vencer
                                    </span>
                                    <span className="bg-red-200 text-red-900 text-xs font-bold px-2 py-1 rounded-full">
                                        {p.vencimientosSoon}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => handleEnter(p.id)}
                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                                user?.parkingId === p.id 
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {user?.parkingId === p.id ? 'Ya Estás Aquí' : 'Administrar'}
                        </button>
                    </div>
                </div>
            ))}

            {/* Empty State */}
            {parkings.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                    No tienes parqueaderos asignados.
                </div>
            )}
        </main>
    </div>
  );
}