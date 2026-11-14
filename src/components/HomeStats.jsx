import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TYPE_ICONS = {
  CAR: '🚗',
  MOTORCYCLE: '🏍️',
  BICYCLE: '🚲',
};

export default function HomeStats() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    income: { total: 0, byType: {}, expiringCount: 0 },
    occupancy: { total: 0, totalCapacity: 100, byType: {}, byVehicleType: [] },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [incomeRes, occupancyRes] = await Promise.all([
          axios.get('/api/tickets/stats/income'),
          axios.get('/api/tickets/stats/occupancy'),
        ]);

        setStats({
          income: incomeRes.data,
          occupancy: occupancyRes.data,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, user?.parkingId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Cargando estadísticas...</div>
    );
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const quickModules = (user?.permissions || []).filter(
    (p) =>
      p.canView &&
      p.moduleCode !== 'DASHBOARD' &&
      !(isAdminOrSuper && p.moduleCode === 'CASH_CLOSING'),
  );

  const renderIncomeBreakdown = (byType) => {
    if (!byType || Object.keys(byType).length === 0)
      return <p className="text-xs text-gray-400 mt-2">Sin movimientos hoy</p>;

    return (
      <div className="mt-3 space-y-1.5">
        {Object.entries(byType).map(([type, value]) => (
          <div key={type} className="flex justify-between text-xs text-gray-600">
            <span className="font-medium">{type}:</span>
            <span className="font-bold text-gray-800">
              ${Number(value).toLocaleString('es-CO')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const occupancyPct = Math.min(
    100,
    Math.round(
      (Number(stats.occupancy.total || 0) /
        Math.max(1, Number(stats.occupancy.totalCapacity || 100))) *
        100,
    ),
  );

  return (
    <div className="space-y-6">
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          stats.income.expiringCount > 0 && hasPermission('SUBSCRIPTIONS', 'view')
            ? 'lg:grid-cols-3'
            : 'lg:grid-cols-2'
        } gap-5`}
      >
        {stats.income.expiringCount > 0 &&
          hasPermission('SUBSCRIPTIONS', 'view') && (
            <div className="bg-red-50 p-5 rounded-xl shadow-xs border border-red-100 flex flex-col justify-between">
              <div className="flex items-start justify-between w-full">
                <div>
                  <p className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">
                    ⚠️ Atención Requerida
                  </p>
                  <h3 className="text-3xl font-bold text-red-900">
                    {stats.income.expiringCount}
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Mensualidades vencidas o próximas a vencer
                  </p>
                </div>
              </div>
              <div className="mt-auto pt-4">
                <Link
                  to="/dashboard/mensualidades"
                  className="text-xs font-bold text-red-800 hover:text-red-950 underline flex items-center gap-1"
                >
                  Gestionar Mensualidades &rarr;
                </Link>
              </div>
            </div>
          )}

        {/* Ocupación Independiente por Tipo de Vehículo */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ocupación Total Sede
              </p>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {occupancyPct}% ocupado
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {stats.occupancy.total}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {stats.occupancy.totalCapacity || 100} cupos totales
              </span>
            </h3>

            {/* Desglose de campos independientes por tipo de vehículo */}
            <div className="mt-4 space-y-2.5">
              {(stats.occupancy.byVehicleType || []).map((vt) => {
                const pct =
                  vt.capacity > 0
                    ? Math.min(100, Math.round((vt.occupied / vt.capacity) * 100))
                    : 0;
                return (
                  <div
                    key={vt.code}
                    className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span>{TYPE_ICONS[vt.code] || '🚗'}</span>
                        <span>{vt.name}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {vt.occupied} / {vt.capacity} ocupados
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            vt.available === 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {vt.available} libres
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          pct >= 90
                            ? 'bg-red-500'
                            : pct >= 70
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ingresos de Hoy */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Ingresos de Hoy (Tickets + Mensualidades)
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-700">
              ${Number(stats.income.total || 0).toLocaleString('es-CO')}
            </h3>
            {renderIncomeBreakdown(stats.income.byType)}
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="text-blue-800 font-bold mb-0.5">
              Modo Super Administrador Multi-Tenant
            </h4>
            <p className="text-blue-600 text-xs sm:text-sm">
              Gestión global de Razones Sociales, sedes, cupos independientes por
              vehículo, administradores y permisos por rol.
            </p>
          </div>
          <Link
            to="/admin-panel"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg shrink-0 shadow-xs"
          >
            Ver Todas las Sedes
          </Link>
        </div>
      )}

      {quickModules.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            Módulos Habilitados para tu Rol
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickModules.map((mod) => (
              <Link
                key={mod.moduleCode}
                to={mod.route}
                className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors"
              >
                <span className="text-2xl">{mod.icon || '📦'}</span>
                <span className="font-bold text-sm text-slate-700">
                  {mod.moduleName}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
