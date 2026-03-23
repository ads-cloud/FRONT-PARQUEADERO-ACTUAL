import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [parkingName, setParkingName] = useState('Cargando...');

  useEffect(() => {
    // Fetch parking info
    axios.get('/api/parking/me')
      .then(res => setParkingName(res.data.nombre))
      .catch(() => setParkingName('Mi Parqueadero'));
  }, []);

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
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-blue-400">
                🚗 {parkingName}
                </h1>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                {user?.username} ({user?.role})
                </p>
            </div>
            {/* Close button for mobile */}
            <button 
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-slate-400 hover:text-white"
            >
                ✕
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Dashboard Principal */}
          <Link 
            to="/dashboard" 
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard')}`}
          >
            <span className="text-xl">📊</span>
            <span className="font-medium">Panel Principal</span>
          </Link>

          {/* Registrar Entrada */}
          {user?.role !== 'SUPER_ADMIN' && (
            <Link 
              to="/dashboard/entrada" 
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard/entrada')}`}
            >
              <span className="text-xl">🎟️</span>
              <span className="font-medium">Registrar Entrada</span>
            </Link>
          )}

          {/* Registrar Salida */}
          {user?.role !== 'SUPER_ADMIN' && (
            <Link 
              to="/dashboard/salida" 
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard/salida')}`}
            >
               <span className="text-xl">💰</span>
               <span className="font-medium">Cobrar / Salida</span>
            </Link>
          )}

          {/* Cierre de Caja */}
          {user?.role !== 'SUPER_ADMIN' && (
             <Link 
                to="/dashboard/caja" 
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard/caja')}`}
              >
                <span className="text-xl">🧾</span>
                <span className="font-medium">Cierre de Caja</span>
              </Link>
          )}

          {/* --- Configurar Tarifas y Usuarios --- */}
          {user?.role && (user.role.toUpperCase() === 'ADMIN' || user.role.toUpperCase() === 'SUPER_ADMIN') && (
            <div className="pt-4 mt-4 border-t border-slate-700">
              <p className="text-xs font-bold text-slate-500 uppercase px-3 mb-2">Administración</p>
              
              {user.role === 'SUPER_ADMIN' ? (
                 <Link 
                    to="/dashboard/admin-parking" 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard/admin-parking')}`}
                  >
                    <span className="text-xl">🏢</span>
                    <span className="font-medium">Parqueaderos</span>
                  </Link>
              ) : (
                  <Link 
                    to="/dashboard/tarifas" 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard/tarifas')}`}
                  >
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium">Tarifas</span>
                  </Link>
              )}

              <Link 
                to="/dashboard/usuarios" 
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard/usuarios')}`}
              >
                <span className="text-xl">👥</span>
                <span className="font-medium">{user.role === 'SUPER_ADMIN' ? 'Usuarios' : 'Cajeros'}</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer Sidebar (Usuario) */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
           <div className="flex items-center space-x-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.username || 'Usuario'}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role || 'Operador'}</p>
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-50">
        {/* Header Superior */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center px-4 md:px-8 shrink-0 z-20 sticky top-0">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 md:hidden focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <h2 className="text-lg md:text-xl font-bold text-gray-700 truncate">
                {location.pathname === '/dashboard' && 'Resumen General'}
                {location.pathname === '/dashboard/entrada' && 'Nuevo Ingreso'}
                {location.pathname === '/dashboard/salida' && 'Proceso de Salida'}
                {location.pathname === '/dashboard/tarifas' && 'Gestión de Tarifas'}
                {location.pathname === '/dashboard/usuarios' && 'Gestión de Personal'}
              </h2>
            </div>
            
            <div className="text-sm text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </header>

        {/* Contenido Dinámico (Outlet) Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <Outlet />
        </div>
      </main>
    </div>
  );
}