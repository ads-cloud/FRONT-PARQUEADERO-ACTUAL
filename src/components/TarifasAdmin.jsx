import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import {
  describeNomenclature,
  buildPlatePatternFromMode,
  getVehicleIcon,
} from '../utils/vehicleValidation';

const getIconForType = (code, name = '') => getVehicleIcon(code, name);

export default function TarifasAdmin() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission('TARIFFS', 'edit');

  const [parking, setParking] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingBranchInfo, setSavingBranchInfo] = useState(false);

  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [creatingType, setCreatingType] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({
    name: '',
    nomenclatureMode: 'CAR_PLATE',
    autoPrefix: 'CHZ',
    capacity: 15,
    minuteRate: 0,
    hourRate: 0,
    dayRate: 0,
    monthRate: 0,
    gracePeriodMinutes: 0,
    chargeByHour: false,
    hourThresholdMinutes: 15,
    chargeFlatDay: false,
  });

  const [editTypeModal, setEditTypeModal] = useState(null);
  const [savingEditType, setSavingEditType] = useState(false);

  const [branchForm, setBranchForm] = useState({
    address: '',
    phone: '',
    schedule: '',
    notes: '',
  });

  const fetchParkingData = async () => {
    try {
      setLoading(true);
      const [parkingRes, vehicleTypesRes, tariffsRes] = await Promise.all([
        axios.get('/api/parking/me'),
        axios.get('/api/parking/vehicle-types'),
        axios.get('/api/parking/tariffs'),
      ]);
      const pData = parkingRes.data;
      setParking(pData);
      if (pData) {
        setBranchForm({
          address: pData.address || '',
          phone: pData.phone || '',
          schedule: pData.schedule || '',
          notes: pData.notes || '',
        });
      }
      setVehicleTypes(vehicleTypesRes.data);
      setTariffs(tariffsRes.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las tarifas de la sede', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingData();
  }, [user?.parkingId]);

  const handleSaveBranchInfo = async (e) => {
    e.preventDefault();
    try {
      setSavingBranchInfo(true);
      await axios.put('/api/parking/me', {
        address: branchForm.address.trim(),
        phone: branchForm.phone || null,
        schedule: branchForm.schedule || null,
        notes: branchForm.notes || null,
      });
      Swal.fire({
        title: '¡Sede actualizada!',
        text: 'Datos operativos de la sede guardados correctamente',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
      fetchParkingData();
    } catch (error) {
      Swal.fire(
        'Error',
        error.response?.data?.message || 'No se pudo actualizar la información de la sede',
        'error',
      );
    } finally {
      setSavingBranchInfo(false);
    }
  };

  const handleUpdateTariff = async (vehicleTypeCode, values) => {
    try {
      await axios.post('/api/parking/tariffs', {
        vehicleTypeCode,
        minuteRate: Number(values.minuteRate),
        hourRate: Number(values.hourRate),
        dayRate: Number(values.dayRate),
        monthRate: Number(values.monthRate),
        gracePeriodMinutes: Number(values.gracePeriodMinutes),
        chargeByHour: Boolean(values.chargeByHour),
        hourThresholdMinutes: Math.min(
          60,
          Math.max(1, Number(values.hourThresholdMinutes || 15)),
        ),
        chargeFlatDay: Boolean(values.chargeFlatDay),
        capacity: Number(values.capacity),
      });
      Swal.fire({
        title: '¡Actualizado!',
        text: 'Tarifa, modalidad de cobro y cupos guardados correctamente',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
      fetchParkingData();
    } catch (e) {
      Swal.fire(
        'Error',
        e.response?.data?.message || 'No se pudo actualizar la tarifa',
        'error',
      );
    }
  };

  const handleCreateVehicleType = async (e) => {
    e.preventDefault();
    if (!newTypeForm.name.trim()) {
      Swal.fire('Atención', 'El nombre del tipo de vehículo es obligatorio', 'warning');
      return;
    }
    try {
      setCreatingType(true);
      const platePattern = buildPlatePatternFromMode(
        newTypeForm.nomenclatureMode,
        newTypeForm.autoPrefix,
      );
      await axios.post('/api/parking/vehicle-types', {
        name: newTypeForm.name.trim(),
        platePattern,
        capacity: Number(newTypeForm.capacity || 0),
        minuteRate: Number(newTypeForm.minuteRate || 0),
        hourRate: Number(newTypeForm.hourRate || 0),
        dayRate: Number(newTypeForm.dayRate || 0),
        monthRate: Number(newTypeForm.monthRate || 0),
        gracePeriodMinutes: Number(newTypeForm.gracePeriodMinutes || 0),
        chargeByHour: Boolean(newTypeForm.chargeByHour),
        hourThresholdMinutes: Math.min(
          60,
          Math.max(1, Number(newTypeForm.hourThresholdMinutes || 15)),
        ),
        chargeFlatDay: Boolean(newTypeForm.chargeFlatDay),
      });
      setShowCreateTypeModal(false);
      setNewTypeForm({
        name: '',
        nomenclatureMode: 'CAR_PLATE',
        autoPrefix: 'CHZ',
        capacity: 15,
        minuteRate: 0,
        hourRate: 0,
        dayRate: 0,
        monthRate: 0,
        gracePeriodMinutes: 0,
        chargeByHour: false,
        hourThresholdMinutes: 15,
        chargeFlatDay: false,
      });
      Swal.fire({
        title: '¡Tipo de vehículo creado!',
        text: 'El nuevo tipo de vehículo, su nomenclatura y sus tarifas fueron agregados a esta sede.',
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      });
      fetchParkingData();
    } catch (err) {
      Swal.fire(
        'Error',
        err.response?.data?.message || 'No se pudo crear el tipo de vehículo',
        'error',
      );
    } finally {
      setCreatingType(false);
    }
  };

  const handleOpenEditVehicleType = (vt) => {
    const nom = describeNomenclature(vt.platePattern, vt.code);
    const defaultPrefix =
      nom.prefix ||
      vt.code
        .replace(/[^A-Z]/g, '')
        .slice(0, 3)
        .padEnd(3, 'X');
    setEditTypeModal({
      code: vt.code,
      name: vt.name,
      nomenclatureMode: nom.mode,
      autoPrefix: defaultPrefix,
    });
  };

  const handleSaveEditVehicleType = async (e) => {
    e.preventDefault();
    if (!editTypeModal || !editTypeModal.name.trim()) return;
    try {
      setSavingEditType(true);
      const platePattern = buildPlatePatternFromMode(
        editTypeModal.nomenclatureMode,
        editTypeModal.autoPrefix,
      );
      await axios.put(`/api/parking/vehicle-types/${editTypeModal.code}`, {
        name: editTypeModal.name.trim(),
        platePattern,
      });
      setEditTypeModal(null);
      Swal.fire({
        title: '¡Actualizado!',
        text: 'Nombre y nomenclatura guardados correctamente',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
      fetchParkingData();
    } catch (err) {
      Swal.fire(
        'Error',
        err.response?.data?.message || 'No se pudo actualizar el tipo de vehículo',
        'error',
      );
    } finally {
      setSavingEditType(false);
    }
  };

  const handleDeleteVehicleType = async (code, name) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar "${name}" de esta sede?`,
      html: `Se retirará el tipo de vehículo <strong>${name}</strong> y sus cupos de la sede <strong>${parking?.name || ''}</strong>.<br/><span class="text-xs text-slate-500">Solo se permite si no hay vehículos activos de este tipo dentro de la sede.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar de la sede',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.delete(`/api/parking/vehicle-types/${code}`);
      Swal.fire({
        title: 'Eliminado',
        text: res.data?.message || 'Tipo de vehículo retirado de la sede',
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      });
      fetchParkingData();
    } catch (err) {
      Swal.fire(
        'No se puede eliminar',
        err.response?.data?.message || 'Error al eliminar el tipo de vehículo',
        'error',
      );
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  if (!parking) return <div>No se encontró información del parqueadero activo.</div>;

  return (
    <div className="space-y-6">
      {/* Cabecera de la Sede Activa */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              ⚙️ Configuración de Sede, Tarifas y Cupos
            </h2>
            {parking.companyName && (
              <span className="text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md">
                🏛️ {parking.companyName}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configurando sede activa: <strong className="text-slate-800">📍 {parking.name}</strong>
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-right shrink-0">
          <span className="text-[11px] font-bold uppercase text-blue-600 block">
            Capacidad Total Sede
          </span>
          <span className="text-lg font-extrabold text-blue-900">
            {parking.totalCapacity || 0} cupos
          </span>
        </div>
      </div>

      {/* Datos Operativos de la Sede (Dirección, Teléfono, Horario y Nota de Tiquete) */}
      <form
        onSubmit={handleSaveBranchInfo}
        className="bg-white rounded-xl shadow-xs p-5 border border-slate-200 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              📍 Datos Operativos de la Sede ({parking.name})
            </h3>
            <p className="text-xs text-slate-400">
              Estos datos se imprimen en los tiquetes de entrada y salida de esta sede.
            </p>
          </div>
          {canEdit && (
            <button
              type="submit"
              disabled={savingBranchInfo}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors self-end sm:self-center cursor-pointer"
            >
              {savingBranchInfo ? 'Guardando...' : 'Guardar Datos de Sede'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Dirección de la Sede
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={branchForm.address}
              onChange={(e) =>
                setBranchForm({ ...branchForm, address: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={branchForm.phone}
              onChange={(e) =>
                setBranchForm({ ...branchForm, phone: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Horario de Atención
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={branchForm.schedule}
              onChange={(e) =>
                setBranchForm({ ...branchForm, schedule: e.target.value })
              }
              placeholder="Ej: 6:00 am - 10:00 pm"
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Nota del Tiquete Impreso
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={branchForm.notes}
              onChange={(e) =>
                setBranchForm({ ...branchForm, notes: e.target.value })
              }
              placeholder="Conserve este tiquete..."
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </form>

      {/* Encabezado de Tipos de Vehículo y Botón para Crear Nuevo Tipo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
            🚗 Tipos de Vehículo, Tarifas y Cupos de la Sede ({vehicleTypes.length})
          </h3>
          <p className="text-xs text-slate-500">
            Configure tarifas, modalidad por hora/fracción o agregue nuevos tipos de vehículo para esta sede.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowCreateTypeModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>➕</span>
            <span>Agregar Tipo de Vehículo</span>
          </button>
        )}
      </div>

      {/* Tarjetas de Tarifas y Cupos Independientes por Tipo de Vehículo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicleTypes.map((vt) => (
          <TariffCard
            key={vt.id}
            title={vt.name}
            emoji={getIconForType(vt.code, vt.name)}
            vehicleTypeCode={vt.code}
            platePattern={vt.platePattern}
            current={tariffs.find((t) => t.vehicleTypeCode === vt.code)}
            canEdit={canEdit}
            onSave={handleUpdateTariff}
            onEditName={() => handleOpenEditVehicleType(vt)}
            onDelete={() => handleDeleteVehicleType(vt.code, vt.name)}
          />
        ))}
      </div>

      {/* Modal para Editar Nombre y Nomenclatura de un Tipo de Vehículo */}
      {editTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  ✏️ Editar Tipo y Nomenclatura
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Configure el nombre y el formato de placa o consecutivo automático.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTypeModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditVehicleType} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Nombre del Tipo de Vehículo *
                </label>
                <input
                  type="text"
                  required
                  value={editTypeModal.name}
                  onChange={(e) =>
                    setEditTypeModal({ ...editTypeModal, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                    🔢 Formato de Nomenclatura / Placa en Ingreso
                  </label>
                  <select
                    value={editTypeModal.nomenclatureMode}
                    onChange={(e) =>
                      setEditTypeModal({
                        ...editTypeModal,
                        nomenclatureMode: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CAR_PLATE">
                      Placa Carro / Camioneta / Camión (AAA123 — 3 letras y 3 números)
                    </option>
                    <option value="MOTO_PLATE">
                      Placa Motocicleta (AAA12D — 3 letras, 2 números y 1 letra)
                    </option>
                    <option value="NUMERIC">
                      Código Numérico / Cédula (123456 — 4 a 10 dígitos)
                    </option>
                    <option value="AUTO_PREFIX">
                      Consecutivo Automático con Prefijo (Ej: CHZ001 al seleccionar botón)
                    </option>
                  </select>
                </div>

                {editTypeModal.nomenclatureMode === 'AUTO_PREFIX' && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-indigo-900">
                        Prefijo del Consecutivo (2 a 4 letras):
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Al seleccionar el botón en Entrada generará{' '}
                        <strong className="font-mono text-indigo-700">
                          {(editTypeModal.autoPrefix || 'CHZ').toUpperCase()}001
                        </strong>
                        ,{' '}
                        <strong className="font-mono text-indigo-700">
                          {(editTypeModal.autoPrefix || 'CHZ').toUpperCase()}002
                        </strong>
                        ...
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={editTypeModal.autoPrefix}
                      onChange={(e) =>
                        setEditTypeModal({
                          ...editTypeModal,
                          autoPrefix: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, ''),
                        })
                      }
                      className="w-24 border border-indigo-300 bg-white rounded-lg px-3 py-1.5 text-sm font-mono font-extrabold text-center uppercase text-indigo-900"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTypeModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditType}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {savingEditType ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear Nuevo Tipo de Vehículo */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  ➕ Nuevo Tipo de Vehículo ({parking.name})
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Se habilitará con su propia nomenclatura, cupos y tarifas en esta sede.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTypeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVehicleType} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Nombre del Tipo de Vehículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Chaza, Camioneta, Camión, Patineta..."
                    value={newTypeForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isAutoCandidate = /CHAZ|CARRET|PATIN/i.test(val);
                      const derivedPrefix = val
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 3);
                      setNewTypeForm((prev) => ({
                        ...prev,
                        name: val,
                        nomenclatureMode: isAutoCandidate
                          ? 'AUTO_PREFIX'
                          : prev.nomenclatureMode,
                        autoPrefix:
                          derivedPrefix.length >= 2 ? derivedPrefix : prev.autoPrefix,
                      }));
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase text-blue-800 mb-1">
                    🅿️ Cupos Sede *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newTypeForm.capacity}
                    onChange={(e) =>
                      setNewTypeForm({ ...newTypeForm, capacity: e.target.value })
                    }
                    className="w-full border border-blue-300 bg-blue-50/40 rounded-lg px-3 py-2 text-sm font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Selector de Nomenclatura */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                    🔢 Nomenclatura de Ingreso *
                  </label>
                  <select
                    value={newTypeForm.nomenclatureMode}
                    onChange={(e) =>
                      setNewTypeForm({
                        ...newTypeForm,
                        nomenclatureMode: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CAR_PLATE">
                      Placa Carro / Camioneta / Camión (AAA123 — 3 letras y 3 números)
                    </option>
                    <option value="MOTO_PLATE">
                      Placa Motocicleta (AAA12D — 3 letras, 2 números y 1 letra)
                    </option>
                    <option value="NUMERIC">
                      Código Numérico / Cédula (123456 — 4 a 10 dígitos)
                    </option>
                    <option value="AUTO_PREFIX">
                      Consecutivo Automático al seleccionar botón (Ej: CHZ001)
                    </option>
                  </select>
                </div>

                {newTypeForm.nomenclatureMode === 'AUTO_PREFIX' && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-indigo-900">
                        Prefijo Consecutivo (2 a 4 letras):
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Autocompleta{' '}
                        <strong className="font-mono text-indigo-700">
                          {(newTypeForm.autoPrefix || 'CHZ').toUpperCase()}001
                        </strong>
                        ,{' '}
                        <strong className="font-mono text-indigo-700">
                          {(newTypeForm.autoPrefix || 'CHZ').toUpperCase()}002
                        </strong>{' '}
                        al pulsar el botón en Entrada.
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={newTypeForm.autoPrefix}
                      onChange={(e) =>
                        setNewTypeForm({
                          ...newTypeForm,
                          autoPrefix: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, ''),
                        })
                      }
                      className="w-24 border border-indigo-300 bg-white rounded-lg px-3 py-1.5 text-sm font-mono font-extrabold text-center uppercase text-indigo-900"
                    />
                  </div>
                )}
              </div>

              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  newTypeForm.chargeByHour
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTypeForm.chargeByHour}
                      onChange={(e) =>
                        setNewTypeForm({
                          ...newTypeForm,
                          chargeByHour: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-extrabold uppercase text-slate-800">
                      ⏱️ Cobrar por Hora o Fracción
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border text-slate-700">
                    {newTypeForm.chargeByHour ? 'Activado' : 'Por Minuto'}
                  </span>
                </label>

                {newTypeForm.chargeByHour && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-indigo-200/70">
                    <label className="text-xs font-bold text-indigo-950">
                      Minuto umbral para cobrar la hora (1 a 60):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={newTypeForm.hourThresholdMinutes}
                      onChange={(e) =>
                        setNewTypeForm({
                          ...newTypeForm,
                          hourThresholdMinutes: e.target.value,
                        })
                      }
                      className="w-20 px-2.5 py-1 border border-indigo-300 bg-white rounded-lg font-extrabold text-sm text-indigo-900 text-center"
                    />
                  </div>
                )}
              </div>

              <div
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  newTypeForm.chargeFlatDay
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTypeForm.chargeFlatDay}
                      onChange={(e) =>
                        setNewTypeForm({
                          ...newTypeForm,
                          chargeFlatDay: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-extrabold uppercase text-slate-800">
                      📅 Cobrar Tarifa Fija por Día (Valor Único / Chaza)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      newTypeForm.chargeFlatDay
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border text-slate-600'
                    }`}
                  >
                    {newTypeForm.chargeFlatDay ? 'Prioridad Día' : 'Inactivo'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-600">
                  Si se activa, cobra directamente el <strong>Tope Día (24h)</strong> desde el ingreso (1 tarifa día por cada 24h), con prioridad sobre hora o minuto.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Valor Minuto ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTypeForm.minuteRate}
                    onChange={(e) =>
                      setNewTypeForm({ ...newTypeForm, minuteRate: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Valor Hora ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTypeForm.hourRate}
                    onChange={(e) =>
                      setNewTypeForm({ ...newTypeForm, hourRate: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Tope Día 24h ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTypeForm.dayRate}
                    onChange={(e) =>
                      setNewTypeForm({ ...newTypeForm, dayRate: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Mensualidad Base ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTypeForm.monthRate}
                    onChange={(e) =>
                      setNewTypeForm({ ...newTypeForm, monthRate: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Tiempo de Gracia (Minutos sin cobro)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTypeForm.gracePeriodMinutes}
                    onChange={(e) =>
                      setNewTypeForm({
                        ...newTypeForm,
                        gracePeriodMinutes: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTypeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingType}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {creatingType ? 'Creando...' : 'Crear Tipo de Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TariffCard({
  title,
  emoji,
  vehicleTypeCode,
  platePattern,
  current,
  canEdit,
  onSave,
  onEditName,
  onDelete,
}) {
  const nomInfo = describeNomenclature(
    platePattern || current?.platePattern,
    vehicleTypeCode,
  );
  const [values, setValues] = useState({
    minuteRate: 0,
    hourRate: 0,
    dayRate: 0,
    monthRate: 0,
    gracePeriodMinutes: 0,
    chargeByHour: false,
    hourThresholdMinutes: 15,
    chargeFlatDay: false,
    capacity: 30,
  });

  useEffect(() => {
    if (current) {
      setValues({
        minuteRate: current.minuteRate,
        hourRate: current.hourRate,
        dayRate: current.dayRate,
        monthRate: current.monthRate,
        gracePeriodMinutes: current.gracePeriodMinutes,
        chargeByHour: Boolean(current.chargeByHour),
        hourThresholdMinutes: current.hourThresholdMinutes ?? 15,
        chargeFlatDay: Boolean(current.chargeFlatDay),
        capacity: current.capacity ?? 30,
      });
    }
  }, [current]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{emoji}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-800 truncate">{title}</h3>
            <span className="text-[10px] font-semibold text-slate-500 block">
              🔢 {nomInfo.badge}
            </span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 ml-1 shrink-0">
              <button
                type="button"
                onClick={onEditName}
                title="Editar nombre y nomenclatura del tipo de vehículo"
                className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer text-xs"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Eliminar tipo de vehículo de esta sede"
                className="p-1 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-xs"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
              values.chargeFlatDay
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : values.chargeByHour
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {values.chargeFlatDay
              ? 'Tarifa Fija Día'
              : values.chargeByHour
                ? `Hora / Fracción (${values.hourThresholdMinutes} min)`
                : 'Por Minuto'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">
            {values.capacity} cupos
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Campo destacado de Cupos Asignados Independientes */}
        <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200/80">
          <label className="text-xs font-extrabold text-blue-900 uppercase block mb-1">
            🅿️ Cupos Asignados ({title})
          </label>
          <input
            type="number"
            min="0"
            name="capacity"
            value={values.capacity}
            onChange={handleChange}
            className="w-full px-3 py-1.5 border border-blue-300 bg-white rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Check 1: Cobro de Tarifa Fija por Día (Prioridad si ambos están activos) */}
        <div
          className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            values.chargeFlatDay
              ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="chargeFlatDay"
                checked={values.chargeFlatDay}
                onChange={handleChange}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                📅 Cobrar Tarifa Fija por Día
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                values.chargeFlatDay
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {values.chargeFlatDay ? 'Prioridad Día' : 'Inactivo'}
            </span>
          </label>
          <p className="text-[11px] text-slate-600 leading-snug">
            {values.chargeFlatDay ? (
              <span className="text-amber-950">
                <strong>Activo (Prioridad):</strong> Cobra directamente el{' '}
                <strong>Tope Día (${Number(values.dayRate || 0).toLocaleString('es-CO')})</strong>{' '}
                desde el ingreso (y por cada día adicional de 24h), ignorando hora/minuto.
              </span>
            ) : (
              'Ideal para Chazas / Carretas: si se activa, cobra únicamente el Tope Día por cada día (24h).'
            )}
          </p>
        </div>

        {/* Check 2: Cobro por Hora o Fracción + Minuto Umbral Parametrizable */}
        <div
          className={`p-3.5 rounded-xl border transition-all space-y-3 ${
            values.chargeFlatDay
              ? 'bg-slate-50/60 border-slate-200 opacity-60'
              : values.chargeByHour
                ? 'bg-indigo-50/70 border-indigo-200'
                : 'bg-slate-50 border-slate-200'
          }`}
        >
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="chargeByHour"
                checked={values.chargeByHour}
                onChange={handleChange}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                ⏱️ Cobrar por Hora o Fracción
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                values.chargeByHour
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {values.chargeByHour ? 'Activado' : 'Por Minuto'}
            </span>
          </label>

          {values.chargeByHour ? (
            <div className="pt-2 border-t border-indigo-200/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-indigo-950">
                  Minuto para cobrar la hora (1 a 60):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    name="hourThresholdMinutes"
                    value={values.hourThresholdMinutes}
                    onChange={handleChange}
                    className="w-20 px-2.5 py-1 border border-indigo-300 bg-white rounded-lg font-extrabold text-sm text-indigo-900 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-xs font-bold text-indigo-800">min</span>
                </div>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug bg-white/80 p-2 rounded-lg border border-indigo-100">
                En la 1ra hora y en cada hora siguiente: antes del minuto{' '}
                <strong>{values.hourThresholdMinutes || 15}</strong> se cobran los
                minutos; al completar{' '}
                <strong>{values.hourThresholdMinutes || 15} min</strong> se cobra el{' '}
                <strong>Valor Hora</strong> completo.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              Desactivado: Se liquida el tiempo total multiplicado por el{' '}
              <strong>Valor Minuto</strong>.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Valor Minuto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                name="minuteRate"
                value={values.minuteRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:outline-none border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Valor Hora
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                name="hourRate"
                value={values.hourRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:outline-none border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Tope Día (24h)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                name="dayRate"
                value={values.dayRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:outline-none border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Mensualidad Base
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                name="monthRate"
                value={values.monthRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:outline-none border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Tiempo de Gracia (Minutos sin cobro)
            </label>
            <input
              type="number"
              min="0"
              name="gracePeriodMinutes"
              value={values.gracePeriodMinutes}
              onChange={handleChange}
              className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:outline-none border-slate-200 text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => onSave(vehicleTypeCode, values)}
          className="w-full py-2.5 px-4 rounded-lg text-white font-bold text-sm shadow-xs transition-transform active:scale-[0.99] bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Guardar Tarifas y Cupos
        </button>
      </div>
    </div>
  );
}
