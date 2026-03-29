import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [user, setUserInput] = useState('');
  const [pass, setPassInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simular un pequeño delay para mejor UX
    setTimeout(async () => {
      const result = await login(user, pass);
      setLoading(false);
      if (result.success) {
        if (result.mustChangePassword) {
          toast('Debes cambiar tu contraseña antes de continuar', { icon: '🔐' });
          navigate('/change-password');
          return;
        }
        toast.success('¡Bienvenido de nuevo!');
        navigate('/dashboard');
      } else {
        toast.error('Usuario o contraseña incorrectos');
      }
    }, 500);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=2000&auto=format&fit=crop')" }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div className="relative z-10 w-full max-w-md p-6 md:p-8 bg-white/95 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20">
        <div className="text-center mb-6 md:mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">Parqueadero App</h1>
          <p className="text-gray-500 mt-2 text-sm">Sistema de Gestión Vehicular</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Usuario</label>
            <input 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Ingresa tu usuario"
              value={user}
              autoFocus
              onChange={e => setUserInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Contraseña</label>
            <input 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              type="password" 
              placeholder="••••••••"
              value={pass}
              onChange={e => setPassInput(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-lg text-white font-semibold text-lg transition-all shadow-md transform active:scale-[0.98] 
              ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg'}
            `}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="mt-8 text-center text-xs text-gray-400 border-t pt-6">
          © 2026 Parking Systems Inc.
        </p>
      </div>
    </div>
  );
}