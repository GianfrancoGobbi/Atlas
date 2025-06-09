import React from 'react';
import { Factura, FacturaEstado, UserRole, ObraSocial, UserProfile } from '../../types';
import { Button } from '../shared/Button';
import { FACTURA_ESTADOS, FACTURA_ESTADO_COLORES } from '../../constants';
import { TARGET_TIMEZONE_IANA } from '../../utils/timezones';

interface FacturasTableProps {
  facturas: Factura[]; // Factura objects now include terapeutaNombre and obraSocialNombre
  onMarkAsPaid: (facturaId: string, currentStatus: FacturaEstado) => void;
  onDelete: (facturaId: string) => void;
  isLoading?: boolean;
  currentUserRole: UserRole;
  currentUserId?: string;
}

export const FacturasTable: React.FC<FacturasTableProps> = ({
  facturas,
  onMarkAsPaid,
  onDelete,
  isLoading,
  currentUserRole,
  currentUserId,
}) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z'); // Assume UTC if no Z
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: TARGET_TIMEZONE_IANA, // Display in target timezone
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  if (isLoading && facturas.length === 0) {
    return <p className="text-center text-brand-gray py-4">Cargando facturas...</p>;
  }

  if (facturas.length === 0) {
    return <p className="text-center text-brand-gray py-4">No hay facturas para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {currentUserRole === UserRole.ADMIN && (
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Terapeuta</th>
            )}
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Obra Social</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Monto</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Estado</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Generada</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Pagada</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Descripción</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {facturas.map((factura) => {
            const estadoInfo = FACTURA_ESTADO_COLORES[factura.estado];
            const canModify = currentUserRole === UserRole.ADMIN || 
                              (currentUserRole === UserRole.TERAPEUTA && factura.terapeutaId === currentUserId);
            
            return (
              <tr key={factura.id} className="hover:bg-slate-50 transition-colors">
                {currentUserRole === UserRole.ADMIN && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-gray">{factura.terapeutaNombre || 'N/A'}</td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-dark">{factura.obraSocialNombre || 'N/A'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-gray">{formatCurrency(factura.monto)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoInfo?.bgClass || 'bg-slate-200'} ${estadoInfo?.textClass || 'text-slate-800'}`}>
                    {FACTURA_ESTADOS[factura.estado] || factura.estado}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-gray">{formatDate(factura.fechaGenerada)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-gray">{factura.fechaPago ? formatDate(factura.fechaPago) : '---'}</td>
                <td className="px-4 py-3 text-sm text-brand-gray break-words max-w-xs truncate" title={factura.descripcion}>
                  {factura.descripcion || <span className="text-slate-400">N/A</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {canModify && factura.estado === FacturaEstado.IMPAGA && (
                    <Button variant="primary" size="sm" onClick={() => onMarkAsPaid(factura.id, factura.estado)}>
                      Marcar Paga
                    </Button>
                  )}
                   {canModify && factura.estado === FacturaEstado.PAGA && (
                    <Button variant="outline" size="sm" onClick={() => onMarkAsPaid(factura.id, factura.estado)}>
                      Marcar Impaga
                    </Button>
                  )}
                  {canModify && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(factura.id)}>
                      Eliminar
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};