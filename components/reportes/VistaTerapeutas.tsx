import React, { useMemo } from 'react';
import { BarrasHorizontales } from '../charts/BarrasHorizontales';
import { TablaDatos, ColumnaTabla } from '../charts/TablaDatos';
import { FilaTooltip, SinDatos, TarjetaGrafico } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import { FacturaAnalizada, FilaTerapeuta, PersonaRaw, resumenPorTerapeuta, TurnoAnalizado } from '../../utils/reportes';

interface Props {
  facturas: FacturaAnalizada[];
  turnos: TurnoAnalizado[];
  personas: PersonaRaw[];
  terapeutasSeleccionados: string[];
  onAlternarTerapeuta: (id: string) => void;
  actualizando: boolean;
}

// Solo administración: comparación entre terapeutas.
export const VistaTerapeutas: React.FC<Props> = ({
  facturas, turnos, personas, terapeutasSeleccionados, onAlternarTerapeuta, actualizando,
}) => {
  const filas = useMemo(() => resumenPorTerapeuta(facturas, turnos, personas), [facturas, turnos, personas]);

  if (!filas.length) {
    return <div className="rounded-xl border border-black/5 bg-white shadow-sm"><SinDatos texto="No hay actividad para estos filtros." /></div>;
  }

  const columnas: ColumnaTabla<FilaTerapeuta>[] = [
    { clave: 'nombre', titulo: 'Terapeuta', valor: t => t.nombre },
    { clave: 'sesiones', titulo: 'Sesiones', valor: t => t.sesiones, mostrar: t => fmt.entero(t.sesiones), numerica: true },
    { clave: 'turnos', titulo: 'Turnos', valor: t => t.turnos, numerica: true },
    { clave: 'facturado', titulo: 'Facturado', valor: t => t.facturado, mostrar: t => fmt.moneda(t.facturado), numerica: true },
    { clave: 'cobrado', titulo: 'Cobrado', valor: t => t.cobrado, mostrar: t => fmt.moneda(t.cobrado), numerica: true },
    { clave: 'vencido', titulo: 'Vencido', valor: t => t.vencido, mostrar: t => (t.vencido ? fmt.moneda(t.vencido) : '—'), numerica: true },
    { clave: 'dias', titulo: 'Días prom. de cobro', valor: t => t.diasPromCobro, mostrar: t => fmt.dias(t.diasPromCobro), numerica: true },
    { clave: 'plazo', titulo: 'Cobradas en plazo', valor: t => t.pctEnPlazo, mostrar: t => fmt.pct(t.pctEnPlazo), numerica: true },
  ];

  return (
    <div className="space-y-5">
      {/* Con un solo terapeuta, un gráfico de una barra no dice nada: alcanza con la tabla. */}
      {filas.length > 1 && <TarjetaGrafico
        titulo="Facturado por terapeuta"
        subtitulo="Tocá una barra para filtrar por ese terapeuta"
        actualizando={actualizando}
        tabla={<TablaDatos columnas={columnas.slice(0, 4)} filas={filas} claveFila={t => t.id} orden={{ clave: 'facturado', desc: true }} />}
      >
        <BarrasHorizontales
          filas={filas.map(t => ({
            clave: t.id,
            etiqueta: t.nombre,
            valor: t.facturado,
            color: tema.serie,
            seleccionada: terapeutasSeleccionados.includes(t.id),
            tooltip: (
              <>
                <div className="mb-1 text-xs font-medium text-slate-500">{t.nombre}</div>
                <FilaTooltip etiqueta="facturado" valor={fmt.moneda(t.facturado)} fuerte />
                <FilaTooltip etiqueta="sesiones" valor={fmt.entero(t.sesiones)} />
                <FilaTooltip etiqueta="vencido" valor={fmt.moneda(t.vencido)} />
              </>
            ),
          }))}
          formatoValor={fmt.monedaCompacta}
          onClickFila={onAlternarTerapeuta}
        />
      </TarjetaGrafico>}

      <TarjetaGrafico titulo="Detalle por terapeuta" subtitulo="Tocá un encabezado para ordenar">
        <TablaDatos columnas={columnas} filas={filas} claveFila={t => t.id} orden={{ clave: 'facturado', desc: true }} />
      </TarjetaGrafico>
    </div>
  );
};
