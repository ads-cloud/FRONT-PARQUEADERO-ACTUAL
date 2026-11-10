import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function CajaCierre() {
  const { user } = useAuth();
  const [data, setData] = useState({
    tickets: [],
    subscriptionPayments: [],
    ticketsAmount: 0,
    subscriptionsAmount: 0,
    totalCollected: 0,
    totalTickets: 0,
    totalSubscriptions: 0,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resStatus, resHistory] = await Promise.all([
        axios.get('/api/cash-closings/status'),
        axios.get('/api/cash-closings/history'),
      ]);
      setData(resStatus.data);
      setHistory(resHistory.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando información de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.parkingId]);

  const handleCloseCash = async () => {
    setShowConfirm(false);
    const toastId = toast.loading('Procesando cierre de caja...');

    try {
      await axios.post('/api/cash-closings/close');
      toast.success('Caja cerrada correctamente', { id: toastId });
      fetchData();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cerrar caja';
      toast.error(msg, { id: toastId });
    }
  };

  if (loading)
    return <div className="p-4 text-center">Cargando información de caja...</div>;

  const hasPendingMovements =
    data.totalTickets > 0 || data.totalSubscriptions > 0;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 relative">
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Confirmar Cierre de Caja
            </h3>
            <p className="text-gray-600 mb-6">
              Estás a punto de cerrar la caja con un total de{' '}
              <span className="font-bold text-blue-600">
                ${Number(data.totalCollected || 0).toLocaleString('es-CO')}
              </span>
              .
              <br />
              Esta acción consolidará tickets y mensualidades de tu turno actual.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors border border-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseCash}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-center">
            <p className="text-blue-600 font-medium mb-1 uppercase tracking-wide text-xs">
              Total Recaudado (Turno Actual)
            </p>
            <p className="text-3xl font-bold text-blue-900">
              ${Number(data.totalCollected || 0).toLocaleString('es-CO')}
            </p>
          </div>
          <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100 text-center">
            <p className="text-emerald-700 font-medium mb-1 uppercase tracking-wide text-xs">
              Tickets ({data.totalTickets})
            </p>
            <p className="text-2xl font-bold text-emerald-900">
              ${Number(data.ticketsAmount || 0).toLocaleString('es-CO')}
            </p>
          </div>
          <div className="bg-purple-50 p-5 rounded-lg border border-purple-100 text-center">
            <p className="text-purple-700 font-medium mb-1 uppercase tracking-wide text-xs">
              Mensualidades ({data.totalSubscriptions})
            </p>
            <p className="text-2xl font-bold text-purple-900">
              ${Number(data.subscriptionsAmount || 0).toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        {hasPendingMovements ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform active:scale-95 transition-all text-xl"
          >
            CERRAR CAJA Y GENERAR REPORTE
          </button>
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-center font-medium border border-yellow-200">
            No hay movimientos pendientes para cerrar en tu turno.
          </div>
        )}
      </div>

      {data.tickets.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-700 mb-4">
            Tickets Cobrados Pendientes de Cierre
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Placa</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Entrada</th>
                  <th className="px-6 py-3">Salida</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((t) => (
                  <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold font-mono text-gray-900">
                      {t.licensePlate}
                    </td>
                    <td className="px-6 py-4">{t.vehicleTypeName}</td>
                    <td className="px-6 py-4">
                      {new Date(t.entryTime).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(t.exitTime).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      ${Number(t.totalAmount || 0).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.subscriptionPayments && data.subscriptionPayments.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-700 mb-4">
            Pagos de Mensualidades Pendientes de Cierre
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Placa</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Concepto</th>
                  <th className="px-6 py-3">Hora</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptionPayments.map((p) => (
                  <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold font-mono text-gray-900">
                      {p.licensePlate}
                    </td>
                    <td className="px-6 py-4">{p.customerName}</td>
                    <td className="px-6 py-4">
                      {p.paymentType === 'SUBSCRIPTION_RENEWAL'
                        ? 'Renovación Mensualidad'
                        : 'Nueva Mensualidad'}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(p.paidAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-purple-600">
                      ${Number(p.amount || 0).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Historial de Cierres de Caja
        </h3>
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Cajero</th>
                  <th className="px-6 py-3 text-center">Tickets</th>
                  <th className="px-6 py-3 text-center">Mensualidades</th>
                  <th className="px-6 py-3 text-right">Total Recaudado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {new Date(c.closedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">{c.cashierUsername}</td>
                    <td className="px-6 py-4 text-center">{c.totalTickets}</td>
                    <td className="px-6 py-4 text-center">
                      {c.totalSubscriptions || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                      ${Number(c.totalCollected || 0).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            No hay cierres registrados aún en esta sede.
          </p>
        )}
      </div>
    </div>
  );
}
