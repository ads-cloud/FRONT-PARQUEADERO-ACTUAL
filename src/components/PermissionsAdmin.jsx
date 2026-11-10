import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SECTION_LABELS = {
  MAIN: 'Panel Principal',
  OPERATION: 'Operación de Parqueadero',
  ADMINISTRATION: 'Administración y Gestión',
};

export default function PermissionsAdmin() {
  const { user, refreshProfile, hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [draftPermissions, setDraftPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEditPermissions = hasPermission('PERMISSIONS', 'edit');

  const fetchMatrix = async (keepRoleId = null) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/permissions/matrix');
      const { roles: rList, modules: mList, permissions: pList } = res.data;
      setRoles(rList || []);
      setModules(mList || []);

      const activeRoleId = keepRoleId || selectedRoleId || rList?.[0]?.id || null;
      setSelectedRoleId(activeRoleId);

      // Build map: { [roleId]: { [moduleId]: { canView, canCreate, canEdit, canDelete } } }
      const map = {};
      for (const role of rList || []) {
        map[role.id] = {};
        for (const mod of mList || []) {
          const found = (pList || []).find(
            (p) => p.roleId === role.id && p.moduleId === mod.id,
          );
          map[role.id][mod.id] = {
            moduleId: mod.id,
            canView: Boolean(found?.canView),
            canCreate: Boolean(found?.canCreate),
            canEdit: Boolean(found?.canEdit),
            canDelete: Boolean(found?.canDelete),
          };
        }
      }
      setDraftPermissions(map);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Error al cargar la matriz de permisos',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const handleToggle = (moduleId, field, modCode) => {
    if (!canEditPermissions || !selectedRoleId) return;

    // Prevent SUPER_ADMIN from disabling its own access to PERMISSIONS
    if (
      selectedRole?.code === 'SUPER_ADMIN' &&
      modCode === 'PERMISSIONS' &&
      (field === 'canView' || field === 'canEdit')
    ) {
      toast.error(
        'Por seguridad, SUPER_ADMIN no puede desactivar su acceso al módulo de Permisos',
      );
      return;
    }

    setDraftPermissions((prev) => {
      const rolePerms = { ...(prev[selectedRoleId] || {}) };
      const current = {
        ...(rolePerms[moduleId] || {
          moduleId,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        }),
      };

      const nextVal = !current[field];
      current[field] = nextVal;

      // If turning off canView, turn off CRUD actions too
      if (field === 'canView' && !nextVal) {
        current.canCreate = false;
        current.canEdit = false;
        current.canDelete = false;
      }

      // If turning on any CRUD action, automatically enable canView
      if (field !== 'canView' && nextVal) {
        current.canView = true;
      }

      rolePerms[moduleId] = current;
      return { ...prev, [selectedRoleId]: rolePerms };
    });
  };

  const handleToggleAllModule = (moduleId, modCode, enable) => {
    if (!canEditPermissions || !selectedRoleId) return;
    if (
      selectedRole?.code === 'SUPER_ADMIN' &&
      modCode === 'PERMISSIONS' &&
      !enable
    ) {
      toast.error(
        'Por seguridad, SUPER_ADMIN no puede revocar sus permisos sobre este módulo',
      );
      return;
    }

    setDraftPermissions((prev) => {
      const rolePerms = { ...(prev[selectedRoleId] || {}) };
      rolePerms[moduleId] = {
        moduleId,
        canView: enable,
        canCreate: enable,
        canEdit: enable,
        canDelete: enable,
      };
      return { ...prev, [selectedRoleId]: rolePerms };
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    try {
      setSaving(true);
      const rolePermsObj = draftPermissions[selectedRoleId] || {};
      const payload = {
        permissions: Object.values(rolePermsObj),
      };

      await axios.put(`/api/permissions/roles/${selectedRoleId}`, payload);
      toast.success(
        `Permisos actualizados para el rol ${selectedRole?.name || ''}`,
      );
      await fetchMatrix(selectedRoleId);
      if (user?.roleId === selectedRoleId || user?.role === selectedRole?.code) {
        await refreshProfile();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'No se pudieron guardar los permisos',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Cargando matriz de módulos y permisos desde base de datos...
      </div>
    );
  }

  const groupedModules = modules.reduce((acc, mod) => {
    const sec = mod.section || 'OPERATION';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(mod);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            🛡️ Control de Módulos y Permisos por Rol
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra en base de datos qué módulos ve cada perfil en el menú
            lateral y qué acciones puede ejecutar en la API.
          </p>
        </div>
        {canEditPermissions && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg shadow transition-colors shrink-0"
          >
            {saving ? 'Guardando...' : '💾 Guardar Cambios del Rol'}
          </button>
        )}
      </div>

      {/* Selector de Rol */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          const activeCount = Object.values(draftPermissions[role.id] || {}).filter(
            (p) => p.canView,
          ).length;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/60 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-gray-900 text-lg">
                  {role.name}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {activeCount} / {modules.length} módulos
                </span>
              </div>
              <p className="text-xs font-mono text-blue-700 mb-2">{role.code}</p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {role.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tabla de Permisos del Rol Seleccionado */}
      {selectedRole && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-lg">
                Configurando Rol: <span className="text-blue-300">{selectedRole.name}</span>
              </h3>
              <p className="text-xs text-slate-300">{selectedRole.description}</p>
            </div>
            <span className="text-xs bg-slate-700 px-3 py-1 rounded-full font-mono">
              Código: {selectedRole.code}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                <tr>
                  <th className="px-6 py-3">Módulo del Sistema</th>
                  <th className="px-4 py-3 text-center">Ver / Menú</th>
                  <th className="px-4 py-3 text-center">Crear / Registrar</th>
                  <th className="px-4 py-3 text-center">Editar / Renovar</th>
                  <th className="px-4 py-3 text-center">Eliminar / Anular</th>
                  <th className="px-4 py-3 text-right">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {['MAIN', 'OPERATION', 'ADMINISTRATION'].map((sectionKey) => {
                  const secModules = groupedModules[sectionKey] || [];
                  if (secModules.length === 0) return null;

                  return (
                    <React.Fragment key={sectionKey}>
                      <tr className="bg-slate-50/90">
                        <td
                          colSpan="6"
                          className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {SECTION_LABELS[sectionKey] || sectionKey}
                        </td>
                      </tr>
                      {secModules.map((mod) => {
                        const perm = draftPermissions[selectedRole.id]?.[mod.id] || {
                          canView: false,
                          canCreate: false,
                          canEdit: false,
                          canDelete: false,
                        };

                        return (
                          <tr
                            key={mod.id}
                            className={`transition-colors ${
                              perm.canView ? 'bg-white' : 'bg-gray-50/60 text-gray-400'
                            } hover:bg-blue-50/30`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{mod.icon || '📦'}</span>
                                <div>
                                  <div className="font-bold text-gray-800 flex items-center gap-2">
                                    <span>{mod.name}</span>
                                    <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                      {mod.route}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {['canView', 'canCreate', 'canEdit', 'canDelete'].map(
                              (field) => (
                                <td key={field} className="px-4 py-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(perm[field])}
                                    disabled={!canEditPermissions}
                                    onChange={() =>
                                      handleToggle(mod.id, field, mod.code)
                                    }
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                              ),
                            )}

                            <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={!canEditPermissions}
                                onClick={() =>
                                  handleToggleAllModule(mod.id, mod.code, true)
                                }
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded disabled:opacity-40"
                              >
                                Todo
                              </button>
                              <button
                                type="button"
                                disabled={!canEditPermissions}
                                onClick={() =>
                                  handleToggleAllModule(mod.id, mod.code, false)
                                }
                                className="text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded disabled:opacity-40"
                              >
                                Ninguno
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

