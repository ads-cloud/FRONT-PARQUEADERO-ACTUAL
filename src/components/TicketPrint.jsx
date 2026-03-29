import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';

export const TicketPrint = forwardRef(({ ticket, parking }, ref) => {
  if (!ticket) return null;

  return (
    <div ref={ref} id="ticket-print-area" className="p-4 bg-white border hidden print:block" style={{ width: '80mm' }}>
      <div className="text-center font-bold text-lg mb-1">{parking?.nombre ?? 'Parqueadero'}</div>
      {parking?.nit && <div className="text-center text-xs mb-1">NIT: {parking.nit}</div>}
      {parking?.telefono && <div className="text-center text-xs mb-1">Tel: {parking.telefono}</div>}
      {parking?.horario && <div className="text-center text-xs mb-4">{parking.horario}</div>}
      {!parking?.telefono && !parking?.horario && <div className="mb-4" />}
      
      <div className="border-t border-b py-2 mb-4">
        <div className="flex justify-between">
          <span>Placa:</span>
          <span className="font-bold text-xl">{ticket.placa}</span>
        </div>
        <div className="flex justify-between">
          <span>Entrada:</span>
          <span>{new Date(ticket.fechaIngreso).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Tipo:</span>
          <span>{ticket.tipoVehiculo}</span>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <QRCode value={ticket.placa} size={128} />
      </div>

      <div className="text-center text-xs">
        Ticket #: {ticket.id}<br/>
        {parking?.observacion ?? 'Conserve este tiquete'}
      </div>
    </div>
  );
});
