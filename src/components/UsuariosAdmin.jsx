import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const UserIconElement = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 19.125a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z"
    />
  </svg>
);

const TrashIconElement = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const KeyIconElement = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 5.25a3 3 0 1 1 1.526 2.622l-4.297 4.297a1.125 1.125 0 0 1-.797.33H9.75v2.25H7.5V17h-2.25v2.25H3v-3.439c0-.298.119-.584.33-.796l6.796-6.797a3 3 0 0 1 5.624-2.968Z"
    />
  </svg>
);

function UsuariosAdmin() {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [editParkingsModalOpen, setEditParkingsModalOpen] = useState(false);
  const [editTargetAdmin, setEditTargetAdmin] = useState(null);
  const [editSelectedParkingIds, setEditSelectedParkingIds] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canCreate = hasPermission('USERS', 'create');
  const canEdit = hasPermission('USERS', 'edit');
  const canDelete = hasPermission('USERS', 'delete');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    parkingIds: [],
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users');
      setUsers(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchParkings = async () => {
    try {
      const res = await axios.get('/api/parking');
      setParkings(res.data || []);
    } catch (error) {
      console.error('Error fetching parkings', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      if (isSuperAdmin) {
        fetchParkings();
      }
    }
  }, [user, user?.parkingId]);

  // Agrupamos únicamente las sedes activas de Razones Sociales activas
  const parkingsByCompany = useMemo(() => {
    const groups = {};
    for (const p of parkings) {
      if (p.isActive === false || p.companyIsActive === false) continue;
      const key = p.companyId || '0';
      if (!groups[key]) {
        groups[key] = {
          companyId: p.companyId,
          companyName: p.companyName || 'Sin Razón Social',
          taxId: p.taxId || '',
          items: [],
        };
      }
      groups[key].items.push(p);
    }
    return Object.values(groups);
  }, [parkings]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleParkingCheck = (pid) => {
    const idNum = Number(pid);
    setFormData((prev) => {
      const exists = prev.parkingIds.includes(idNum);
      const next = exists
        ? prev.parkingIds.filter((x) => x !== idNum)
        : [...prev.parkingIds, idNum];
      return {
        ...prev,
        parkingIds: next,
      };
    });
  };

  const handleToggleCompanyGroupCreate = (companyItems) => {
    const ids = companyItems.map((p) => Number(p.id));
    setFormData((prev) => {
      const allSelected = ids.every((id) => prev.parkingIds.includes(id));
      const next = allSelected
        ? prev.parkingIds.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev.parkingIds, ...ids]));
      return {
        ...prev,
        parkingIds: next,
      };
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error('Usuario y contraseña son obligatorios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (isSuperAdmin && formData.parkingIds.length === 0) {
      toast.error('Debe asignar al menos una sede al Administrador');
      return;
    }

    try {
      const payload = {
        username: formData.username.trim(),
        password: formData.password,
        role: isSuperAdmin ? 'ADMIN' : 'CASHIER',
      };

      if (isSuperAdmin) {
        payload.parkingIds = formData.parkingIds.map((id) => Number(id));
        payload.parkingId = payload.parkingIds[0];
      }

      await axios.post('/api/users', payload);

      setFormData({
        username: '',
        password: '',
        parkingIds: [],
      });
      toast.success(
        isSuperAdmin
          ? 'Administrador creado exitosamente'
          : 'Cajero creado exitosamente',
      );
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleToggleActive = async (targetUser) => {
    if (!canEdit) return;
    try {
      await axios.patch(`/api/users/${targetUser.id}/status`, {
        isActive: !targetUser.isActive,
      });
      toast.success(
        `Usuario ${!targetUser.isActive ? 'activado' : 'desactivado'} correctamente`,
      );
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!canDelete) return;
    const confirm = await Swal.fire({
      title: '¿Eliminar Usuario?',
      text: 'Si el usuario posee historial operativo, será desactivado automáticamente para conservar la auditoría.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.delete(`/api/users/${id}`);
      toast.success(res.data?.message || 'Usuario eliminado');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const openEditParkingsModal = (targetAdmin) => {
    setEditTargetAdmin(targetAdmin);
    setEditSelectedParkingIds(
      (targetAdmin.managedParkings || []).map((mp) => Number(mp.id)),
    );
    setEditParkingsModalOpen(true);
  };

  const handleToggleEditParking = (pid) => {
    const idNum = Number(pid);
    setEditSelectedParkingIds((prev) =>
      prev.includes(idNum) ? prev.filter((x) => x !== idNum) : [...prev, idNum],
    );
  };

  const handleToggleCompanyGroupEdit = (companyItems) => {
    const ids = companyItems.map((p) => Number(p.id));
    setEditSelectedParkingIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      return allSelected
        ? prev.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids]));
    });
  };

  const handleSaveAdminParkings = async () => {
    if (!editTargetAdmin) return;
    if (editSelectedParkingIds.length === 0) {
      toast.error('El Administrador debe tener al menos una sede asignada');
      return;
    }
    try {
      setEditSaving(true);
      await axios.put(`/api/users/${editTargetAdmin.id}`, {
        parkingIds: editSelectedParkingIds,
        parkingId: editSelectedParkingIds[0],
      });
      toast.success('Sedes del Administrador actualizadas');
      setEditParkingsModalOpen(false);
      setEditTargetAdmin(null);
      fetchUsers();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Error actualizando sedes del Administrador',
      );
    } finally {
      setEditSaving(false);
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
      await axios.post(`/api/users/${resetTargetUser.id}/reset-password`, {
        newPassword: resetPassword,
      });
      toast.success('Contraseña restablecida. Se solicitará cambio al próximo ingreso.');
      closeResetModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No fue posible restablecer contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <div className="p-8">Cargando usuarios...</div>;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {isSuperAdmin
              ? 'Gestión de Administradores (Por Razón Social o por Sede)'
              : 'Gestión de Usuarios (Cajeros de mi Sede)'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'Puede asignar un solo Administrador a todas las sedes de una Razón Social, o un Administrador individual por cada sede.'
              : 'Administre los cajeros operativos (CASHIER) asignados a su parqueadero actual.'}
          </p>
        </div>
      </div>

      {canCreate && (
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-base font-bold mb-4 text-slate-700 flex items-center gap-2">
            <UserIconElement className="w-5 h-5" />
            {isSuperAdmin
              ? 'Registrar Nuevo Administrador (ADMIN)'
              : 'Registrar Nuevo Cajero (CASHIER)'}
          </h3>
          <form
            onSubmit={handleCreateUser}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <div className="w-full">
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nombre de Usuario
              </label>
              <input
                name="username"
                type="text"
                className="w-full border border-slate-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={isSuperAdmin ? 'Ej: ADMIN.METROPOLITANO' : 'Ej: CAJERO.TURNO1'}
              />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Contraseña Temporal
              </label>
              <input
                name="password"
                type="password"
                className="w-full border border-slate-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Rol Asignado
              </label>
              <input
                type="text"
                disabled
                value={
                  isSuperAdmin
                    ? 'Administrador de Sede (ADMIN)'
                    : 'Cajero Operativo (CASHIER)'
                }
                className="w-full border border-slate-200 bg-slate-100 text-slate-600 font-semibold text-sm rounded-lg p-2.5 cursor-not-allowed"
              />
            </div>

            {isSuperAdmin && (
              <div className="w-full md:col-span-3 mt-1 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Asignación de Sedes por Razón Social (Seleccione 1 sede o todas las sedes de la empresa)
                  </label>
                  <span className="text-xs font-bold text-blue-700">
                    {formData.parkingIds.length} sede(s) seleccionada(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parkingsByCompany.map((group) => {
                    const allChecked = group.items.every((p) =>
                      formData.parkingIds.includes(Number(p.id)),
                    );
                    return (
                      <div
                        key={group.companyId}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                          <div>
                            <div className="text-xs font-extrabold text-slate-800">
                              🏛️ {group.companyName}
                            </div>
                            {group.taxId && (
                              <div className="text-[11px] font-mono text-slate-400">
                                NIT: {group.taxId}
                              </div>
                            )}
                          </div>
                          {group.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCompanyGroupCreate(group.items)
                              }
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                            >
                              {allChecked
                                ? 'Desmarcar todas'
                                : 'Todas las sedes'}
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {group.items.map((p) => {
                            const checked = formData.parkingIds.includes(
                              Number(p.id),
                            );
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${
                                  checked
                                    ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleParkingCheck(p.id)}
                                  className="sr-only"
                                />
                                <span>{checked ? '✓' : '📍'}</span>
                                <span>{p.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="w-full md:col-span-3 flex justify-end pt-1">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-xs transition-colors flex items-center gap-2"
              >
                <UserIconElement className="w-5 h-5" />
                {isSuperAdmin ? 'Crear Administrador' : 'Crear Cajero'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left font-bold">ID</th>
              <th className="px-5 py-3 text-left font-bold">Usuario</th>
              <th className="px-5 py-3 text-left font-bold">Rol</th>
              <th className="px-5 py-3 text-left font-bold">
                Razón Social / Sedes Asignadas
              </th>
              <th className="px-5 py-3 text-center font-bold">Estado</th>
              <th className="px-5 py-3 text-right font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500">
                  #{u.id}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900">
                  {u.username}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span
                    className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {u.roleName || u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">
                  {u.managedParkings && u.managedParkings.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {u.managedParkings.map((mp) => (
                        <span
                          key={mp.id}
                          className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1"
                        >
                          {mp.companyName && (
                            <span className="text-slate-400 font-medium">
                              {mp.companyName}:
                            </span>
                          )}
                          <strong className="font-semibold">{mp.name}</strong>
                        </span>
                      ))}
                      {isSuperAdmin && canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditParkingsModal(u)}
                          className="ml-1 text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                        >
                          Editar sedes
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">
                      Sin sede asignada
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                  <button
                    disabled={!canEdit || user.id === u.id}
                    onClick={() => handleToggleActive(u)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                      u.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                    title="Clic para activar/desactivar"
                  >
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-right font-medium">
                  {canEdit && user.id !== u.id && (
                    <button
                      onClick={() => openResetModal(u)}
                      className="text-amber-700 hover:text-amber-900 bg-amber-50 p-2 rounded-lg hover:bg-amber-100 transition-colors mr-1.5"
                      title="Restablecer contraseña"
                    >
                      <KeyIconElement className="w-4 h-4" />
                    </button>
                  )}

                  {canDelete && user.id !== u.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                      title="Eliminar usuario"
                    >
                      <TrashIconElement className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                  {isSuperAdmin
                    ? 'No hay Administradores registrados en el sistema.'
                    : 'No hay Cajeros registrados asociados a esta sede.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Editar Sedes de un ADMIN agrupadas por Razón Social */}
      {editParkingsModalOpen && editTargetAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                Sedes Asignadas al Administrador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Administrador:{' '}
                <span className="font-bold text-slate-800">
                  {editTargetAdmin.username}
                </span>
              </p>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {parkingsByCompany.map((group) => {
                const allChecked = group.items.every((p) =>
                  editSelectedParkingIds.includes(Number(p.id)),
                );
                return (
                  <div
                    key={group.companyId}
                    className="border border-slate-200 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="text-xs font-extrabold text-slate-800">
                          🏛️ {group.companyName}
                        </div>
                        {group.taxId && (
                          <div className="text-[11px] font-mono text-slate-400">
                            NIT: {group.taxId}
                          </div>
                        )}
                      </div>
                      {group.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleToggleCompanyGroupEdit(group.items)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded"
                        >
                          {allChecked ? 'Desmarcar todas' : 'Seleccionar todas'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((p) => {
                        const checked = editSelectedParkingIds.includes(
                          Number(p.id),
                        );
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs ${
                              checked
                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div>
                              <div>📍 {p.name}</div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                {p.address}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleEditParking(p.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditParkingsModalOpen(false);
                  setEditTargetAdmin(null);
                }}
                disabled={editSaving}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAdminParkings}
                disabled={editSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
              >
                {editSaving ? 'Guardando...' : 'Guardar Sedes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                Restablecer contraseña
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Usuario:{' '}
                <span className="font-semibold text-slate-700">
                  {resetTargetUser?.username}
                </span>
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña temporal
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Repita la contraseña"
                />
              </div>

              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-2.5">
                El usuario deberá cambiar esta contraseña en su próximo inicio de
                sesión.
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
