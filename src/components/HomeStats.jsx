import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomeStats() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    income: { total: 0, byType: {}, expiringCount: 0 },
    occupancy: { total: 0, totalCapacity: 100, byType: {} },
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
  const quickModules = (user?.permissions || []).filter(
    (p) => p.canView && p.moduleCode !== 'DASHBOARD',
  );

  const renderBreakdown = (byType, isCurrency = false) => {
    if (!byType || Object.keys(byType).length === 0)
      return <p className="text-xs text-gray-400 mt-2">Sin movimientos hoy</p>;

    return (
      <div className="mt-3 space-y-1">
        {Object.entries(byType).map(([type, value]) => (
          <div key={type} className="flex justify-between text-xs text-gray-600">
            <span className="font-medium">{type}:</span>
            <span>
              {isCurrency ? `$${Number(value).toLocaleString('es-CO')}` : value}
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
        className={`grid grid-cols-1 md:grid-cols-2 ${stats.income.expiringCount > 0 && hasPermission('SUBSCRIPTIONS', 'view') ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}
      >
        {stats.income.expiringCount > 0 && hasPermission('SUBSCRIPTIONS', 'view') && (
          <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100 flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div>
                <p className="text-sm font-bold text-red-600 mb-1 uppercase tracking-wider">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-6 w-full">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Ocupación del Parqueadero
              </p>
              <h3 className="text-3xl font-bold text-indigo-900">
                {stats.occupancy.total}{' '}
                <span className="text-base font-normal text-gray-400">
                  / {stats.occupancy.totalCapacity || 100} cupos ({occupancyPct}%)
                </span>
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${occupancyPct > 85 ? 'bg-red-500' : 'bg-indigo-600'}`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </div>
          </div>
          {renderBreakdown(stats.occupancy.byType)}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between w-full">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                Ingresos de Hoy (Tickets + Mensualidades)
              </p>
              <h3 className="text-3xl font-bold text-gray-800">
                ${Number(stats.income.total || 0).toLocaleString('es-CO')}
              </h3>
            </div>
          </div>
          {renderBreakdown(stats.income.byType, true)}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="text-blue-800 font-bold mb-1">
              Modo Super Administrador Multi-Tenant
            </h4>
            <p className="text-blue-600 text-sm">
              Gestión global de sedes, usuarios, reportes y permisos por rol.
            </p>
          </div>
          <Link
            to="/admin-panel"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0 shadow-sm"
          >
            Ver Todas las Sedes
          </Link>
        </div>
      )}

      {quickModules.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-4">
            Módulos Habilitados para tu Rol
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickModules.map((mod) => (
              <Link
                key={mod.moduleCode}
                to={mod.route}
                className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="block text-2xl mb-2">{mod.icon || '📦'}</span>
                <span className="font-semibold text-gray-700 block">
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
