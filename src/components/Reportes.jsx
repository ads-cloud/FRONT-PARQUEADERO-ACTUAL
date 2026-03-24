import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Reportes() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) {
        toast.error("Seleccione ambas fechas");
        return;
    }
    setLoading(true);
    const toastId = toast.loading("Generando reporte...");
    try {
        const res = await axios.get(`/api/tickets/reports/income`, {
            params: { start: startDate, end: endDate }
        });
        setReport(res.data);
        toast.success("Reporte generado", { id: toastId });
    } catch (error) {
        console.error(error);
        toast.error("Error al generar reporte", { id: toastId });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
        <h2 className="text-2xl font-bold text-gray-800">Reportes de Ingresos</h2>
        
        {/* Controles */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                />
            </div>
            <button
                onClick={generateReport}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md shadow-md disabled:opacity-50 transition-colors"
            >
                {loading ? 'Generando...' : 'Generar Reporte'}
            </button>
        </div>

        {/* Resultados */}
        {report && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {/* Resumen por Tipo */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Ingresos por Tipo de Vehículo</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Tipo Vehículo</th>
                                    <th className="px-6 py-3 text-center">Cantidad</th>
                                    <th className="px-6 py-3 text-right">Total Ingresos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.byType.map((item, idx) => (
                                    <tr key={idx} className="bg-white border-b">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.tipo}</td>
                                        <td className="px-6 py-4 text-center">{item.cantidad}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">${item.total.toLocaleString('es-CO')}</td>
                                    </tr>
                                ))}
                                {report.byType.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-4 text-center text-gray-400">No hay datos en este rango</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detalle por Cajero */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Desempeño por Cajero</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(report.byCashier).map(([name, data]) => (
                            <div key={name} className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-gray-800 capitalize">{name}</h4>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                        Total: ${data.total.toLocaleString('es-CO')}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">Tickets procesados: {data.cantidad}</p>
                                <div className="space-y-1">
                                    {data.detalle.map((d, i) => (
                                        <div key={i} className="flex justify-between text-xs border-t border-gray-200 pt-1">
                                            <span>{d.tipo} ({d.cantidad})</span>
                                            <span className="font-medium">${d.total.toLocaleString('es-CO')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                         {Object.keys(report.byCashier).length === 0 && (
                             <p className="text-gray-400 text-sm col-span-full text-center">No hay actividad de cajeros registrada.</p>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}