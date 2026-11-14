import React, { useState, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  CASHIER: 'Cajero',
};

export default function Dashboard() {
  const { user, logout, switchParking } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [parkingName, setParkingName] = useState('Cargando...');
  const [switchingBranch, setSwitchingBranch] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isSuperAdmin) {
      setParkingName('Gestión Multi-Parqueadero');
      return;
    }
    if (!user?.parkingId) {
      setParkingName('Sin Sede Seleccionada');
      return;
    }
    axios
      .get('/api/parking/me')
      .then((res) => setParkingName(res.data?.name || 'Mi Parqueadero'))
      .catch(() => setParkingName('Mi Parqueadero'));
  }, [user?.parkingId, isSuperAdmin]);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const visiblePermissions = useMemo(
    () =>
      (user?.permissions || []).filter(
        (p) => p.canView && (!isSuperAdmin || p.moduleCode !== 'DASHBOARD'),
      ),
    [user?.permissions, isSuperAdmin],
  );

  // Unify TICKET_ENTRY and TICKET_EXIT into a single Top-Bar item ("Entradas / Salidas")
  const navItems = useMemo(() => {
    const hasEntry = visiblePermissions.some((p) => p.moduleCode === 'TICKET_ENTRY');
    const hasExit = visiblePermissions.some((p) => p.moduleCode === 'TICKET_EXIT');
    const items = [];
    let operationsAdded = false;

    for (const perm of visiblePermissions) {
      if (perm.moduleCode === 'TICKET_ENTRY' || perm.moduleCode === 'TICKET_EXIT') {
        if (!operationsAdded) {
          operationsAdded = true;
          items.push({
            moduleCode: 'TICKET_OPS',
            moduleName:
              hasEntry && hasExit
                ? 'Entradas y Salidas'
                : perm.moduleName,
            route: hasEntry ? '/dashboard/entrada' : '/dashboard/salida',
            matchRoutes: ['/dashboard/entrada', '/dashboard/salida'],
            icon: '🚘',
            section: 'OPERATION',
          });
        }
      } else if (perm.moduleCode === 'CASH_CLOSING' && user?.role === 'ADMIN') {
        items.push({
          ...perm,
          moduleName: 'Caja y Cierres',
          matchRoutes: [perm.route],
        });
      } else {
        items.push({
          ...perm,
          matchRoutes: [perm.route],
        });
      }
    }
    return items;
  }, [visiblePermissions]);

  const isRouteActive = (item) => {
    if (item.matchRoutes) {
      return item.matchRoutes.includes(location.pathname);
    }
    return location.pathname === item.route;
  };

  const canSwitchBranch =
    !isSuperAdmin &&
    user?.managedParkings &&
    user?.managedParkings.length > 1;

  const handleQuickSwitchBranch = async (e) => {
    const targetId = Number(e.target.value);
    if (!targetId || targetId === Number(user?.parkingId)) return;
    try {
      setSwitchingBranch(true);
      const ok = await switchParking(targetId);
      if (ok) {
        toast.success('Sede activa cambiada');
      } else {
        toast.error('No se pudo cambiar de sede');
      }
    } finally {
      setSwitchingBranch(false);
    }
  };

  const defaultHomeLink = isSuperAdmin ? '/dashboard/admin-parking' : '/dashboard';

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden">
      {/* BARRA SUPERIOR ÚNICA COMPACTA (Sin barra lateral duplicada) */}
      <header className="bg-slate-900 text-white shadow-md z-30 shrink-0 border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Izquierda: Identidad / Sede activa (o Panel Super Admin) */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <Link
              to={defaultHomeLink}
              className="flex items-center gap-2.5 group min-w-0"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-lg shadow-xs group-hover:bg-blue-500 transition-colors shrink-0">
                {isSuperAdmin ? '🏛️' : '🚗'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-white truncate max-w-[150px] sm:max-w-[210px]">
                    {isSuperAdmin ? 'Panel Super Admin' : parkingName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-none truncate">
                  {isSuperAdmin
                    ? 'Parqueaderos y Sedes'
                    : ROLE_LABELS[user?.role] || user?.roleName || user?.role}
                </p>
              </div>
            </Link>

            {canSwitchBranch && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <select
                  value={user?.parkingId || ''}
                  disabled={switchingBranch}
                  onChange={handleQuickSwitchBranch}
                  title="Cambiar rápidamente entre las sedes asignadas a su empresa"
                  className="bg-slate-800 hover:bg-slate-700 text-blue-200 border border-slate-700 rounded-md px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                >
                  {(user?.managedParkings || []).map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      📍 {mp.name}
                    </option>
                  ))}
                </select>
                <Link
                  to="/admin-panel"
                  title="Ver resumen comparativo de todas mis sedes"
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-2 py-1 rounded-md transition-colors"
                >
                  <span>Todas ({user.managedParkings.length})</span>
                </Link>
              </div>
            )}
          </div>

          {/* Centro: Navegación Horizontal de Módulos */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const active = isRouteActive(item);
              return (
                <Link
                  key={item.moduleCode}
                  to={item.route}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon || '📦'}</span>
                  <span>{item.moduleName}</span>
                </Link>
              );
            })}
          </nav>

          {/* Derecha: Usuario + Cerrar Sesión + Botón Móvil */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                {user?.username}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="bg-red-600/90 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Salir</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Abrir menú"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    mobileMenuOpen
                      ? 'M6 18L18 6M6 6l12 12'
                      : 'M4 6h16M4 12h16M4 18h16'
                  }
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Menú desplegable compacto en pantallas pequeñas / tablets */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-3 pt-2 pb-3 space-y-1">
            <div className="flex flex-wrap gap-1.5">
              {navItems.map((item) => {
                const active = isRouteActive(item);
                return (
                  <Link
                    key={item.moduleCode}
                    to={item.route}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{item.icon || '📦'}</span>
                    <span>{item.moduleName}</span>
                  </Link>
                );
              })}
            </div>
            {canSwitchBranch && (
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <Link
                  to="/admin-panel"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-blue-400 hover:underline"
                >
                  ⇄ Cambiar de Sede / Parqueadero
                </Link>
                <span className="text-xs text-slate-400">{user?.username}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ÁREA DE CONTENIDO A PANTALLA COMPLETA */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
