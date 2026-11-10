import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const PlusCircleIcon = ({ className }) => (
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
      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function ParkingAdmin() {
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    address: '',
    taxId: '',
    phone: '',
    schedule: '',
    notes: '',
    totalCapacity: 100,
  });

  useEffect(() => {
    fetchParkings();
  }, []);

  const fetchParkings = async () => {
    try {
      const res = await axios.get('/api/parking');
      setParkings(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar parqueaderos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar/desactivar este parqueadero?')) return;
    try {
      const res = await axios.delete(`/api/parking/${id}`);
      toast.success(res.data?.message || 'Parqueadero eliminado');
      fetchParkings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleEdit = (parking) => {
    setFormData({
      id: parking.id,
      name: parking.name || '',
      address: parking.address || '',
      taxId: parking.taxId ?? '',
      phone: parking.phone ?? '',
      schedule: parking.schedule ?? '',
      notes: parking.notes ?? '',
      totalCapacity: parking.totalCapacity ?? 100,
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setFormData({
      id: null,
      name: '',
      address: '',
      taxId: '',
      phone: '',
      schedule: '',
      notes: '',
      totalCapacity: 100,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      address: formData.address,
      taxId: formData.taxId || null,
      phone: formData.phone || null,
      schedule: formData.schedule || null,
      notes: formData.notes || null,
      totalCapacity: Number(formData.totalCapacity) || 100,
    };

    try {
      if (formData.id) {
        await axios.put(`/api/parking/${formData.id}`, payload);
        toast.success('Parqueadero actualizado');
      } else {
        await axios.post('/api/parking', payload);
        toast.success('Parqueadero creado con tarifas iniciales');
      }
      setIsModalOpen(false);
      fetchParkings();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (formData.id ? 'Error al actualizar' : 'Error al crear'),
      );
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Administración de Parqueaderos (Multi-Tenant)
          </h2>
          <p className="text-sm text-gray-500">
            Gestione las sedes, su capacidad total y sus datos de facturación/impresión.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Nuevo Parqueadero
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NIT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parkings.map((parking) => (
                <tr key={parking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{parking.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parking.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {parking.taxId || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {parking.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {parking.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-blue-700">
                    {parking.totalCapacity || 100} cupos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(parking)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(parking.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {parkings.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No hay parqueaderos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {formData.id ? 'Editar' : 'Crear'} Parqueadero
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">
                    NIT / ID Fiscal
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="900123456-7"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">
                    Capacidad (Cupos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, totalCapacity: e.target.value })
                    }
                    className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="3001234567"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">
                  Horario de Atención
                </label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Lun - Dom 6:00 am - 10:00 pm"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">
                  Nota en Tiquete Impreso
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder="Conserve este tiquete..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
