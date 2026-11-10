import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';

export const TicketPrint = forwardRef(({ ticket, parking }, ref) => {
  if (!ticket) return null;

  return (
    <div
      ref={ref}
      id="ticket-print-area"
      className="p-4 bg-white border hidden print:block"
      style={{ width: '80mm' }}
    >
      {parking?.companyName && (
        <div className="text-center font-bold text-sm uppercase">
          {parking.companyName}
        </div>
      )}
      <div className="text-center font-bold text-lg mb-1">
        {parking?.name ?? 'Parqueadero'}
      </div>
      {parking?.taxId && (
        <div className="text-center text-xs mb-1">NIT: {parking.taxId}</div>
      )}
      {parking?.address && (
        <div className="text-center text-xs mb-1">{parking.address}</div>
      )}
      {parking?.phone && (
        <div className="text-center text-xs mb-1">Tel: {parking.phone}</div>
      )}
      {parking?.schedule && (
        <div className="text-center text-xs mb-4">{parking.schedule}</div>
      )}
      {!parking?.phone && !parking?.schedule && <div className="mb-4" />}

      <div className="border-t border-b py-2 mb-4">
        <div className="flex justify-between">
          <span>Placa:</span>
          <span className="font-bold text-xl">{ticket.licensePlate}</span>
        </div>
        <div className="flex justify-between">
          <span>Entrada:</span>
          <span>{new Date(ticket.entryTime).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Tipo:</span>
          <span>{ticket.vehicleTypeName || ticket.vehicleTypeCode}</span>
        </div>
        {ticket.hasActiveSubscription && (
          <div className="text-center text-xs font-bold mt-2 pt-1 border-t">
            ★ MENSUALIDAD VIGENTE ★
          </div>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <QRCode value={ticket.licensePlate} size={128} />
      </div>

      <div className="text-center text-xs">
        Ticket #: {ticket.id}
        <br />
        {parking?.notes ?? 'Conserve este tiquete'}
      </div>
    </div>
  );
});
