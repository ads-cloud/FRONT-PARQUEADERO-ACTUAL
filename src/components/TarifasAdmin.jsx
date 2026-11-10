import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const getIconForType = (code) => {
  const t = (code || '').toUpperCase();
  if (t.includes('MOTO')) return '🏍️';
  if (t.includes('BICY') || t.includes('BICI')) return '🚲';
  if (t.includes('TRUCK') || t.includes('CAMION')) return '🚚';
  return '🚗';
};

export default function TarifasAdmin() {
  const { user } = useAuth();
  const [parking, setParking] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);

  if (
    user &&
    user.role?.toUpperCase() !== 'ADMIN' &&
    user.role?.toUpperCase() !== 'SUPER_ADMIN'
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchParkingData = async () => {
    try {
      setLoading(true);
      const [parkingRes, vehicleTypesRes, tariffsRes] = await Promise.all([
        axios.get('/api/parking/me'),
        axios.get('/api/parking/vehicle-types'),
        axios.get('/api/parking/tariffs'),
      ]);
      setParking(parkingRes.data);
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

  const handleUpdateTariff = async (vehicleTypeCode, values) => {
    try {
      await axios.post('/api/parking/tariffs', {
        vehicleTypeCode,
        minuteRate: Number(values.minuteRate),
        hourRate: Number(values.hourRate),
        dayRate: Number(values.dayRate),
        monthRate: Number(values.monthRate),
        gracePeriodMinutes: Number(values.gracePeriodMinutes),
      });
      Swal.fire({
        title: '¡Actualizado!',
        text: 'Tarifa guardada correctamente',
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
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ⚙️ Configuración de Tarifas
        </h2>
        <p className="text-gray-500">
          Administra los precios para cada tipo de vehículo en{' '}
          <strong>{parking.name}</strong>.
          <br />
          <span className="text-xs text-gray-400">{parking.address}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
  });

  useEffect(() => {
    if (current) {
      setValues({
        minuteRate: current.minuteRate,
        hourRate: current.hourRate,
        dayRate: current.dayRate,
        monthRate: current.monthRate,
        gracePeriodMinutes: current.gracePeriodMinutes,
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
    <div className="rounded-xl shadow-lg border-t-4 border-blue-500 bg-white overflow-hidden transition-all hover:shadow-xl">
      <div className="p-4 border-b flex items-center justify-between bg-blue-50 text-blue-700">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">{emoji}</span> {title}
        </h3>
        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-white/50 rounded">
          {vehicleTypeCode}
        </span>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Valor Minuto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                name="minuteRate"
                value={values.minuteRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Valor Hora
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                name="hourRate"
                value={values.hourRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Tope Día (24h)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                name="dayRate"
                value={values.dayRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Mensualidad Base
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                name="monthRate"
                value={values.monthRate}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
              />
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Tiempo de Gracia (Minutos sin cobro)
            </label>
            <input
              type="number"
              min="0"
              name="gracePeriodMinutes"
              value={values.gracePeriodMinutes}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-200"
            />
          </div>
        </div>

        <button
          onClick={() => onSave(vehicleTypeCode, values)}
          className="w-full py-3 px-4 rounded-lg text-white font-bold shadow-md transition-transform active:scale-[0.98] bg-blue-600 hover:bg-blue-700"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
