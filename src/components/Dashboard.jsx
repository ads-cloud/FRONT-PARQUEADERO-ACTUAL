import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  CASHIER: 'Cajero',
};

const SECTION_LABELS = {
  MAIN: null,
  OPERATION: 'Operación',
  ADMINISTRATION: 'Administración',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [parkingName, setParkingName] = useState('Cargando...');

  useEffect(() => {
    if (!user?.parkingId) {
      setParkingName('Sin Sede Seleccionada');
      return;
    }
    axios
      .get('/api/parking/me')
      .then((res) => setParkingName(res.data?.name || 'Mi Parqueadero'))
      .catch(() => setParkingName('Mi Parqueadero'));
  }, [user?.parkingId]);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path
      ? 'bg-blue-600 shadow-lg translate-x-1 pl-4 text-white'
      : 'hover:bg-slate-700 text-slate-300 hover:text-white hover:pl-4';
  };

  const visiblePermissions = (user?.permissions || []).filter((p) => p.canView);

  const groupedBySection = visiblePermissions.reduce((acc, perm) => {
    const sec = perm.section || 'OPERATION';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(perm);
    return acc;
  }, {});

  const currentModule = (user?.permissions || []).find(
    (p) => p.route === location.pathname,
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-blue-400">
                🚗 {parkingName}
              </h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                {user?.username} ({user?.roleName || ROLE_LABELS[user?.role] || user?.role})
              </p>
              {(user?.role === 'SUPER_ADMIN' ||
                (user?.managedParkings && user?.managedParkings.length > 1)) && (
                <Link
                  to="/admin-panel"
                  className="block text-xs text-blue-300 hover:text-white mt-2 underline"
                >
                  &larr; Cambiar Parqueadero
                </Link>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {['MAIN', 'OPERATION', 'ADMINISTRATION'].map((sectionKey, idx) => {
            const items = groupedBySection[sectionKey] || [];
            if (items.length === 0) return null;

            return (
              <div
                key={sectionKey}
                className={
                  idx > 0 && SECTION_LABELS[sectionKey]
                    ? 'pt-4 mt-4 border-t border-slate-700 space-y-1'
                    : 'space-y-1'
                }
              >
                {SECTION_LABELS[sectionKey] && (
                  <p className="text-xs font-bold text-slate-500 uppercase px-3 mb-2">
                    {SECTION_LABELS[sectionKey]}
                  </p>
                )}
                {items.map((item) => (
                  <Link
                    key={item.moduleCode}
                    to={item.route}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive(item.route)}`}
                  >
                    <span className="text-xl">{item.icon || '📦'}</span>
                    <span className="font-medium">{item.moduleName}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg text-white">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">
                {user?.username || 'Usuario'}
              </p>
              <p className="text-xs text-slate-400">
                {user?.roleName || ROLE_LABELS[user?.role] || user?.role || 'Operador'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-lg transition-colors text-sm font-semibold shadow-md"
          >
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-50">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center px-4 md:px-8 shrink-0 z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 md:hidden focus:outline-none"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <h2 className="text-lg md:text-xl font-bold text-gray-700 truncate">
              {currentModule?.moduleName || 'Panel de Control'}
            </h2>
          </div>

          <div className="text-sm text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
