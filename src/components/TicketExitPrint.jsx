import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';

export const TicketExitPrint = forwardRef(({ receipt, parking }, ref) => {
  if (!receipt || !receipt.ticket) return null;

  const { ticket, minutos, valorMinuto, total } = receipt;

  return (
    <div
      ref={ref}
      id="ticket-exit-print-area"
      className="p-4 bg-white border hidden print:block"
      style={{ width: '80mm' }}
    >
      <div className="text-center font-bold text-lg mb-1">{parking?.nombre ?? 'Parqueadero'}</div>
      {parking?.nit && <div className="text-center text-xs mb-1">NIT: {parking.nit}</div>}
      {parking?.telefono && <div className="text-center text-xs mb-1">Tel: {parking.telefono}</div>}
      {parking?.horario && <div className="text-center text-xs mb-3">{parking.horario}</div>}

      <div className="text-center text-xs font-bold mb-3">COMPROBANTE DE SALIDA</div>

      <div className="border-t border-b py-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span>Ticket:</span>
          <span>#{ticket.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Placa:</span>
          <span className="font-bold text-base">{ticket.placa}</span>
        </div>
        <div className="flex justify-between">
          <span>Tipo:</span>
          <span>{ticket.tipoVehiculo}</span>
        </div>
        <div className="flex justify-between">
          <span>Entrada:</span>
          <span>{new Date(ticket.fechaIngreso).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Salida:</span>
          <span>{new Date(ticket.fechaSalida).toLocaleString()}</span>
        </div>
      </div>

      <div className="border-b pb-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span>Tiempo:</span>
          <span>{minutos} min</span>
        </div>
        <div className="flex justify-between">
          <span>Valor minuto:</span>
          <span>${Number(valorMinuto || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-base mt-1">
          <span>Total pagado:</span>
          <span>${Number(total || ticket.total || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex justify-center mb-3">
        <QRCode value={`${ticket.id}-${ticket.placa}-${ticket.fechaSalida}`} size={96} />
      </div>

      <div className="text-center text-xs">
        {parking?.observacion ?? 'Gracias por su visita'}
      </div>
    </div>
  );
});
