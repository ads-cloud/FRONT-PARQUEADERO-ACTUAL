import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const UserIconElement = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 19.125a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" />
  </svg>
);

const TrashIconElement = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const KeyIconElement = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 1 1 1.526 2.622l-4.297 4.297a1.125 1.125 0 0 1-.797.33H9.75v2.25H7.5V17h-2.25v2.25H3v-3.439c0-.298.119-.584.33-.796l6.796-6.797a3 3 0 0 1 5.624-2.968Z" />
  </svg>
);

function UsuariosAdmin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [parkings, setParkings] = useState([]); // For Super Admin
  const [loading, setLoading] = useState(true);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
      username: '',
      password: '',
      role: 'CAJERO',
      parkingId: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      toast.error("Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchParkings = async () => {
      try {
          const res = await axios.get('/api/parking');
          setParkings(res.data);
      } catch (error) {
          console.error("Error fetching parkings", error);
      }
  };

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
        fetchUsers();
        if (user.role === 'SUPER_ADMIN') {
            fetchParkings();
        }
    } else {
        setLoading(false);
    }
  }, [user]);

  if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e) => {
      setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Usuario y contraseña son obligatorios');
      return;
    }

    if (user.role === 'SUPER_ADMIN' && !formData.parkingId) {
        toast.error('Debe seleccionar un parqueadero');
        return;
    }

    try {
      const payload = { 
          username: formData.username, 
          password: formData.password 
      };

      if (user.role === 'SUPER_ADMIN') {
          payload.role = formData.role;
          payload.parkingId = parseInt(formData.parkingId);
      }

      await axios.post('/api/users', payload);
      
      setFormData({ username: '', password: '', role: 'CAJERO', parkingId: '' });
      toast.success("Usuario creado exitosamente");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Seguro que desea eliminar este usuario?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      toast.success("Usuario eliminado");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const openResetModal = (targetUser) => {
    setResetTargetUser(targetUser);
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetModalOpen(true);
  };

  const closeResetModal = () => {
    setResetModalOpen(false);
    setResetTargetUser(null);
    setResetPassword('');
    setResetPasswordConfirm('');
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser) return;
    if (!resetPassword) {
      toast.error('Debe ingresar la nueva contraseña temporal');
      return;
    }
    if (resetPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast.error('La confirmación de contraseña no coincide');
      return;
    }

    try {
      setResetLoading(true);
      await axios.post(`/api/users/${resetTargetUser.id}/reset-password`, { newPassword: resetPassword });
      toast.success('Contraseña restablecida. Se solicitará cambio al próximo ingreso.');
      closeResetModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No fue posible restablecer contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <div className="p-8">Cargando usuarios...</div>;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-6xl mx-auto mt-6 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">
                {isSuperAdmin ? 'Gestión Global de Usuarios' : 'Gestión de Cajeros'}
            </h2>
            <p className="text-sm text-gray-500">
                {isSuperAdmin 
                    ? 'Cree Administradores o Cajeros y asigne parqueaderos.' 
                    : 'Administre los cajeros que operan en su parqueadero.'}
            </p>
        </div>
      </div>
      
      {/* Formulario de creación */}
      <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
            <UserIconElement className="w-5 h-5" />
            {isSuperAdmin ? 'Registrar Nuevo Usuario' : 'Registrar Nuevo Cajero'}
        </h3>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
            <input
              name="username"
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Ej: cajero1"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              name="password"
              type="password"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••"
            />
          </div>

          {isSuperAdmin && (
              <>
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="CAJERO">Cajero</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignar Parqueadero</label>
                    <select
                        name="parkingId"
                        value={formData.parkingId}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Seleccionar --</option>
                        {parkings.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({p.direccion})</option>
                        ))}
                    </select>
                </div>
              </>
          )}

          <div className="w-full md:col-span-2 lg:col-span-4 flex justify-end mt-2">
            <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
                <UserIconElement className="w-5 h-5" />
                Crear Usuario
            </button>
          </div>
        </form>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Parqueadero</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{u.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 
                        u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                        {u.role}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.parking ? u.parking.nombre : <span className="text-gray-400 italic">N/A</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {(user.id !== u.id && (isSuperAdmin || (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN'))) ? (
                    <button
                      onClick={() => openResetModal(u)}
                      className="text-amber-700 hover:text-amber-900 bg-amber-50 p-2 rounded-full hover:bg-amber-100 transition-colors mr-2"
                      title="Resetear contraseña"
                    >
                      <KeyIconElement className="w-5 h-5" />
                    </button>
                  ) : null}
                  {/* Prevent deleting yourself or Super Admin if not allowed */}
                  {(user.id !== u.id && u.role !== 'SUPER_ADMIN') || (user.id !== u.id && isSuperAdmin) ? (
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"
                        title="Eliminar usuario"
                      >
                        <TrashIconElement className="w-5 h-5" />
                      </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
                <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No hay usuarios registrados asociados a su cuenta.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Restablecer contraseña</h3>
              <p className="text-sm text-slate-500 mt-1">
                Usuario: <span className="font-semibold text-slate-700">{resetTargetUser?.username}</span>
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña temporal</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Repita la contraseña"
                />
              </div>

              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-2.5">
                El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.
              </p>
            </div>

            <div className="px-5 py-4 border-t bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResetModal}
                disabled={resetLoading}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className={`px-4 py-2 rounded-lg text-white font-medium ${resetLoading ? 'bg-amber-300' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {resetLoading ? 'Guardando...' : 'Restablecer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsuariosAdmin;