import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Reportes() {
  const [activeReportTab, setActiveReportTab] = useState('income'); // 'income' | 'cash-closings' | 'handovers'

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  // Income Report state
  const [report, setReport] = useState(null);
  const [loadingIncome, setLoadingIncome] = useState(false);

  // Cash Closings Report state
  const [closingsReport, setClosingsReport] = useState([]);
  const [loadingClosings, setLoadingClosings] = useState(false);
  const [cashiersList, setCashiersList] = useState([]);
  const [selectedCashierId, setSelectedCashierId] = useState('');

  // Handovers Report state
  const [handoversReport, setHandoversReport] = useState([]);
  const [loadingHandovers, setLoadingHandovers] = useState(false);

  // Detail Modal for closings
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClosingDetail, setSelectedClosingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    // Load cashiers list for the filter
    axios
      .get('/api/users')
      .then((res) => setCashiersList(res.data || []))
      .catch(() => setCashiersList([]));
  }, []);

  const generateIncomeReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Seleccione ambas fechas');
      return;
    }
    setLoadingIncome(true);
    const toastId = toast.loading('Generando reporte de ingresos...');
    try {
      const res = await axios.get(`/api/tickets/reports/income`, {
        params: { start: startDate, end: endDate },
      });
      setReport(res.data);
      toast.success('Reporte generado', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Error al generar reporte de ingresos', { id: toastId });
    } finally {
      setLoadingIncome(false);
    }
  };

  const generateClosingsReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Seleccione ambas fechas');
      return;
    }
    setLoadingClosings(true);
    const toastId = toast.loading('Consultando cierres de caja...');
    try {
      const res = await axios.get('/api/cash-closings/history', {
        params: {
          startDate,
          endDate,
          cashierId: selectedCashierId || undefined,
        },
      });
      setClosingsReport(res.data || []);
      toast.success('Cierres de caja cargados', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar cierres de caja', { id: toastId });
    } finally {
      setLoadingClosings(false);
    }
  };

  const generateHandoversReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Seleccione ambas fechas');
      return;
    }
    setLoadingHandovers(true);
    const toastId = toast.loading('Consultando actas de entrega...');
    try {
      const res = await axios.get('/api/cash-closings/handovers-history', {
        params: { startDate, endDate },
      });
      setHandoversReport(res.data || []);
      toast.success('Actas de entrega cargadas', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar actas de entrega', { id: toastId });
    } finally {
      setLoadingHandovers(false);
    }
  };

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

  const closingsTotals = closingsReport.reduce(
    (acc, c) => ({
      total: acc.total + Number(c.totalCollected || 0),
      tickets: acc.tickets + Number(c.totalTickets || 0),
      subscriptions: acc.subscriptions + Number(c.totalSubscriptions || 0),
    }),
    { total: 0, tickets: 0, subscriptions: 0 },
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-5 rounded-xl shadow-xs border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Módulo de Reportes de Sede
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Informes consolidados de ingresos operacionales, auditoría de cierres y actas de entrega de turno.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-2 bg-white px-4 pt-3 rounded-t-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('income')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeReportTab === 'income'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          📈 Ingresos por Tipo de Vehículo
        </button>
        <button
          onClick={() => {
            setActiveReportTab('cash-closings');
            if (closingsReport.length === 0) generateClosingsReport();
          }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeReportTab === 'cash-closings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🧾 Cierres de Caja por Usuario
        </button>
        <button
          onClick={() => {
            setActiveReportTab('handovers');
            if (handoversReport.length === 0) generateHandoversReport();
          }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeReportTab === 'handovers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🤝 Actas de Entrega de Turno
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INGRESOS POR TIPO DE VEHICULO                                      */}
      {/* ========================================================================= */}
      {activeReportTab === 'income' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 p-2 text-sm border"
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
                className="border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 p-2 text-sm border"
              />
            </div>
            <button
              onClick={generateIncomeReport}
              disabled={loadingIncome}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-sm disabled:opacity-50 transition-colors"
            >
              {loadingIncome ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>

          {report && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md flex justify-between items-center">
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-80">
                    Total Recaudado en el Periodo
                  </p>
                  <h3 className="text-3xl font-extrabold mt-1">
                    ${Number(report.grandTotal || 0).toLocaleString('es-CO')}
                  </h3>
                </div>
                <span className="text-4xl">📈</span>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
                <h3 className="text-base font-bold text-gray-800 mb-4 border-b pb-2">
                  Ingresos por Concepto / Tipo de Vehículo
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-3">Categoría</th>
                        <th className="px-6 py-3 text-center">Operaciones</th>
                        <th className="px-6 py-3 text-right">Total Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byType.map((item, idx) => (
                        <tr key={idx} className="bg-white border-b">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {item.vehicleTypeName || item.vehicleTypeCode}
                          </td>
                          <td className="px-6 py-4 text-center">{item.count}</td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">
                            ${Number(item.total || 0).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                      {report.byType.length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-center text-gray-400">
                            No hay datos en este rango
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
                <h3 className="text-base font-bold text-gray-800 mb-4 border-b pb-2">
                  Desempeño Operativo por Cajero
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(report.byCashier).map(([name, data]) => (
                    <div
                      key={name}
                      className="border rounded-xl p-4 bg-gray-50 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                          👤 {name}
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded">
                          ${Number(data.total || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Operaciones procesadas: {data.count}
                      </p>
                      <div className="space-y-1">
                        {(data.breakdown || []).map((d, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs border-t border-gray-200 pt-1"
                          >
                            <span>
                              {d.category} ({d.count})
                            </span>
                            <span className="font-medium text-gray-700">
                              ${Number(d.total || 0).toLocaleString('es-CO')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(report.byCashier).length === 0 && (
                    <p className="text-gray-400 text-sm col-span-full text-center">
                      No hay actividad de cajeros registrada en este rango.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CIERRES DE CAJA POR USUARIO                                        */}
      {/* ========================================================================= */}
      {activeReportTab === 'cash-closings' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Cajero / Usuario
              </label>
              <select
                value={selectedCashierId}
                onChange={(e) => setSelectedCashierId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">Todos los cajeros de la sede</option>
                {cashiersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.username}
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
                className="w-full border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 p-2 text-sm border"
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
                className="w-full border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 p-2 text-sm border"
              />
            </div>
            <button
              onClick={generateClosingsReport}
              disabled={loadingClosings}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-sm disabled:opacity-50 transition-colors"
            >
              {loadingClosings ? 'Consultando...' : 'Consultar Cierres'}
            </button>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-xs font-bold text-blue-600 uppercase">
                Total Recaudado en Cierres
              </p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">
                ${Number(closingsTotals.total || 0).toLocaleString('es-CO')}
              </p>
              <p className="text-xs text-blue-500 mt-0.5">{closingsReport.length} cierre(s)</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase">
                Tickets Cerrados
              </p>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                {closingsTotals.tickets} tickets
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
              <p className="text-xs font-bold text-purple-600 uppercase">
                Mensualidades Cerradas
              </p>
              <p className="text-2xl font-extrabold text-purple-900 mt-1">
                {closingsTotals.subscriptions} mensualidades
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-base">
                Historial de Cierres de Caja por Usuario
              </h3>
              <span className="text-xs text-gray-500">
                {closingsReport.length} registro(s) encontrados
              </span>
            </div>

            {closingsReport.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
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
                    {closingsReport.map((c) => (
                      <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {new Date(c.closedAt).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3 font-bold text-gray-800">
                          👤 {c.cashierUsername}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="font-bold">{c.totalTickets}</span>
                          <span className="text-xs text-gray-400 block">
                            ${Number(c.ticketsAmount || 0).toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="font-bold">{c.totalSubscriptions || 0}</span>
                          <span className="text-xs text-gray-400 block">
                            ${Number(c.subscriptionsAmount || 0).toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-extrabold text-blue-700 whitespace-nowrap">
                          ${Number(c.totalCollected || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-3 text-center text-xs text-gray-500 max-w-[160px] truncate">
                          {c.notes || '-'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleViewDetail(c.id)}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
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
                No hay cierres de caja en el periodo seleccionado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACTAS DE ENTREGA DE TURNO (HANDOVERS)                              */}
      {/* ========================================================================= */}
      {activeReportTab === 'handovers' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 p-2 text-sm border"
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
                className="border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 p-2 text-sm border"
              />
            </div>
            <button
              onClick={generateHandoversReport}
              disabled={loadingHandovers}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-sm disabled:opacity-50 transition-colors"
            >
              {loadingHandovers ? 'Consultando...' : 'Consultar Actas de Relevo'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-base">
                Actas de Entrega y Relevo de Turno Registradas
              </h3>
              <span className="text-xs text-gray-500">
                {handoversReport.length} acta(s) encontradas
              </span>
            </div>

            {handoversReport.length > 0 ? (
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
                    {handoversReport.map((h) => (
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
                              +${Number(h.difference).toLocaleString('es-CO')}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                              -${Math.abs(Number(h.difference)).toLocaleString('es-CO')}
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
                No hay actas de entrega de turno registradas en este periodo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal for cash closing */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                  Comprobante #{selectedClosingDetail?.id}
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
