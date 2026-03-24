import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function MensualidadesAdmin() {
    const [mensualidades, setMensualidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); // Filtro
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        nombreCliente: '',
        telefono: '',
        placa: '',
        tipoVehiculo: 'CARRO',
        valorMensualidad: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaVencimiento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
    });

    const [renewModalOpen, setRenewModalOpen] = useState(false);
    const [renewData, setRenewData] = useState({
        id: null,
        placa: '',
        cliente: '',
        valor: 0,
        fechaInicio: '',
        fechaFin: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/mensualidades');
            setMensualidades(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando mensualidades');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.placa || !formData.valorMensualidad) return toast.error('Faltan datos obligatorios');
        
        try {
            await axios.post('/api/mensualidades', formData);
            toast.success('Mensualidad creada');
            setShowModal(false);
            fetchData();
            setFormData({
                nombreCliente: '',
                telefono: '',
                placa: '',
                tipoVehiculo: 'CARRO',
                valorMensualidad: '',
                fechaInicio: new Date().toISOString().split('T')[0],
                fechaVencimiento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
            })
        } catch (error) {
            toast.error('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que desea eliminar esta mensualidad?')) return;
        try {
            await axios.delete(`/api/mensualidades/${id}`);
            toast.success('Eliminado correctamente');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleOpenRenew = (m) => {
        const today = new Date();
        const vDate = new Date(m.fechaVencimiento);
        // Normalize time
        today.setHours(0,0,0,0);
        vDate.setHours(0,0,0,0);

        let newStart;
        if (vDate >= today) {
            newStart = new Date(vDate);
            newStart.setDate(newStart.getDate() + 1);
        } else {
            newStart = new Date();
        }

        const newEnd = new Date(newStart);
        newEnd.setMonth(newEnd.getMonth() + 1);

        setRenewData({
            id: m.id,
            placa: m.placa,
            cliente: m.nombreCliente,
            valor: m.valorMensualidad,
            fechaInicio: newStart.toISOString().split('T')[0],
            fechaFin: newEnd.toISOString().split('T')[0]
        });
        setRenewModalOpen(true);
    };

    const handleSubmitRenew = async (e) => {
        e.preventDefault();
        const toastId = toast.loading("Renovando...");
        try {
            await axios.put(`/api/mensualidades/${renewData.id}/renew`, {
                valor: Number(renewData.valor),
                fechaInicio: renewData.fechaInicio,
                fechaFin: renewData.fechaFin
            });
            toast.success("Mensualidad renovada exitosamente", { id: toastId });
            setRenewModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Error al renovar", { id: toastId });
        }
    };

    const getStatusColor = (vencimiento) => {
        const today = new Date();
        const vDate = new Date(vencimiento);
        const diffTime = vDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays < 0) return 'bg-red-100 text-red-800'; // Vencido
        if (diffDays <= 5) return 'bg-yellow-100 text-yellow-800'; // Por vencer
        return 'bg-green-100 text-green-800'; // Activo
    };

    const getStatusText = (vencimiento) => {
        const today = new Date();
        const vDate = new Date(vencimiento);
        const diffTime = vDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays < 0) return `Vencido hace ${Math.abs(diffDays)} días`;
        if (diffDays === 0) return 'Vence hoy';
        if (diffDays <= 5) return `Vence en ${diffDays} días`;
        return 'Activo';
    };

    const filtered = mensualidades.filter(m => 
        m.placa.includes(searchTerm) || m.nombreCliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-2xl font-bold text-gray-800">Mensualidades</h2>
                    <input 
                        type="text" 
                        placeholder="Buscar placa/nombre..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                        className="border rounded-lg px-3 py-2 text-sm w-full md:w-64 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition-colors w-full md:w-auto"
                >
                    + Nueva Mensualidad
                </button>
            </div>

            {/* Vista Móvil (Cards) */}
            <div className="md:hidden space-y-4">
                {loading && <div className="text-center p-4">Cargando...</div>}
                
                {!loading && filtered.length === 0 && (
                     <div className="p-10 text-center text-gray-400 bg-white rounded-lg shadow">
                        {mensualidades.length === 0 ? 'No hay mensualidades registradas' : 'No se encontraron resultados'}
                    </div>
                )}

                {filtered.map((m) => (
                    <div key={m.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 font-mono tracking-wider">{m.placa}</h3>
                                <p className="text-sm font-medium text-gray-600">{m.nombreCliente}</p>
                                <p className="text-xs text-gray-400">{m.tipoVehiculo}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(m.fechaVencimiento)}`}>
                                {getStatusText(m.fechaVencimiento)}
                            </span>
                        </div>
                        
                        <div className="text-sm text-gray-500 flex justify-between items-center border-t border-gray-50 pt-2 mt-1">
                            <span>Vence: <strong>{m.fechaVencimiento}</strong></span>
                        </div>

                        <div className="flex gap-2 mt-2">
                             <button 
                                onClick={() => handleOpenRenew(m)}
                                className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded text-sm font-semibold flex items-center justify-center gap-1 border border-emerald-200"
                            >
                                <span>↺</span> Renovar
                            </button>
                            <button 
                                onClick={() => handleDelete(m.id)}
                                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded text-sm font-semibold border border-red-200"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Vista Escritorio (Tabla) */}
            <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                        <tr>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Vehículo</th>
                            <th className="px-6 py-3">Placa</th>
                            <th className="px-6 py-3">Vencimiento</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading && (
                            <tr><td colSpan="6" className="p-4 text-center">Cargando...</td></tr>
                        )}

                        {!loading && filtered.length === 0 && (
                            <tr><td colSpan="6" className="p-10 text-center text-gray-400">
                                {mensualidades.length === 0 ? 'No hay mensualidades registradas' : 'No se encontraron resultados'}
                            </td></tr>
                        )}

                        {filtered.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{m.nombreCliente}</div>
                                    <div className="text-xs text-gray-400">{m.telefono || 'Sin teléfono'}</div>
                                </td>
                                <td className="px-6 py-4">{m.tipoVehiculo}</td>
                                <td className="px-6 py-4 font-mono font-bold text-gray-800 tracking-wider">
                                    {m.placa}
                                </td>
                                <td className="px-6 py-4 font-medium">
                                    {m.fechaVencimiento}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(m.fechaVencimiento)}`}>
                                        {getStatusText(m.fechaVencimiento)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                    <button 
                                        onClick={() => handleOpenRenew(m)}
                                        className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                                        title="Renovar por 1 mes"
                                    >
                                        <span>↺</span> Renovar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(m.id)}
                                        className="text-red-500 hover:text-red-700 font-medium text-xs border border-red-200 hover:border-red-400 px-2 py-1 rounded transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Nueva Mensualidad</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre Cliente</label>
                                <input required className="w-full border rounded p-2" 
                                    value={formData.nombreCliente} onChange={e => setFormData({...formData, nombreCliente: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Placa</label>
                                    <input required className="w-full border rounded p-2 uppercase" 
                                        value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                    <input className="w-full border rounded p-2" 
                                        value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                    <select className="w-full border rounded p-2"
                                        value={formData.tipoVehiculo} onChange={e => setFormData({...formData, tipoVehiculo: e.target.value})}>
                                        <option value="CARRO">CARRO</option>
                                        <option value="MOTO">MOTO</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Valor</label>
                                    <input type="number" required className="w-full border rounded p-2" 
                                        value={formData.valorMensualidad} onChange={e => setFormData({...formData, valorMensualidad: e.target.value})} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                                    <input type="date" required className="w-full border rounded p-2" 
                                        value={formData.fechaInicio} onChange={e => setFormData({...formData, fechaInicio: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha Vence</label>
                                    <input type="date" required className="w-full border rounded p-2" 
                                        value={formData.fechaVencimiento} onChange={e => setFormData({...formData, fechaVencimiento: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 px-4 py-2">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Renovar */}
            {renewModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-xl font-bold mb-1 text-emerald-800">Renovar Mensualidad</h3>
                        <p className="text-sm text-gray-500 mb-4 font-mono">{renewData.placa} - {renewData.cliente}</p>
                        
                        <form onSubmit={handleSubmitRenew} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Renovación</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        required 
                                        className="w-full border rounded p-2 pl-7 font-bold text-gray-800"
                                        value={renewData.valor} 
                                        onChange={e => setRenewData({...renewData, valor:Number(e.target.value)})} 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded text-sm border border-gray-100">
                                <div>
                                    <span className="block text-xs uppercase text-gray-500 font-bold">Inicia</span>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-transparent font-medium text-gray-900 border-none p-0 focus:ring-0 text-sm"
                                        value={renewData.fechaInicio}
                                        onChange={e => {
                                            const newStart = new Date(e.target.value);
                                            const newEnd = new Date(newStart);
                                            newEnd.setMonth(newEnd.getMonth() + 1);
                                            setRenewData({
                                                ...renewData, 
                                                fechaInicio: e.target.value,
                                                fechaFin: newEnd.toISOString().split('T')[0]
                                            });
                                        }}
                                    />
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-gray-500 font-bold">Vence</span>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-transparent font-bold text-emerald-700 border-none p-0 focus:ring-0 text-sm"
                                        value={renewData.fechaFin}
                                        onChange={e => setRenewData({...renewData, fechaFin: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setRenewModalOpen(false)} className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm font-medium">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95">
                                    ✓ Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}