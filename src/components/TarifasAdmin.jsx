import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const getIconForType = (code) => {
  const t = (code || '').toUpperCase();
  if (t.includes('MOTO')) return '🏍️';
  if (t.includes('BICY') || t.includes('BICI')) return '🚲';
  if (t.includes('TRUCK') || t.includes('CAMION')) return '🚚';
  return '🚗';
};

export default function TarifasAdmin() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission('TARIFFS', 'edit');

  const [parking, setParking] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingBranchInfo, setSavingBranchInfo] = useState(false);

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
        capacity: Number(values.capacity),
      });
      Swal.fire({
        title: '¡Actualizado!',
        text: 'Tarifa y cupos guardados correctamente',
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

      {/* Tarjetas de Tarifas y Cupos Independientes por Tipo de Vehículo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicleTypes.map((vt) => (
          <TariffCard
            key={vt.id}
            title={vt.name}
            emoji={getIconForType(vt.code)}
            vehicleTypeCode={vt.code}
            current={tariffs.find((t) => t.vehicleTypeCode === vt.code)}
            onSave={handleUpdateTariff}
          />
        ))}
      </div>
    </div>
  );
}

function TariffCard({ title, emoji, vehicleTypeCode, current, onSave }) {
  const [values, setValues] = useState({
    minuteRate: 0,
    hourRate: 0,
    dayRate: 0,
    monthRate: 0,
    gracePeriodMinutes: 0,
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
        capacity: current.capacity ?? 30,
      });
    }
  }, [current]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
          <span className="text-2xl">{emoji}</span> {title}
        </h3>
        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">
          {values.capacity} cupos
        </span>
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
