import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import TicketEntry from './TicketEntry';
import TicketExit from './TicketExit';

const TYPE_ICONS = {
  CAR: '🚗',
  MOTORCYCLE: '🏍️',
  BICYCLE: '🚲',
};

export default function TicketOperations() {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const canViewEntry = hasPermission('TICKET_ENTRY', 'view');
  const canViewExit = hasPermission('TICKET_EXIT', 'view');

  const isExitRoute = location.pathname.includes('/salida');
  const activeTab =
    isExitRoute && canViewExit ? 'EXIT' : canViewEntry ? 'ENTRY' : 'EXIT';

  const [occupancy, setOccupancy] = useState({
    total: 0,
    totalCapacity: 100,
    byVehicleType: [],
  });

  const fetchOccupancy = useCallback(async () => {
    try {
      const res = await axios.get('/api/tickets/stats/occupancy');
      if (res.data) {
        setOccupancy({
          total: Number(res.data.total || 0),
          totalCapacity: Number(res.data.totalCapacity || 100),
          byVehicleType: res.data.byVehicleType || [],
        });
      }
    } catch {
      // Ignore if dashboard stats permission is not enabled
    }
  }, []);

  useEffect(() => {
    if (user?.parkingId) {
      fetchOccupancy();
    }
  }, [user?.parkingId, activeTab, fetchOccupancy]);

  const handleSelectTab = useCallback(
    (tab) => {
      if (tab === 'ENTRY' && canViewEntry) {
        navigate('/dashboard/entrada');
      } else if (tab === 'EXIT' && canViewExit) {
        navigate('/dashboard/salida');
      }
    },
    [canViewEntry, canViewExit, navigate],
  );

  // Atajos rápidos Alt+1 (Entrada) y Alt+2 (Salida)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === '1' && canViewEntry) {
        e.preventDefault();
        handleSelectTab('ENTRY');
      } else if (e.altKey && e.key === '2' && canViewExit) {
        e.preventDefault();
        handleSelectTab('EXIT');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canViewEntry, canViewExit, handleSelectTab]);

  return (
    <div className="space-y-4">
      {/* Barra Compacta de Pestañas (Entrada / Salida) + Cupos Independientes por Vehículo */}
      <div className="bg-white px-3 py-2 rounded-xl shadow-xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1">
          {canViewEntry && (
            <button
              type="button"
              onClick={() => handleSelectTab('ENTRY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'ENTRY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <span>🎟️</span>
              <span>Registrar Entrada</span>
              <span
                className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  activeTab === 'ENTRY'
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                Alt+1
              </span>
            </button>
          )}

          {canViewExit && (
            <button
              type="button"
              onClick={() => handleSelectTab('EXIT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'EXIT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <span>💰</span>
              <span>Registrar Salida / Cobro</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'EXIT'
                    ? 'bg-white text-emerald-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {occupancy.total} activos
              </span>
              <span
                className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  activeTab === 'EXIT'
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                Alt+2
              </span>
            </button>
          )}
        </div>

        {/* Indicadores de Cupos Independientes por Tipo de Vehículo */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(occupancy.byVehicleType || []).map((vt) => (
            <div
              key={vt.code}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                vt.available === 0
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>{TYPE_ICONS[vt.code] || '🚗'}</span>
              <span className="font-semibold">{vt.name}:</span>
              <strong className="font-mono">
                {vt.available} libres
              </strong>
              <span className="text-[11px] text-slate-400">
                ({vt.occupied}/{vt.capacity})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === 'ENTRY' ? (
        <TicketEntry
          occupancyByType={occupancy.byVehicleType || []}
          onTicketCreated={() => fetchOccupancy()}
        />
      ) : (
        <TicketExit onActiveCountChange={() => fetchOccupancy()} />
      )}
    </div>
  );
}

