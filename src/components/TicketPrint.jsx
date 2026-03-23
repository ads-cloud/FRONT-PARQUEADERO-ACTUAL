import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';

export const TicketPrint = forwardRef(({ ticket }, ref) => {
  if (!ticket) return null;

  return (
    <div ref={ref} id="ticket-print-area" className="p-4 bg-white border hidden print:block" style={{ width: '80mm' }}>
      <div className="text-center font-bold text-lg mb-2">PARQUEADERO EJEMPLO</div>
      <div className="text-center text-sm mb-4">NIT: 123456789</div>
      
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
        Conserve este tiquete
      </div>
    </div>
  );
});
