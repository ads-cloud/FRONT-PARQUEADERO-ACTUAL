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
      setParkings(res.data || []);
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
      toast.success('Sede cambiada correctamente');
      navigate('/dashboard');
    } else {
      toast.error('No se pudo cambiar de parqueadero');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <header className="mb-8 flex justify-between items-center max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Selección de Sede (Multi-Sede)
          </h1>
          <p className="text-sm text-slate-500">
            Bienvenido, <strong>{user?.username}</strong> — Seleccione la sede en la que desea operar
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:underline font-semibold text-sm"
        >
          Volver al Dashboard &rarr;
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parkings.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl shadow-xs border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {p.companyName && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mb-1">
                      🏛️ {p.companyName} {p.taxId ? `• NIT ${p.taxId}` : ''}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    📍 {p.address}
                  </p>
                </div>
                {Number(user?.parkingId) === Number(p.id) && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Activa
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50/80 p-3 rounded-lg text-center border border-blue-100">
                  <p className="text-[11px] text-blue-600 uppercase font-bold">
                    Ocupación Total
                  </p>
                  <p className="text-xl font-extrabold text-blue-900">
                    {p.occupancy} / {p.totalCapacity || 100}
                  </p>
                </div>
                <div className="bg-emerald-50/80 p-3 rounded-lg text-center border border-emerald-100">
                  <p className="text-[11px] text-emerald-600 uppercase font-bold">
                    Ingresos Hoy
                  </p>
                  <p className="text-lg font-extrabold text-emerald-900">
                    ${Number(p.todayIncome || 0).toLocaleString('es-CO')}
                  </p>
                </div>
                {p.byVehicleType && p.byVehicleType.length > 0 && (
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    {p.byVehicleType.map((vt) => (
                      <div
                        key={vt.vehicleTypeCode}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center"
                      >
                        <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                          {vt.vehicleTypeName}
                        </div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                          {vt.occupied}/{vt.capacity}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          {vt.available} libres
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {p.expiringSubscriptionsCount > 0 && (
                  <div className="col-span-2 bg-red-50 p-2.5 rounded-lg flex items-center justify-between text-red-800 border border-red-100">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      ⚠️ Mensualidades por vencer
                    </span>
                    <span className="bg-red-200 text-red-900 text-xs font-bold px-2 py-0.5 rounded-full">
                      {p.expiringSubscriptionsCount}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleEnter(p.id)}
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm transition-colors ${
                  Number(user?.parkingId) === Number(p.id)
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {Number(user?.parkingId) === Number(p.id)
                  ? 'Continuar en esta Sede (Actual)'
                  : 'Cambiar a esta Sede'}
              </button>
            </div>
          </div>
        ))}

        {parkings.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
            No tienes sedes asignadas.
          </div>
        )}
      </main>
    </div>
  );
}
