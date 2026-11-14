import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function CajaCierre() {
  const { user, setSessionFromHandover } = useAuth();
  const userRole = String(
    user?.role?.code || user?.role || user?.roleCode || ''
  ).trim().toUpperCase();
  const isSupervisor = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // Active sub-tab: 'history' for Supervisors, 'personal' for Cashiers
  const [activeTab, setActiveTab] = useState(isSupervisor ? 'history' : 'personal');

  useEffect(() => {
    setActiveTab(isSupervisor ? 'history' : 'personal');
  }, [isSupervisor]);

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

  // Handovers history (for supervisors)
  const [handoversHistory, setHandoversHistory] = useState([]);

  // Detail Modal for standard cash closing
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClosingDetail, setSelectedClosingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Handover Modal State
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverStatus, setHandoverStatus] = useState(null);
  const [loadingHandoverStatus, setLoadingHandoverStatus] = useState(false);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Handover Form Data
  const [handoverForm, setHandoverForm] = useState({
    incomingUsername: '',
    incomingPassword: '',
    outgoingPassword: '',
    baseAmount: 100000,
    physicalCashDelivered: '',
    notes: '',
  });

  // Completed Handover Receipt Modal
  const [completedHandover, setCompletedHandover] = useState(null);
  const [handoverReceiptModalOpen, setHandoverReceiptModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [
        axios.get('/api/cash-closings/status').catch(() => ({ data: {} })),
        axios.get('/api/cash-closings/history', {
          params: {
            cashierId: isSupervisor ? (selectedCashierId || undefined) : undefined,
            startDate: isSupervisor ? (startDate || undefined) : undefined,
            endDate: isSupervisor ? (endDate || undefined) : undefined,
          },
        }).catch(() => ({ data: [] })),
      ];

      if (isSupervisor) {
        promises.push(axios.get('/api/cash-closings/open-shifts').catch(() => ({ data: [] })));
        promises.push(axios.get('/api/users').catch(() => ({ data: [] })));
        promises.push(axios.get('/api/cash-closings/handovers-history').catch(() => ({ data: [] })));
      }

      const results = await Promise.all(promises);
      setPersonalData(results[0]?.data || {});
      setHistory(results[1]?.data || []);

      if (isSupervisor) {
        setOpenShifts(results[2]?.data || []);
        setCashiersList(results[3]?.data || []);
        setHandoversHistory(results[4]?.data || []);
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

  // Quick preset filters for date range
  const setQuickDateFilter = async (type) => {
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let start = '';
    let end = formatDate(today);

    if (type === 'today') {
      start = formatDate(today);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      start = formatDate(past);
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDate(firstDay);
    } else if (type === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);

    try {
      const res = await axios.get('/api/cash-closings/history', {
        params: {
          cashierId: selectedCashierId || undefined,
          startDate: start || undefined,
          endDate: end || undefined,
        },
      });
      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al aplicar filtro de fechas');
    }
  };

  // View closing detail modal
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

  // =========================================================================
  // HANDOVER / ENTREGA DE TURNO FLOW
  // =========================================================================
  const openHandoverModal = async () => {
    try {
      setLoadingHandoverStatus(true);
      setHandoverModalOpen(true);
      const res = await axios.get('/api/cash-closings/handover-status');
      setHandoverStatus(res.data);

      const defaultBase = res.data?.defaultBaseAmount || 100000;
      const pendingTotal = res.data?.pendingMovements?.total || 0;
      const suggestedCash = defaultBase + pendingTotal;

      setHandoverForm({
        incomingUsername: '',
        incomingPassword: '',
        outgoingPassword: '',
        baseAmount: defaultBase,
        physicalCashDelivered: suggestedCash,
        notes: '',
      });
    } catch (err) {
      console.error(err);
      toast.error('Error al consultar estado previo de entrega de turno');
      setHandoverModalOpen(false);
    } finally {
      setLoadingHandoverStatus(false);
    }
  };

  const handleExecuteHandover = async (e) => {
    e.preventDefault();
    if (!handoverForm.incomingUsername || !handoverForm.incomingPassword) {
      toast.error('Ingrese el usuario y la contraseña del cajero entrante');
      return;
    }

    try {
      setSubmittingHandover(true);
      const toastId = toast.loading('Procesando entrega y relevo de turno...');

      const res = await axios.post('/api/cash-closings/handover', {
        incomingUsername: handoverForm.incomingUsername,
        incomingPassword: handoverForm.incomingPassword,
        outgoingPassword: handoverForm.outgoingPassword || undefined,
        baseAmount: Number(handoverForm.baseAmount || 0),
        physicalCashDelivered: Number(handoverForm.physicalCashDelivered || 0),
        notes: handoverForm.notes || undefined,
      });

      toast.success(res.data.message || 'Turno entregado exitosamente', { id: toastId });
      setHandoverModalOpen(false);

      // Save handover details for printable receipt
      setCompletedHandover(res.data.handover);
      setHandoverReceiptModalOpen(true);

      // Switch active session to the incoming cashier!
      if (res.data.auth && setSessionFromHandover) {
        await setSessionFromHandover(res.data.auth);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al realizar entrega de turno';
      toast.error(msg);
    } finally {
      setSubmittingHandover(false);
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

  // Real-time calculation of handover difference
  const pendingToClose = handoverStatus?.pendingMovements?.total || 0;
  const expectedPhysical = Number(handoverForm.baseAmount || 0) + pendingToClose;
  const countedPhysical = Number(handoverForm.physicalCashDelivered || 0);
  const handoverDiff = countedPhysical - expectedPhysical;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
      {/* Tabs navigation: ONLY for Supervisors */}
      {isSupervisor && (
        <div className="flex border-b border-gray-200 space-x-2 bg-white px-4 pt-3 rounded-t-xl shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            📊 Reportes y Estadísticas de Cierres
            <span className="text-xs bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full">
              {history.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('open-shifts')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'open-shifts'
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
            onClick={() => setActiveTab('handovers')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'handovers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            🤝 Actas de Entrega de Turno
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold py-0.5 px-2 rounded-full">
              {handoversHistory.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'personal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            💵 Mi Turno de Caja
            {hasPendingPersonalMovements && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold py-0.5 px-2 rounded-full">
                ${Number(personalData.totalCollected || 0).toLocaleString('es-CO')}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: HISTORIAL DE CIERRES Y REPORTES (ESTADÍSTICAS) - SOLO SUPERVISORES */}
      {/* ========================================================================= */}
      {isSupervisor && activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100">
            {/* Quick preset date buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                Filtros Rápidos:
              </span>
              <button
                type="button"
                onClick={() => setQuickDateFilter('today')}
                className="px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-lg transition-colors border border-gray-200"
              >
                📅 Hoy
              </button>
              <button
                type="button"
                onClick={() => setQuickDateFilter('7days')}
                className="px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-lg transition-colors border border-gray-200"
              >
                📆 Últimos 7 días
              </button>
              <button
                type="button"
                onClick={() => setQuickDateFilter('month')}
                className="px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-lg transition-colors border border-gray-200"
              >
                🗓️ Este Mes
              </button>
              <button
                type="button"
                onClick={() => setQuickDateFilter('all')}
                className="px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
              >
                🌐 Todo el Historial
              </button>
            </div>

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

          {/* Metric Cards */}
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

          {/* Table */}
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
                      <th className="px-5 py-3">Cajero</th>
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
                        <td className="px-5 py-3.5 text-center max-w-[200px] truncate text-xs text-gray-500">
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
      {/* TAB 2: TURNOS ABIERTOS EN TIEMPO REAL - SOLO SUPERVISORES                 */}
      {/* ========================================================================= */}
      {isSupervisor && activeTab === 'open-shifts' && (
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
                          Tickets ({shift.totalTickets})
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
      {/* TAB 3: ACTAS DE ENTREGA DE TURNO (HISTORIAL DE RELEVOS) - SOLO SUPERVISORES */}
      {/* ========================================================================= */}
      {isSupervisor && activeTab === 'handovers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 text-base">
                  Actas Digitales de Entrega y Relevo de Turno
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Auditoría de traspaso de caja entre cajeros, bases de efectivo y diferencias físicas.
                </p>
              </div>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                {handoversHistory.length} relevo(s) registrados
              </span>
            </div>

            {handoversHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-5 py-3">Fecha y Hora</th>
                      <th className="px-5 py-3">Cajero Saliente</th>
                      <th className="px-5 py-3">Cajero Entrante</th>
                      <th className="px-5 py-3 text-right">Base Entregada</th>
                      <th className="px-5 py-3 text-right">Cobros Relevo</th>
                      <th className="px-5 py-3 text-right">Total Turno</th>
                      <th className="px-5 py-3 text-right">Efectivo Físico</th>
                      <th className="px-5 py-3 text-center">Diferencia</th>
                      <th className="px-5 py-3 text-center">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {handoversHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-900">
                          {new Date(h.handoverAt).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-gray-800">
                          👤 {h.outgoingCashierUsername}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-blue-700">
                          👤 {h.incomingCashierUsername}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium">
                          ${Number(h.baseAmount || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                          ${Number(h.pendingClosedAmount || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                          ${Number(h.totalShiftAmount || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-blue-900">
                          ${Number(h.physicalCashDelivered || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {Number(h.difference || 0) === 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">
                              Cuadrado ($0)
                            </span>
                          ) : Number(h.difference || 0) > 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                              +${Number(h.difference).toLocaleString('es-CO')} (Sobrante)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                              -${Math.abs(Number(h.difference)).toLocaleString('es-CO')} (Faltante)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center text-xs text-gray-500 max-w-[160px] truncate">
                          {h.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <span className="text-3xl block mb-2">🤝</span>
                No hay actas de entrega de turno registradas aún en esta sede.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CIERRE DE CAJA OPERATIVO (TURNO ACTUAL)                                  */}
      {/* Para Cajeros: Vista única y directa (sin reportes ni historial).         */}
      {/* Para Supervisores: Accesible desde la pestaña 'Mi Turno de Caja'.        */}
      {/* ========================================================================= */}
      {(!isSupervisor || activeTab === 'personal') && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Mi Turno de Caja ({user?.username})
              </h3>
              <button
                onClick={openHandoverModal}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
              >
                🤝 Entregar Turno
              </button>
            </div>

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
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transform active:scale-95 transition-all text-lg"
                  >
                    CERRAR CAJA Y GENERAR REPORTE
                  </button>
                  <button
                    onClick={openHandoverModal}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transform active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
                  >
                    🤝 ENTREGAR TURNO A REEMPLAZO
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                <span className="font-medium text-sm">
                  No tienes movimientos pendientes para cerrar en tu turno.
                </span>
                <button
                  onClick={openHandoverModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  🤝 Entregar Turno al Siguiente Cajero
                </button>
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

          {/* Listado de cierres del cajero con modal de detalle */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">
                  Mi Historial de Cierres de Turno
                </h4>
                <p className="text-xs text-gray-500">
                  Cierres de turno realizados por tu usuario en esta sede.
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                {history.length} cierre(s)
              </span>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-5 py-3">Fecha y Hora</th>
                      <th className="px-5 py-3 text-center">Tickets</th>
                      <th className="px-5 py-3 text-center">Mensualidades</th>
                      <th className="px-5 py-3 text-right">Total Recaudado</th>
                      <th className="px-5 py-3 text-center">Notas</th>
                      <th className="px-5 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {new Date(c.closedAt).toLocaleString('es-CO')}
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
                        <td className="px-5 py-3.5 text-center text-xs text-gray-500 max-w-[180px] truncate">
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
                <span className="text-3xl block mb-2">📋</span>
                No tienes cierres de turno registrados todavía.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENTREGA Y RELEVO DE TURNO (HANDOVER)                               */}
      {/* ========================================================================= */}
      {handoverModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full my-8 max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 inline-block mb-1">
                  🤝 Acta de Entrega y Relevo de Turno
                </span>
                <h3 className="text-xl font-bold text-gray-800">
                  Transferencia de Turno de Caja
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cajero Saliente: <strong className="text-gray-800">{user?.username}</strong>
                </p>
              </div>
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>

            {loadingHandoverStatus ? (
              <div className="p-8 text-center text-gray-500">Cargando estado del turno...</div>
            ) : handoverStatus ? (
              <form onSubmit={handleExecuteHandover} className="overflow-y-auto flex-1 space-y-5 pr-1">
                {/* 1. Alerta de movimientos pendientes / cobros posteriores */}
                {handoverStatus.hasPendingMovements ? (
                  <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h4 className="font-bold text-amber-900 text-sm">
                          Cobros posteriores pendientes de consolidar ({handoverStatus.pendingMovements.ticketsCount + handoverStatus.pendingMovements.subscriptionsCount})
                        </h4>
                        <p className="text-xs text-amber-800 mt-1">
                          Tienes{' '}
                          <strong className="font-extrabold text-amber-950">
                            ${Number(handoverStatus.pendingMovements.total).toLocaleString('es-CO')}
                          </strong>{' '}
                          cobrados en tu sesión. Al confirmar el relevo, el sistema generará
                          automáticamente tu cierre final a tu nombre para que ningún cobro quede huérfano.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">
                        Caja al día (Sin cobros pendientes)
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Todos tus cobros ya fueron cerrados en cortes anteriores. Solo se entregará la base de efectivo.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Resumen total de la jornada del cajero saliente */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Resumen de tu Jornada Completa de Hoy
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border">
                      <span className="text-[10px] text-gray-400 block font-bold">CIERRES PREVIOS</span>
                      <span className="text-sm font-bold text-gray-700">
                        ${Number(handoverStatus.pastClosingsSummary.total).toLocaleString('es-CO')}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        ({handoverStatus.pastClosingsSummary.count} corte/s)
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border">
                      <span className="text-[10px] text-gray-400 block font-bold">COBROS EN RELEVO</span>
                      <span className="text-sm font-bold text-amber-700">
                        ${Number(handoverStatus.pendingMovements.total).toLocaleString('es-CO')}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        ({handoverStatus.pendingMovements.ticketsCount + handoverStatus.pendingMovements.subscriptionsCount} movs)
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-200">
                      <span className="text-[10px] text-blue-600 block font-bold">TOTAL OPERADO HOY</span>
                      <span className="text-sm font-extrabold text-blue-900">
                        ${Number(handoverStatus.accumulatedFullShiftTotal).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Conteo de Efectivo Físico en la Gaveta */}
                <div className="border border-gray-200 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Conteo Físico de Efectivo en Gaveta
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Base de Caja que recibe el nuevo cajero ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={handoverForm.baseAmount}
                        onChange={(e) =>
                          setHandoverForm({ ...handoverForm, baseAmount: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                      <span className="text-[11px] text-gray-400">
                        Fondo en sencillo/monedas para vueltos.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Total Efectivo Físico contado en gaveta ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={handoverForm.physicalCashDelivered}
                        onChange={(e) =>
                          setHandoverForm({
                            ...handoverForm,
                            physicalCashDelivered: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                      />
                      <span className="text-[11px] text-gray-400">
                        Base + dinero de cobros que queda físicamente.
                      </span>
                    </div>
                  </div>

                  {/* Diferencia en vivo */}
                  <div
                    className={`p-3 rounded-lg text-xs font-bold flex justify-between items-center ${handoverDiff === 0
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : handoverDiff > 0
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                  >
                    <span>
                      Dinero esperado: ${expectedPhysical.toLocaleString('es-CO')} (Base: $
                      {Number(handoverForm.baseAmount || 0).toLocaleString('es-CO')} + Relevo: $
                      {pendingToClose.toLocaleString('es-CO')})
                    </span>
                    <span>
                      {handoverDiff === 0
                        ? '✓ Cuadrado Exacto ($0)'
                        : handoverDiff > 0
                          ? `+ $${handoverDiff.toLocaleString('es-CO')} (Sobrante)`
                          : `- $${Math.abs(handoverDiff).toLocaleString('es-CO')} (Faltante)`}
                    </span>
                  </div>
                </div>

                {/* 4. Credenciales de Validación Cruzada (Firma Cajero Entrante y Saliente) */}
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Validación y Firma de Relevo (Ambos Cajeros)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Usuario del Cajero Entrante (Reemplazo) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: cajero2"
                        value={handoverForm.incomingUsername}
                        onChange={(e) =>
                          setHandoverForm({
                            ...handoverForm,
                            incomingUsername: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Contraseña del Cajero Entrante *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Contraseña de quien recibe"
                        value={handoverForm.incomingPassword}
                        onChange={(e) =>
                          setHandoverForm({
                            ...handoverForm,
                            incomingPassword: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contraseña del Cajero Saliente ({user?.username}) (Opcional por seguridad)
                    </label>
                    <input
                      type="password"
                      placeholder="Tu contraseña para firmar la entrega"
                      value={handoverForm.outgoingPassword}
                      onChange={(e) =>
                        setHandoverForm({
                          ...handoverForm,
                          outgoingPassword: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Observaciones / Novedades del Turno (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Se entrega gaveta cuadrada con 3 rollos de papel y $100.000 de base"
                      value={handoverForm.notes}
                      onChange={(e) =>
                        setHandoverForm({ ...handoverForm, notes: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setHandoverModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm border border-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHandover}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingHandover ? 'Procesando Relevo...' : '🤝 Confirmar Entrega y Relevar Turno'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPROBANTE OFICIAL DE ENTREGA DE TURNO (IMPRIMIBLE)               */}
      {/* ========================================================================= */}
      {handoverReceiptModalOpen && completedHandover && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200 text-gray-800">
            <div className="text-center border-b pb-4 mb-4">
              <span className="text-4xl block mb-2">🤝</span>
              <h3 className="text-xl font-extrabold text-gray-900 uppercase">
                Acta de Entrega de Turno #{completedHandover.id}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(completedHandover.handoverAt).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Cajero Saliente:</span>
                <span className="font-bold text-gray-800">
                  {completedHandover.outgoingCashierUsername}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Cajero Entrante (Activo):</span>
                <span className="font-bold text-blue-700">
                  {completedHandover.incomingCashierUsername}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Base entregada:</span>
                <span className="font-bold">
                  ${Number(completedHandover.baseAmount).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Cobros cerrados en relevo:</span>
                <span className="font-bold text-emerald-700">
                  ${Number(completedHandover.pendingClosedAmount).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Total operado en el turno:</span>
                <span className="font-bold">
                  ${Number(completedHandover.totalShiftAmount).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5 bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-700">Efectivo físico entregado:</span>
                <span className="font-extrabold text-indigo-900 text-base">
                  ${Number(completedHandover.physicalCashDelivered).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Diferencia:</span>
                <span
                  className={`font-bold ${Number(completedHandover.difference) === 0
                      ? 'text-green-600'
                      : Number(completedHandover.difference) > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }`}
                >
                  {Number(completedHandover.difference) === 0
                    ? 'Exacto ($0)'
                    : `$${Number(completedHandover.difference).toLocaleString('es-CO')}`}
                </span>
              </div>

              {completedHandover.notes && (
                <div className="text-xs bg-gray-50 p-2 rounded text-gray-600">
                  <strong>Observaciones:</strong> {completedHandover.notes}
                </div>
              )}
            </div>

            <div className="pt-4 border-t mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                🖨️ Imprimir Acta
              </button>
              <button
                onClick={() => {
                  setHandoverReceiptModalOpen(false);
                  fetchData();
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Comenzar Turno ({completedHandover.incomingCashierUsername})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for standard personal close */}
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

      {/* Detail Modal for any past cash closing */}
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
                  Fecha:{' '}
                  {selectedClosingDetail?.closedAt
                    ? new Date(selectedClosingDetail.closedAt).toLocaleString('es-CO')
                    : ''}
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
