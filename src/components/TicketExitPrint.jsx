import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';

export const TicketExitPrint = forwardRef(({ receipt, parking }, ref) => {
  if (!receipt || !receipt.ticket) return null;

  const { ticket, minutes, minuteRate, totalAmount, isSubscriptionCovered } = receipt;

  return (
    <div
      ref={ref}
      id="ticket-exit-print-area"
      className="p-4 bg-white border hidden print:block"
      style={{ width: '80mm' }}
    >
      <div className="text-center font-bold text-lg mb-1">
        {parking?.name ?? 'Parqueadero'}
      </div>
      {parking?.taxId && (
        <div className="text-center text-xs mb-1">NIT: {parking.taxId}</div>
      )}
      {parking?.phone && (
        <div className="text-center text-xs mb-1">Tel: {parking.phone}</div>
      )}
      {parking?.schedule && (
        <div className="text-center text-xs mb-3">{parking.schedule}</div>
      )}

      <div className="text-center text-xs font-bold mb-3">
        COMPROBANTE DE SALIDA
      </div>

      <div className="border-t border-b py-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span>Ticket:</span>
          <span>#{ticket.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Placa:</span>
          <span className="font-bold text-base">{ticket.licensePlate}</span>
        </div>
        <div className="flex justify-between">
          <span>Tipo:</span>
          <span>{ticket.vehicleTypeName || ticket.vehicleTypeCode}</span>
        </div>
        <div className="flex justify-between">
          <span>Entrada:</span>
          <span>{new Date(ticket.entryTime).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Salida:</span>
          <span>{new Date(ticket.exitTime).toLocaleString()}</span>
        </div>
      </div>

      <div className="border-b pb-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span>Tiempo:</span>
          <span>{minutes} min</span>
        </div>
        {isSubscriptionCovered ? (
          <div className="text-center font-bold text-xs my-1">
            CUBIERTO POR MENSUALIDAD VIGENTE
          </div>
        ) : (
          <div className="flex justify-between">
            <span>Valor minuto:</span>
            <span>${Number(minuteRate || 0).toLocaleString('es-CO')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-1">
          <span>Total pagado:</span>
          <span>
            ${Number(totalAmount ?? ticket.totalAmount ?? 0).toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      <div className="flex justify-center mb-3">
        <QRCode
          value={`${ticket.id}-${ticket.licensePlate}-${ticket.exitTime}`}
          size={96}
        />
      </div>

      <div className="text-center text-xs">
        {parking?.notes ?? 'Gracias por su visita'}
      </div>
    </div>
  );
});
