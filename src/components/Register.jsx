import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    parkingName: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: contextLogin } = useAuth(); // If create returns token, maybe auto-login? 
  // Wait, my contextLogin takes username/pass and calls API. Register returns { access_token, user }.
  // I should update context manually or just redirect to login. Redirect to login is safer/simpler.
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post('/api/auth/register', {
        username: formData.username,
        password: formData.password,
        parkingName: formData.parkingName,
        address: formData.address
      });
      toast.success('Registro exitoso. Inicia sesión.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Crear Cuenta</h2>
        <p className="text-center text-gray-500 mb-8">Registra tu parqueadero y comienza a gestionar</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de Usuario</label>
            <input 
              type="text" 
              name="username" 
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Parqueadero</label>
            <input 
              type="text" 
              name="parkingName" 
              required
              placeholder="Ej: Parqueadero Central"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={formData.parkingName}
              onChange={handleChange}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-gray-700">Dirección (Opcional)</label>
            <input 
              type="text" 
              name="address" 
              placeholder="Ej: Calle 123"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <input 
                type="password" 
                name="password" 
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                value={formData.password}
                onChange={handleChange}
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar</label>
                <input 
                type="password" 
                name="confirmPassword" 
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                value={formData.confirmPassword}
                onChange={handleChange}
                />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-6"
          >
            {loading ? 'Registrando...' : 'Registrar Parqueadero'}
          </button>
        </form>

        <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500">
                ¿Ya tienes cuenta? Inicia sesión aquí
            </Link>
        </div>
      </div>
    </div>
  );
}