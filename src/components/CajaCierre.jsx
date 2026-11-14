import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function CajaCierre() {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Active sub-tab for Admin: 'history' (Historial de cierres), 'open-shifts' (Turnos en curso), 'personal' (Mi caja)
  const [activeTab, setActiveTab] = useState(isSupervisor ? 'history' : 'personal');

  // Personal shift data
  const [personalData, setPersonalData] = useState({
    tickets: [],
    subscriptionPayments: [],
    ticketsAmount: 0,
    subscriptionsAmount: 0,
    totalCollected: 0,
    totalTickets: 0,
    totalSubscriptions: 0,
  });

  // History data & filters
  const [history, setHistory] = useState([]);
  const [cashiersList, setCashiersList] = useState([]);
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Open shifts data (for supervisors)
  const [openShifts, setOpenShifts] = useState([]);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClosingDetail, setSelectedClosingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [
        axios.get('/api/cash-closings/status'),
        axios.get('/api/cash-closings/history', {
          params: {
            cashierId: selectedCashierId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        }),
      ];

      if (isSupervisor) {
        promises.push(axios.get('/api/cash-closings/open-shifts'));
        promises.push(axios.get('/api/users').catch(() => ({ data: [] })));
      }

      const results = await Promise.all(promises);
      setPersonalData(results[0].data || {});
      setHistory(results[1].data || []);

      if (isSupervisor) {
        setOpenShifts(results[2]?.data || []);
        setCashiersList(results[3]?.data || []);
      }
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

  // Handle filter submission
  const handleApplyFilters = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await axios.get('/api/cash-closings/history', {
        params: {
          cashierId: selectedCashierId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setHistory(res.data || []);
      toast.success('Historial actualizado');
    } catch (err) {
      console.error(err);
      toast.error('Error al filtrar historial');
    }
  };

  const handleClearFilters = async () => {
    setSelectedCashierId('');
    setStartDate('');
    setEndDate('');
    try {
      const res = await axios.get('/api/cash-closings/history');
      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // View detail modal
  const handleViewDetail = async (closingId) => {
    try {
      setLoadingDetail(true);
      setDetailModalOpen(true);
      const res = await axios.get(`/api/cash-closings/${closingId}/detail`);
      setSelectedClosingDetail(res.data);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el detalle del cierre');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Personal cash close
  const handleCloseCash = async () => {
    setShowConfirm(false);
    const toastId = toast.loading('Procesando cierre de caja...');

    try {
      await axios.post('/api/cash-closings/close', { notes: closeNotes || undefined });
      toast.success('Caja cerrada correctamente', { id: toastId });
      setCloseNotes('');
      fetchData();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cerrar caja';
      toast.error(msg, { id: toastId });
    }
  };

  // Metrics for history
  const historyMetrics = useMemo(() => {
    const totalCollected = history.reduce((acc, c) => acc + Number(c.totalCollected || 0), 0);
    const totalTickets = history.reduce((acc, c) => acc + Number(c.totalTickets || 0), 0);
    const ticketsAmount = history.reduce((acc, c) => acc + Number(c.ticketsAmount || 0), 0);
    const totalSubscriptions = history.reduce(
      (acc, c) => acc + Number(c.totalSubscriptions || 0),
      0,
    );
    const subscriptionsAmount = history.reduce(
      (acc, c) => acc + Number(c.subscriptionsAmount || 0),
      0,
    );
    return {
      totalCollected,
      totalTickets,
      ticketsAmount,
      totalSubscriptions,
      subscriptionsAmount,
      count: history.length,
    };
  }, [history]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium">
        Cargando módulo de caja...
      </div>
    );
  }

  const hasPendingPersonalMovements =
    personalData.totalTickets > 0 || personalData.totalSubscriptions > 0;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
      {/* Header with Title and Mode indicator */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-5 rounded-xl shadow-xs border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💵</span>
            <h2 className="text-2xl font-bold text-gray-800">
              {isSupervisor ? 'Supervisión y Cierre de Caja' : 'Cierre de Caja Operativo'}
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isSupervisor
              ? 'Auditoría integral de turnos y cierres de caja realizados por los cajeros de la sede.'
              : 'Consolidación de tickets y mensualidades cobradas en tu turno de trabajo actual.'}
          </p>
        </div>

        {isSupervisor && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Rol Administrador de Sede
          </span>
        )}
      </div>

      {/* Tabs navigation for Supervisors */}
      {isSupervisor && (
        <div className="flex border-b border-gray-200 space-x-2 bg-white px-4 pt-3 rounded-t-xl shadow-xs">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Cierres Realizados por Usuario
            <span className="text-xs bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full">
              {history.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('open-shifts')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'open-shifts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⏳ Cajas Abiertas en Turno
            {openShifts.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 font-bold py-0.5 px-2 rounded-full">
                {openShifts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💼 Mi Caja Personal
            {hasPendingPersonalMovements && (
              <span className="text-xs bg-green-100 text-green-800 font-bold py-0.5 px-2 rounded-full">
                ${Number(personalData.totalCollected || 0).toLocaleString('es-CO')}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: HISTORIAL DE CIERRES POR USUARIO (Auditoría para Administrador)     */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100">
            <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Cajero / Usuario
                </label>
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">Todos los cajeros de la sede</option>
                  {cashiersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.username} {c.roleName ? `(${c.roleName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow-sm transition-colors"
                >
                  Filtrar
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-sm border border-gray-300 transition-colors"
                  title="Limpiar filtros"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>

          {/* Metric Cards of Filtered Closings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                Total Recaudado en Cierres
              </p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">
                ${Number(historyMetrics.totalCollected || 0).toLocaleString('es-CO')}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {historyMetrics.count} cierre(s) auditados
              </p>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                Tickets Liquidados
              </p>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                {historyMetrics.totalTickets} tickets
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                ${Number(historyMetrics.ticketsAmount || 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="bg-purple-50/80 p-4 rounded-xl border border-purple-100">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                Mensualidades Cobradas
              </p>
              <p className="text-2xl font-extrabold text-purple-900 mt-1">
                {historyMetrics.totalSubscriptions} pagos
              </p>
              <p className="text-xs text-purple-600 mt-0.5">
                ${Number(historyMetrics.subscriptionsAmount || 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Promedio por Cierre
              </p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">
                ${historyMetrics.count > 0
                  ? Math.round(
                      historyMetrics.totalCollected / historyMetrics.count,
                    ).toLocaleString('es-CO')
                  : '0'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Valor medio por turno</p>
            </div>
          </div>

          {/* Closings Table */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-base">
                Listado de Cierres de Turno
              </h3>
              <span className="text-xs text-gray-500">
                Mostrando {history.length} cierres registrados
              </span>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3">Fecha y Hora</th>
                      <th className="px-5 py-3">Cajero (Usuario)</th>
                      <th className="px-5 py-3 text-center">Tickets</th>
                      <th className="px-5 py-3 text-center">Mensualidades</th>
                      <th className="px-5 py-3 text-right">Total Recaudado</th>
                      <th className="px-5 py-3 text-center">Notas</th>
                      <th className="px-5 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((c) => (
                      <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-900">
                          {new Date(c.closedAt).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
                            👤 {c.cashierUsername}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-bold text-gray-800">{c.totalTickets}</span>
                          <span className="text-xs text-gray-400 block">
                            ${Number(c.ticketsAmount || 0).toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-bold text-gray-800">
                            {c.totalSubscriptions || 0}
                          </span>
                          <span className="text-xs text-gray-400 block">
                            ${Number(c.subscriptionsAmount || 0).toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-blue-700 text-base whitespace-nowrap">
                          ${Number(c.totalCollected || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5 text-center max-w-[180px] truncate text-xs text-gray-500">
                          {c.notes || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleViewDetail(c.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
                          >
                            🔍 Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <span className="text-3xl block mb-2">📭</span>
                No hay cierres de caja registrados con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TURNOS ABIERTOS EN TIEMPO REAL (Supervisión de Cajas Abiertas)      */}
      {/* ========================================================================= */}
      {activeTab === 'open-shifts' && isSupervisor && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <h4 className="font-bold text-amber-900 text-sm">
                  Cajas Abiertas en Turno Actual
                </h4>
                <p className="text-xs text-amber-700">
                  Muestra a los cajeros que tienen cobros registrados pendientes por cerrar en esta sede.
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>

          {openShifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openShifts.map((shift) => (
                <div
                  key={shift.cashierId}
                  className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 border-b pb-3">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                          Cajero en Turno
                        </span>
                        <h4 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
                          👤 {shift.cashierUsername}
                        </h4>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
                        En Turno Activo
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                        <p className="text-[11px] text-gray-500 font-medium">
                          Tickets Cobrados ({shift.totalTickets})
                        </p>
                        <p className="text-sm font-bold text-emerald-700">
                          ${Number(shift.ticketsAmount || 0).toLocaleString('es-CO')}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                        <p className="text-[11px] text-gray-500 font-medium">
                          Mensualidades ({shift.totalSubscriptions})
                        </p>
                        <p className="text-sm font-bold text-purple-700">
                          ${Number(shift.subscriptionsAmount || 0).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                      <span>Primer cobro:</span>
                      <span className="font-medium text-gray-700">
                        {shift.firstActivityAt
                          ? new Date(shift.firstActivityAt).toLocaleTimeString('es-CO')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Último cobro:</span>
                      <span className="font-medium text-gray-700">
                        {shift.lastActivityAt
                          ? new Date(shift.lastActivityAt).toLocaleTimeString('es-CO')
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-between items-center bg-blue-50/60 -mx-5 -mb-5 p-4 rounded-b-xl border-blue-100">
                    <span className="text-xs font-bold text-blue-900 uppercase">
                      Subtotal Acumulado
                    </span>
                    <span className="text-xl font-extrabold text-blue-900">
                      ${Number(shift.totalCollected || 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl shadow-xs border border-gray-200 text-center text-gray-500">
              <span className="text-4xl block mb-2">✅</span>
              <h4 className="font-bold text-gray-800 text-base mb-1">
                Todas las cajas de la sede están al día
              </h4>
              <p className="text-sm text-gray-500">
                No hay movimientos de tickets ni mensualidades pendientes por cerrar en este momento.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MI CAJA PERSONAL (Para Cajero o Administrador operando directamente) */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Mi Turno de Caja ({user?.username})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-center">
                <p className="text-blue-600 font-medium mb-1 uppercase tracking-wide text-xs">
                  Total Recaudado (Turno Actual)
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  ${Number(personalData.totalCollected || 0).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100 text-center">
                <p className="text-emerald-700 font-medium mb-1 uppercase tracking-wide text-xs">
                  Tickets ({personalData.totalTickets})
                </p>
                <p className="text-2xl font-bold text-emerald-900">
                  ${Number(personalData.ticketsAmount || 0).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="bg-purple-50 p-5 rounded-lg border border-purple-100 text-center">
                <p className="text-purple-700 font-medium mb-1 uppercase tracking-wide text-xs">
                  Mensualidades ({personalData.totalSubscriptions})
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  ${Number(personalData.subscriptionsAmount || 0).toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            {hasPendingPersonalMovements ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Notas u Observaciones del Cierre (Opcional)
                  </label>
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Ej. Cierre de turno noche, novedad en billete de 50k..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform active:scale-95 transition-all text-xl"
                >
                  CERRAR CAJA Y GENERAR REPORTE
                </button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-center font-medium border border-yellow-200">
                No tienes movimientos pendientes para cerrar en tu turno.
              </div>
            )}
          </div>

          {/* Pending tickets table */}
          {personalData.tickets && personalData.tickets.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 overflow-hidden">
              <h4 className="text-base font-bold text-gray-700 mb-3">
                Tickets Cobrados Pendientes de Cierre
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-5 py-2.5">Placa</th>
                      <th className="px-5 py-2.5">Tipo</th>
                      <th className="px-5 py-2.5">Entrada</th>
                      <th className="px-5 py-2.5">Salida</th>
                      <th className="px-5 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalData.tickets.map((t) => (
                      <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-5 py-3 font-bold font-mono text-gray-900">
                          {t.licensePlate}
                        </td>
                        <td className="px-5 py-3">{t.vehicleTypeName}</td>
                        <td className="px-5 py-3">
                          {new Date(t.entryTime).toLocaleTimeString('es-CO')}
                        </td>
                        <td className="px-5 py-3">
                          {new Date(t.exitTime).toLocaleTimeString('es-CO')}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-green-600">
                          ${Number(t.totalAmount || 0).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending subscriptions table */}
          {personalData.subscriptionPayments && personalData.subscriptionPayments.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 overflow-hidden">
              <h4 className="text-base font-bold text-gray-700 mb-3">
                Pagos de Mensualidades Pendientes de Cierre
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-5 py-2.5">Placa</th>
                      <th className="px-5 py-2.5">Cliente</th>
                      <th className="px-5 py-2.5">Concepto</th>
                      <th className="px-5 py-2.5">Hora</th>
                      <th className="px-5 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalData.subscriptionPayments.map((p) => (
                      <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-5 py-3 font-bold font-mono text-gray-900">
                          {p.licensePlate}
                        </td>
                        <td className="px-5 py-3">{p.customerName}</td>
                        <td className="px-5 py-3">
                          {p.paymentType === 'SUBSCRIPTION_RENEWAL'
                            ? 'Renovación Mensualidad'
                            : 'Nueva Mensualidad'}
                        </td>
                        <td className="px-5 py-3">
                          {new Date(p.paidAt).toLocaleTimeString('es-CO')}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-purple-600">
                          ${Number(p.amount || 0).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cashier's own past history table */}
          {!isSupervisor && (
            <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-4">
                Mi Historial de Cierres de Turno
              </h4>
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-5 py-3">Fecha y Hora</th>
                        <th className="px-5 py-3 text-center">Tickets</th>
                        <th className="px-5 py-3 text-center">Mensualidades</th>
                        <th className="px-5 py-3 text-right">Total Recaudado</th>
                        <th className="px-5 py-3 text-center">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((c) => (
                        <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {new Date(c.closedAt).toLocaleString('es-CO')}
                          </td>
                          <td className="px-5 py-3 text-center">{c.totalTickets}</td>
                          <td className="px-5 py-3 text-center">{c.totalSubscriptions || 0}</td>
                          <td className="px-5 py-3 text-right font-bold text-blue-600">
                            ${Number(c.totalCollected || 0).toLocaleString('es-CO')}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => handleViewDetail(c.id)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded border"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No tienes cierres registrados todavía.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Confirmar Cierre de Caja
            </h3>
            <p className="text-gray-600 mb-4">
              Estás a punto de cerrar la caja con un total de{' '}
              <span className="font-bold text-blue-600">
                ${Number(personalData.totalCollected || 0).toLocaleString('es-CO')}
              </span>
              .
              <br />
              Esta acción consolidará tickets ({personalData.totalTickets}) y mensualidades (
              {personalData.totalSubscriptions}) de tu turno.
            </p>
            {closeNotes && (
              <p className="text-xs bg-gray-50 p-2.5 rounded border text-gray-600 mb-4">
                <strong>Nota:</strong> {closeNotes}
              </p>
            )}
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

      {/* Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                  Comprobante de Cierre #{selectedClosingDetail?.id}
                </span>
                <h3 className="text-xl font-bold text-gray-800 mt-1">
                  Cierre de Caja por {selectedClosingDetail?.cashierUsername}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fecha: {selectedClosingDetail?.closedAt ? new Date(selectedClosingDetail.closedAt).toLocaleString('es-CO') : ''}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 text-center text-gray-500">Cargando desglose...</div>
            ) : selectedClosingDetail ? (
              <div className="overflow-y-auto flex-1 space-y-5 pr-1">
                {/* Metrics in Modal */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                    <p className="text-[11px] font-bold text-blue-600 uppercase">
                      Total Recaudado
                    </p>
                    <p className="text-xl font-extrabold text-blue-900">
                      ${Number(selectedClosingDetail.totalCollected || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase">
                      Tickets ({selectedClosingDetail.totalTickets})
                    </p>
                    <p className="text-lg font-bold text-emerald-900">
                      ${Number(selectedClosingDetail.ticketsAmount || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                    <p className="text-[11px] font-bold text-purple-600 uppercase">
                      Mensualidades ({selectedClosingDetail.totalSubscriptions})
                    </p>
                    <p className="text-lg font-bold text-purple-900">
                      ${Number(selectedClosingDetail.subscriptionsAmount || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>

                {selectedClosingDetail.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg border text-xs text-gray-700">
                    <strong>Observaciones:</strong> {selectedClosingDetail.notes}
                  </div>
                )}

                {/* Tickets list */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-2">
                    Tickets Consolidados ({selectedClosingDetail.tickets?.length || 0})
                  </h4>
                  {selectedClosingDetail.tickets && selectedClosingDetail.tickets.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left text-gray-600">
                        <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2">Placa</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Entrada</th>
                            <th className="px-3 py-2">Salida</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedClosingDetail.tickets.map((t) => (
                            <tr key={t.id}>
                              <td className="px-3 py-1.5 font-bold font-mono text-gray-900">
                                {t.licensePlate}
                              </td>
                              <td className="px-3 py-1.5">{t.vehicleTypeName}</td>
                              <td className="px-3 py-1.5">
                                {new Date(t.entryTime).toLocaleTimeString('es-CO')}
                              </td>
                              <td className="px-3 py-1.5">
                                {new Date(t.exitTime).toLocaleTimeString('es-CO')}
                              </td>
                              <td className="px-3 py-1.5 text-right font-bold text-green-700">
                                ${Number(t.totalAmount || 0).toLocaleString('es-CO')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No hubo tickets en este cierre.</p>
                  )}
                </div>

                {/* Subscriptions list */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-2">
                    Mensualidades Consolidadas ({selectedClosingDetail.subscriptionPayments?.length || 0})
                  </h4>
                  {selectedClosingDetail.subscriptionPayments &&
                  selectedClosingDetail.subscriptionPayments.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left text-gray-600">
                        <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2">Placa</th>
                            <th className="px-3 py-2">Cliente</th>
                            <th className="px-3 py-2">Concepto</th>
                            <th className="px-3 py-2">Hora</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedClosingDetail.subscriptionPayments.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-1.5 font-bold font-mono text-gray-900">
                                {p.licensePlate}
                              </td>
                              <td className="px-3 py-1.5">{p.customerName}</td>
                              <td className="px-3 py-1.5">
                                {p.paymentType === 'SUBSCRIPTION_RENEWAL'
                                  ? 'Renovación'
                                  : 'Nueva Mensualidad'}
                              </td>
                              <td className="px-3 py-1.5">
                                {new Date(p.paidAt).toLocaleTimeString('es-CO')}
                              </td>
                              <td className="px-3 py-1.5 text-right font-bold text-purple-700">
                                ${Number(p.amount || 0).toLocaleString('es-CO')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No hubo pagos de mensualidades en este cierre.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t mt-4 flex justify-between items-center">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                🖨️ Imprimir Comprobante
              </button>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg border border-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
