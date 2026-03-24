import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function HomeStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
      income: { total: 0, byType: {} }, 
      occupancy: { total: 0, byType: {} } 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [incomeRes, occupancyRes] = await Promise.all([
          axios.get('/api/tickets/stats/income'),
          axios.get('/api/tickets/stats/occupancy')
        ]);
        
        setStats({
          income: incomeRes.data,
          occupancy: occupancyRes.data
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchStats();
    }
  }, [user]);

  if (loading) {
      return <div className="p-8 text-center text-gray-500">Cargando estadísticas...</div>;
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const renderBreakdown = (byType, isCurrency = false) => {
    if (!byType || Object.keys(byType).length === 0) return <p className="text-xs text-gray-400 mt-2">Sin datos detallados</p>;
    
    return (
        <div className="mt-3 space-y-1">
            {Object.entries(byType).map(([type, value]) => (
                <div key={type} className="flex justify-between text-xs text-gray-600">
                    <span className="capitalize font-medium">{type.toLowerCase()}s:</span>
                    <span>{isCurrency ? `$${value.toLocaleString('es-CO')}` : value}</span>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="space-y-6">
       <div className={`grid grid-cols-1 md:grid-cols-2 ${stats.income.expiringCount > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
          
          {/* 1. Card Mensualidades Vencimiento (Si existe) */}
          {(stats.income.expiringCount > 0) && (
            <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100 flex flex-col justify-between">
                <div className="flex items-start justify-between w-full">
                    <div>
                        <p className="text-sm font-bold text-red-600 mb-1 uppercase tracking-wider">⚠️ Atención Requerida</p>
                        <h3 className="text-3xl font-bold text-red-900">
                            {stats.income.expiringCount}
                        </h3>
                        <p className="text-sm text-red-700 mt-1">Mensualidades vencidas o por vencer</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full text-red-600 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                </div>
                 <div className="mt-auto pt-4">
                     <a href="/dashboard/mensualidades" className="text-xs font-bold text-red-800 hover:text-red-950 underline flex items-center gap-1">
                        Gestionar Mensualidades &rarr;
                     </a>
                </div>
            </div>
          )}

          {/* 2. Card Ocupación */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-center gap-6 w-full">
                  <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-1">Vehículos en Parqueadero</p>
                      <h3 className="text-3xl font-bold text-indigo-900">
                        {stats.occupancy.total}
                      </h3>
                      <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Activos ahora
                      </p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                  </div>
              </div>
              {renderBreakdown(stats.occupancy.byType)}
          </div>

          {/* 3. Card Ingresos */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between w-full">
                  <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Ingresos de Hoy</p>
                      <h3 className="text-3xl font-bold text-gray-800">
                        ${stats.income.total.toLocaleString('es-CO')}
                      </h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </div>
              </div>
              {renderBreakdown(stats.income.byType, true)}
          </div>
       </div>

       {isSuperAdmin && (
           <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
               <h4 className="text-blue-800 font-bold mb-2">Panel de Super Administrador</h4>
               <p className="text-blue-600 text-sm">
                   Desde aquí puedes gestionar la infraestructura global de parqueadeross.
                   Selecciona "Parqueaderos" en el menú lateral para administrar las sedes.
               </p>
           </div>
       )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!isSuperAdmin && (
                    <>
                        <a href="/dashboard/entrada" className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                            <span className="block text-2xl mb-2">🎟️</span>
                            <span className="font-semibold text-gray-700">Registrar Entrada</span>
                        </a>
                        <a href="/dashboard/salida" className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                            <span className="block text-2xl mb-2">💰</span>
                            <span className="font-semibold text-gray-700">Registrar Salida</span>
                        </a>
                    </>
                )}
                {user.role === 'ADMIN' && (
                     <a href="/dashboard/tarifas" className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                        <span className="block text-2xl mb-2">⚙️</span>
                        <span className="font-semibold text-gray-700">Gestionar Tarifas</span>
                    </a>
                )}
                 {user.role === 'SUPER_ADMIN' && (
                     <a href="/dashboard/admin-parking" className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                        <span className="block text-2xl mb-2">🏢</span>
                        <span className="font-semibold text-gray-700">Gestionar Parqueaderos</span>
                    </a>
                )}
            </div>
        </div>
    </div>
  );
}