import React, { useEffect, useMemo, useState } from 'react';
import { Burbujas } from '../charts/Burbujas';
import { TablaDatos, ColumnaTabla } from '../charts/TablaDatos';
import { FilaTooltip, IconoEstado, Indicador, SinDatos, TarjetaGrafico, VistaVacia } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import { deltaValor } from '../../utils/comparaciones';
import { FacturaAnalizada } from '../../utils/reportes';
import {
  FilaRentabilidad, MESES_CONGELADO, META_DSO, mesIso, rentabilidadPorObraSocial, resumirRentabilidad, ventanasRentabilidad,
} from '../../utils/rentabilidad';

const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';
const REFERENCIA_DIAS = 30;

type Semaforo = { color: string; icono: 'bien' | 'alerta' | 'critico'; texto: string };

const semaforo = (meses: number): Semaforo =>
  meses <= 2 ? { color: tema.estados.en_plazo, icono: 'bien', texto: 'Al día' }
    : meses < MESES_CONGELADO ? { color: tema.estados.con_atraso, icono: 'alerta', texto: 'Atrasado' }
      : { color: tema.estados.vencida, icono: 'critico', texto: 'Congelado' };

const ChipMeses: React.FC<{ meses: number | null }> = ({ meses }) => {
  if (meses === null) return <span className="text-slate-400">—</span>;
  const s = semaforo(meses);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
      <IconoEstado tipo={s.icono} />
      <span className="tabular-nums">{meses} m</span> · {s.texto}
    </span>
  );
};

const conSigno = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt.decimal(Math.abs(v * 100))} %`);
const pct1 = (v: number | null) => (v === null ? '—' : `${fmt.decimal(v * 100)} %`);
const moneda = (v: number | null) => (v === null ? '—' : fmt.moneda(v));

const Variacion: React.FC<{ v: number | null }> = ({ v }) => (
  <span className={v === null ? 'text-slate-400' : v < 0 ? 'font-medium text-red-600' : 'text-slate-700'}>{conSigno(v)}</span>
);

// Input del supuesto de inflación: se edita como texto y avisa solo cuando el número es válido.
const ControlInflacion: React.FC<{ valor: number; onCambiar: (v: number) => void }> = ({ valor, onCambiar }) => {
  const [texto, setTexto] = useState(fmt.decimal(valor * 100));
  useEffect(() => {
    const actual = Number(texto.replace(',', '.'));
    if (!Number.isFinite(actual) || Math.abs(actual / 100 - valor) > 1e-9) setTexto(fmt.decimal(valor * 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  return (
    <label
      className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-600"
      title="Supuesto editable: inflación mensual que se usa para llevar los cobros a pesos del día de la factura."
    >
      Inflación mensual
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={e => {
          setTexto(e.target.value);
          const n = Number(e.target.value.replace(',', '.'));
          if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 50) onCambiar(n / 100);
        }}
        aria-label="Inflación mensual supuesta, en porcentaje"
        className="w-12 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs tabular-nums text-slate-800 focus:border-primary focus:outline-none"
      />
      % <span className="text-slate-400">(supuesto)</span>
    </label>
  );
};

interface Props {
  facturas: FacturaAnalizada[]; // ya filtradas por obra social, terapeuta y área; sin período ni estado
  hoy: number;
  inflacionMensual: number; // fracción, p. ej. 0.046
  onCambiarInflacion: (v: number) => void;
  actualizando: boolean;
}

// Cuánto se pierde por inflación (aranceles quietos, cobros tardíos) y a quién reclamar.
// Usa ventanas fijas (12 meses cerrados, último trimestre completo): el filtro de período no aplica.
export const VistaRentabilidad: React.FC<Props> = ({ facturas, hoy, inflacionMensual, onCambiarInflacion, actualizando }) => {
  const i = inflacionMensual;
  const v = useMemo(() => ventanasRentabilidad(hoy), [hoy]);
  const filas = useMemo(() => rentabilidadPorObraSocial(facturas, hoy, i), [facturas, hoy, i]);
  const r = useMemo(() => resumirRentabilidad(facturas, filas, hoy, i), [facturas, filas, hoy, i]);

  if (!facturas.length) return <VistaVacia texto="No hay facturas para estos filtros." />;

  const mesTxt = (m: number | null) => (m === null ? '—' : fmt.mes(mesIso(m)));
  const doceTxt = `${fmt.mes(diaIsoMes(v.doceMeses.desde))}–${fmt.mes(diaIsoMes(v.doceMeses.hasta))}`;
  const { congeladas, interanual, dso } = r;

  const columnas: ColumnaTabla<FilaRentabilidad>[] = [
    { clave: 'nombre', titulo: 'Obra social', valor: f => f.nombre, mostrar: f => <span className="block max-w-[11rem] truncate" title={f.nombre}>{f.nombre}</span> },
    { clave: 'ses', titulo: 'Ses. 12 m', valor: f => f.sesiones12, mostrar: f => fmt.entero(f.sesiones12), numerica: true },
    { clave: 'arTrim', titulo: `Arancel ${v.trimestre.etiqueta}`, valor: f => f.arancelTrim, mostrar: f => moneda(f.arancelTrim), numerica: true },
    {
      clave: 'ultimo', titulo: 'Último aumento', valor: f => f.ultimoAumento,
      mostrar: f => {
        if (f.ultimoAumento === null) return '—';
        const sinFacturar = f.ultimoMesConDatos !== null && v.mesActual - f.ultimoMesConDatos >= 3;
        return (
          <span className="whitespace-nowrap">
            {f.huboAumento
              ? mesTxt(f.ultimoAumento)
              : <span className="text-slate-500" title="No se detectó ningún aumento desde el primer mes con datos">ninguno desde {mesTxt(f.ultimoAumento)}</span>}
            {sinFacturar && <span className="block text-[11px] text-slate-500">sin facturar desde {mesTxt(f.ultimoMesConDatos)}</span>}
          </span>
        );
      },
    },
    { clave: 'meses', titulo: 'Sin aumento', valor: f => f.mesesSinAumento, mostrar: f => <ChipMeses meses={f.mesesSinAumento} /> },
    { clave: 'varN', titulo: 'Var. nominal', valor: f => f.varNominal, mostrar: f => <Variacion v={f.varNominal} />, numerica: true },
    { clave: 'varR', titulo: 'Var. real', valor: f => f.varReal, mostrar: f => <Variacion v={f.varReal} />, numerica: true },
    { clave: 'dias', titulo: 'Días de cobro', valor: f => f.cobro.diasProm, mostrar: f => fmt.dias(f.cobro.diasProm), numerica: true },
    { clave: 'arReal', titulo: 'Arancel real al cobrar', valor: f => f.cobro.arancelReal, mostrar: f => moneda(f.cobro.arancelReal), numerica: true },
    { clave: 'costo', titulo: 'Costo demora', valor: f => f.cobro.pct, mostrar: f => pct1(f.cobro.pct), numerica: true },
    { clave: 'pend', titulo: 'Impago hoy', valor: f => f.pendiente, mostrar: f => (f.pendiente ? fmt.monedaCompacta(f.pendiente) : '—'), numerica: true },
  ];

  const conBurbuja = filas.filter(f => f.arancel12 !== null && f.cobro.diasProm !== null && f.sesiones12 > 0);
  const puntos = conBurbuja.map(f => ({
    clave: f.id,
    etiqueta: f.nombre,
    x: f.cobro.diasProm as number,
    y: f.arancel12 as number,
    tamano: f.sesiones12,
    tooltip: (
      <>
        <div className="mb-1 text-xs font-medium text-slate-900">{f.nombre}</div>
        <FilaTooltip etiqueta="arancel nominal" valor={moneda(f.arancel12)} fuerte />
        <FilaTooltip etiqueta="arancel real al cobrar" valor={moneda(f.cobro.arancelReal)} />
        <FilaTooltip etiqueta="costo de la demora" valor={pct1(f.cobro.pct)} />
        <FilaTooltip etiqueta="días de cobro" valor={fmt.dias(f.cobro.diasProm)} />
        <FilaTooltip etiqueta="sesiones 12 m" valor={fmt.entero(f.sesiones12)} />
      </>
    ),
  }));

  const columnasBurbujas: ColumnaTabla<FilaRentabilidad>[] = [
    { clave: 'nombre', titulo: 'Obra social', valor: f => f.nombre },
    { clave: 'dias', titulo: 'Días de cobro', valor: f => f.cobro.diasProm, mostrar: f => fmt.dias(f.cobro.diasProm), numerica: true },
    { clave: 'ar', titulo: 'Arancel nominal', valor: f => f.arancel12, mostrar: f => moneda(f.arancel12), numerica: true },
    { clave: 'arReal', titulo: 'Real al cobrar', valor: f => f.cobro.arancelReal, mostrar: f => moneda(f.cobro.arancelReal), numerica: true },
    { clave: 'costo', titulo: 'Costo', valor: f => f.cobro.pct, mostrar: f => pct1(f.cobro.pct), numerica: true },
    { clave: 'ses', titulo: 'Sesiones', valor: f => f.sesiones12, mostrar: f => fmt.entero(f.sesiones12), numerica: true },
  ];

  const desdeTxt = congeladas.desdeMasComun === null ? null
    : congeladas.cantidadMasComun === congeladas.cantidad
      ? `todas sin aumento desde ${mesTxt(congeladas.desdeMasComun)}`
      : congeladas.cantidadMasComun * 2 > congeladas.cantidad
        ? `${congeladas.cantidadMasComun} desde ${mesTxt(congeladas.desdeMasComun)}, la más vieja desde ${mesTxt(congeladas.desdeMasViejo)}`
        : `la más vieja sin aumento desde ${mesTxt(congeladas.desdeMasViejo)}`;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Indicador
          etiqueta="Costo inflacionario del cobro (12 m)"
          valor={fmt.monedaCompacta(r.costo.costo)}
          detalle={<span title={`Facturas cobradas en ${doceTxt} (${fmt.moneda(r.costo.cobrado)}): lo que valían al emitirlas contra lo que valían al cobrarlas, con ${fmt.decimal(i * 100)} % de inflación mensual. Promedio ${fmt.dias(r.costo.diasProm)} de emisión a cobro.`}>
            {pct1(r.costo.pct)} de lo cobrado · {doceTxt}
          </span>}
        />
        <Indicador
          etiqueta={`Aranceles congelados ≥ ${MESES_CONGELADO} meses`}
          icono={congeladas.cantidad ? <IconoEstado tipo="critico" /> : <IconoEstado tipo="bien" />}
          valor={`${congeladas.cantidad} de ${congeladas.total}`}
          detalle={<span title={`Obras sociales con facturación en ${doceTxt} (sin Particular). Aumento: un mes cuyo arancel supera en más de 3 % el máximo anterior.`}>
            {desdeTxt ?? 'Todas aumentaron en los últimos meses'}
          </span>}
        />
        <Indicador
          etiqueta={`Arancel real ${v.trimestre.etiqueta} vs ${v.trimestreAnterior.etiqueta}`}
          valor={conSigno(interanual.real)}
          detalle={<span title={`Arancel por sesión del trimestre contra el mismo trimestre del año anterior, a igual mezcla de obras sociales (solo las que facturaron en los dos, ponderadas por las sesiones actuales), deflactado con (1 + ${fmt.decimal(i * 100)} %)^12.`}>
            Nominal {conSigno(interanual.nominal)}
            {interanual.peor && ` · peor: ${interanual.peor.nombre} ${conSigno(interanual.peor.real)}`}
          </span>}
        />
        <Indicador
          etiqueta="Días de calle (DSO)"
          valor={dso.dias === null ? '—' : `${fmt.entero(dso.dias)} d`}
          delta={deltaValor(dso.dias === null ? null : Math.round(dso.dias), META_DSO, 'd')}
          deltaEtiqueta={`contra la meta de ${META_DSO} días`}
          detalle={<span title={`Pendiente impago (${fmt.moneda(dso.pendiente)}) sobre lo facturado en los últimos 90 días (${fmt.moneda(dso.facturado90)}), por 90.`}>
            Meta {META_DSO} d · edad del pendiente {fmt.dias(dso.edadPendiente === null ? null : Math.round(dso.edadPendiente))}
          </span>}
        />
        <Indicador
          etiqueta="Impagas de más de 1 año"
          valor={fmt.monedaCompacta(r.incobrables.monto)}
          detalle={`${fmt.entero(r.incobrables.cantidad)} facturas · probablemente incobrables`}
        />
      </div>

      <div className={`${GRILLA} lg:grid-cols-5`}>
        <TarjetaGrafico
          className="lg:col-span-3"
          titulo="Semáforo de aranceles"
          subtitulo={`Sesiones: emitidas en ${doceTxt}; días y costo: cobradas en ${doceTxt}; variación ${v.trimestre.etiqueta} contra ${v.trimestreAnterior.etiqueta}. Verde ≤ 2 meses sin aumento, amarillo 3 a 5, rojo ${MESES_CONGELADO} o más.`}
          actualizando={actualizando}
          cuerpoClassName="min-h-[24rem]"
          acciones={<ControlInflacion valor={i} onCambiar={onCambiarInflacion} />}
        >
          <TablaDatos llenar columnas={columnas} filas={filas} claveFila={f => f.id} orden={{ clave: 'ses', desc: true }} vacio="Sin facturación en los últimos 12 meses." />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Arancel contra días de cobro"
          subtitulo={`${doceTxt} · arancel de lo emitido, días de lo cobrado; el tamaño es la cantidad de sesiones. Abajo a la derecha: paga poco y tarde.`}
          actualizando={actualizando}
          cuerpoClassName="min-h-[18rem]"
          tabla={<TablaDatos columnas={columnasBurbujas} filas={conBurbuja} claveFila={f => f.id} orden={{ clave: 'ses', desc: true }} />}
        >
          {puntos.length
            ? (
              <Burbujas
                puntos={puntos}
                formatoX={n => `${fmt.entero(n)} d`}
                formatoY={fmt.monedaCompacta}
                tituloX="Días promedio de cobro"
                tituloY="Arancel por sesión"
                referenciaX={{ valor: REFERENCIA_DIAS, etiqueta: `${REFERENCIA_DIAS} d` }}
              />
            )
            : <SinDatos texto="No hay cobros con fecha en los últimos 12 meses." />}
        </TarjetaGrafico>
      </div>
    </div>
  );
};

const diaIsoMes = (dia: number) => new Date(dia * 86_400_000).toISOString().slice(0, 7);
