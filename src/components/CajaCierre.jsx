import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function CajaCierre() {
  const [data, setData] = useState({ total: 0, cantidad: 0, tickets: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resEstado, resHistorial] = await Promise.all([
          axios.get('/api/caja/estado'),
          axios.get('/api/caja/historial')
      ]);
      setData(resEstado.data);
      setHistory(resHistorial.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando información de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCerrarCaja = async () => {
    setShowConfirm(false);
    const toastId = toast.loading('Procesando cierre...');
    
    try {
      await axios.post('/api/caja/cerrar');
      toast.success('Caja cerrada correctamente', { id: toastId });
      fetchData(); 
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cerrar caja';
      toast.error(msg, { id: toastId });
    }
  };

  if (loading) return <div className="p-4 text-center">Cargando información de caja...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 relative">
      {/* Modal de Confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmar Cierre de Caja</h3>
            <p className="text-gray-600 mb-6">
              Estás a punto de cerrar la caja con un total de <span className="font-bold text-blue-600">${data.total.toLocaleString('es-CO')}</span>.
              <br/>
              Esta acción generará un reporte y no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors border border-gray-300"
                autoFocus
              >
                Cancelar
              </button>
              <button 
                onClick={handleCerrarCaja}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-colors"
              >
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Cierre de Caja</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
           <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
              <p className="text-blue-600 font-medium mb-2 uppercase tracking-wide text-xs">Total Recaudado (Sesión Actual)</p>
              <p className="text-4xl font-bold text-blue-900">${data.total.toLocaleString('es-CO')}</p>
           </div>
           <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-500 font-medium mb-2 uppercase tracking-wide text-xs">Tickets Cobrados</p>
              <p className="text-4xl font-bold text-gray-700">{data.cantidad}</p>
           </div>
        </div>

        {data.cantidad > 0 ? (
            <button 
                onClick={() => setShowConfirm(true)}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform active:scale-95 transition-all text-xl"
            >
                CERRAR CAJA Y GENERAR REPORTE
            </button>
        ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-center font-medium border border-yellow-200">
                No hay movimientos pendientes para cerrar.
            </div>
        )}
      </div>

      {data.tickets.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <h3 className="text-lg font-bold text-gray-700 mb-4">Detalle de Movimientos Pendientes</h3>
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left text-gray-500">
                       <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                           <tr>
                               <th className="px-6 py-3">Placa</th>
                               <th className="px-6 py-3">Entrada</th>
                               <th className="px-6 py-3">Salida</th>
                               <th className="px-6 py-3 text-right">Valor</th>
                           </tr>
                       </thead>
                       <tbody>
                           {data.tickets.map((t) => (
                               <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                                   <td className="px-6 py-4 font-medium text-gray-900">{t.placa}</td>
                                   <td className="px-6 py-4">{new Date(t.fechaIngreso).toLocaleTimeString()}</td>
                                   <td className="px-6 py-4">{new Date(t.fechaSalida).toLocaleTimeString()}</td>
                                   <td className="px-6 py-4 text-right font-bold text-green-600">${Number(t.total).toLocaleString()}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
          </div>
      )}

      {/* Historial de Cierres */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Historial de Cierres</h3>
          {history.length > 0 ? (
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th className="px-6 py-3">Fecha</th>
                              <th className="px-6 py-3">Cajero</th>
                              <th className="px-6 py-3 text-center">Tickets</th>
                              <th className="px-6 py-3 text-right">Total Recaudado</th>
                          </tr>
                      </thead>
                      <tbody>
                          {history.map((c) => (
                              <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">
                                    {new Date(c.fecha).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 capitalize">
                                    {c.cajero?.username || 'Desconocido'}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {c.totalTickets}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-blue-600">
                                    ${Number(c.totalRecaudado).toLocaleString('es-CO')}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          ) : (
              <p className="text-gray-500 text-sm text-center py-4">No hay cierres registrados aún.</p>
          )}
      </div>
    </div>
  );
}