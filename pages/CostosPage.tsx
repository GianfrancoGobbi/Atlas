import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';
import { Spinner } from '../components/shared/Spinner';
import { BarrasHorizontales } from '../components/charts/BarrasHorizontales';
import { TablaDatos, ColumnaTabla } from '../components/charts/TablaDatos';
import { FilaTooltip, Indicador, SinDatos, TarjetaGrafico } from '../components/charts/base';
import { fmt, tema } from '../components/charts/tema';
import { deltaPct } from '../utils/comparaciones';
import { areaService } from '../services/areaService';
import { profileService } from '../services/profileService';
import { CATEGORIAS_COSTO, CategoriaCosto, CostoRaw, costosService, etiquetaCategoria, NuevoCosto } from '../services/costosService';

// Meses como 'AAAA-MM-01'.
const mesActual = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-01`;
};
const moverMes = (mes: string, n: number) => {
  const [y, m] = mes.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1 + n, 1));
  return f.toISOString().slice(0, 10);
};
const nombreMes = (mes: string) =>
  new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mes}T00:00:00Z`));

const VACIO = (mes: string): NuevoCosto => ({
  mes, categoria: 'alquiler', descripcion: '', monto: '', area_id: null, terapeuta_id: null, recurrente: true,
});

const claseCampo = 'block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

// Carga y gestión de los costos de la clínica (solo administración).
export const CostosPage: React.FC = () => {
  const { role } = useAuth();
  const [mes, setMes] = useState(mesActual());
  const [costos, setCostos] = useState<CostoRaw[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [terapeutas, setTerapeutas] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState<NuevoCosto | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [c, a, t] = await Promise.all([costosService.listar(), areaService.getAreas(), profileService.getAllTerapeutas()]);
      setCostos(c);
      setAreas(a.map(x => ({ id: x.id, nombre: x.nombre })));
      setTerapeutas(t.map(x => ({ id: x.id, nombre: `${x.nombre} ${x.apellido}`.trim() })));
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar los costos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const delMes = useMemo(() => costos.filter(c => c.mes === mes), [costos, mes]);
  const delAnterior = useMemo(() => costos.filter(c => c.mes === moverMes(mes, -1)), [costos, mes]);
  const total = (cs: CostoRaw[]) => cs.reduce((s, c) => s + Number(c.monto), 0);
  const totalMes = total(delMes);
  const totalAnterior = total(delAnterior);
  const comunes = total(delMes.filter(c => !c.area_id && !c.terapeuta_id));
  const recurrentesAnterior = delAnterior.filter(c => c.recurrente).length;

  const porCategoria = useMemo(() => CATEGORIAS_COSTO
    .map(c => ({ ...c, monto: total(delMes.filter(x => x.categoria === c.id)) }))
    .filter(c => c.monto > 0)
    .sort((a, b) => b.monto - a.monto), [delMes]);

  const nombreArea = (id: string | null) => areas.find(a => a.id === id)?.nombre;
  const nombreTerapeuta = (id: string | null) => terapeutas.find(t => t.id === id)?.nombre;
  const asignacion = (c: CostoRaw) => (c.terapeuta_id ? nombreTerapeuta(c.terapeuta_id) ?? 'Terapeuta' : c.area_id ? nombreArea(c.area_id) ?? 'Área' : 'Común');

  const guardar = async () => {
    if (!form) return;
    const monto = Number(String(form.monto).replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(monto) || monto <= 0) { setError('Ingresá un monto mayor a cero.'); return; }
    if (!form.descripcion.trim()) { setError('Agregá una descripción.'); return; }
    setGuardando(true);
    setError(null);
    try {
      const datos = { ...form, descripcion: form.descripcion.trim(), monto };
      if (editandoId) {
        const act = await costosService.actualizar(editandoId, datos);
        setCostos(cs => cs.map(c => (c.id === editandoId ? act : c)));
        setAviso('Costo actualizado.');
      } else {
        const nuevo = await costosService.crear(datos);
        setCostos(cs => [...cs, nuevo]);
        setAviso('Costo agregado.');
      }
      setForm(null);
      setEditandoId(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar el costo.');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (c: CostoRaw) => {
    if (!window.confirm(`¿Borrar "${c.descripcion}" (${fmt.moneda(Number(c.monto))})?`)) return;
    try {
      await costosService.borrar(c.id);
      setCostos(cs => cs.filter(x => x.id !== c.id));
      setAviso('Costo borrado.');
    } catch (e: any) {
      setError(e.message || 'No se pudo borrar el costo.');
    }
  };

  const copiarRecurrentes = async () => {
    setGuardando(true);
    setError(null);
    try {
      const n = await costosService.copiarRecurrentes(moverMes(mes, -1), mes);
      setAviso(n ? `Se copiaron ${n} costos recurrentes de ${nombreMes(moverMes(mes, -1))}.` : 'Los recurrentes del mes anterior ya estaban cargados.');
      await cargar();
    } catch (e: any) {
      setError(e.message || 'No se pudieron copiar los costos recurrentes.');
    } finally {
      setGuardando(false);
    }
  };

  if (role !== UserRole.ADMIN) return <Alert type="error" message="Solo administración puede ver y cargar los costos." />;

  const columnas: ColumnaTabla<CostoRaw>[] = [
    { clave: 'categoria', titulo: 'Categoría', valor: c => etiquetaCategoria(c.categoria) },
    { clave: 'descripcion', titulo: 'Descripción', valor: c => c.descripcion },
    { clave: 'asignacion', titulo: 'Asignado a', valor: c => asignacion(c) },
    { clave: 'monto', titulo: 'Monto', valor: c => Number(c.monto), mostrar: c => fmt.moneda(Number(c.monto)), numerica: true },
    { clave: 'recurrente', titulo: 'Recurrente', valor: c => (c.recurrente ? 'Sí' : 'No') },
    {
      clave: 'acciones', titulo: '', valor: () => null,
      mostrar: c => (
        <span className="flex justify-end gap-3">
          <button type="button" className="text-sm font-medium text-primary-dark hover:underline" onClick={() => {
            setEditandoId(c.id);
            setForm({ mes: c.mes, categoria: c.categoria, descripcion: c.descripcion, monto: String(c.monto), area_id: c.area_id, terapeuta_id: c.terapeuta_id, recurrente: c.recurrente });
          }}>Editar</button>
          <button type="button" className="text-sm text-slate-500 hover:text-red-600 hover:underline" onClick={() => borrar(c)}>Borrar</button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold text-primary-dark">Costos</h1>
          <div className="ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
            <button type="button" aria-label="Mes anterior" onClick={() => setMes(moverMes(mes, -1))} className="px-3 py-1.5 text-slate-600 hover:bg-slate-50">‹</button>
            <span className="min-w-[10rem] px-2 text-center text-sm font-medium capitalize text-slate-800">{nombreMes(mes)}</span>
            <button type="button" aria-label="Mes siguiente" onClick={() => setMes(moverMes(mes, 1))} className="px-3 py-1.5 text-slate-600 hover:bg-slate-50">›</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {recurrentesAnterior > 0 && (
            <Button variant="outline" size="sm" onClick={copiarRecurrentes} isLoading={guardando}>
              Copiar recurrentes de {nombreMes(moverMes(mes, -1))}
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditandoId(null); setForm(VACIO(mes)); }}>Nuevo costo</Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {aviso && <Alert type="success" message={aviso} onClose={() => setAviso(null)} />}

      {form && (
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">{editandoId ? 'Editar costo' : `Nuevo costo de ${nombreMes(form.mes)}`}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs text-slate-500">Categoría
              <select className={claseCampo} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaCosto })}>
                {CATEGORIAS_COSTO.map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500 lg:col-span-2">Descripción
              <input className={claseCampo} value={form.descripcion} placeholder="Ej.: alquiler del consultorio" onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Monto ($)
              <input className={claseCampo} inputMode="decimal" value={String(form.monto)} placeholder="0" onChange={e => setForm({ ...form, monto: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Asignado a
              <select
                className={claseCampo}
                value={form.terapeuta_id ? `t:${form.terapeuta_id}` : form.area_id ? `a:${form.area_id}` : ''}
                onChange={e => {
                  const v = e.target.value;
                  setForm({ ...form, area_id: v.startsWith('a:') ? v.slice(2) : null, terapeuta_id: v.startsWith('t:') ? v.slice(2) : null });
                }}
              >
                <option value="">Común (se reparte)</option>
                <optgroup label="Área">{areas.map(a => <option key={a.id} value={`a:${a.id}`}>{a.nombre}</option>)}</optgroup>
                <optgroup label="Terapeuta">{terapeutas.map(t => <option key={t.id} value={`t:${t.id}`}>{t.nombre}</option>)}</optgroup>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.recurrente} onChange={e => setForm({ ...form, recurrente: e.target.checked })} />
              Se repite todos los meses
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={guardar} isLoading={guardando}>{editandoId ? 'Guardar cambios' : 'Agregar'}</Button>
            <Button size="sm" variant="outline" onClick={() => { setForm(null); setEditandoId(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              etiqueta="Total del mes"
              valor={fmt.moneda(totalMes)}
              delta={deltaPct(totalMes, totalAnterior, false)}
              deltaEtiqueta="vs mes anterior"
              detalle={`${delMes.length} costos cargados`}
            />
            <Indicador etiqueta="Costos comunes" valor={fmt.moneda(comunes)} detalle="Se reparten entre áreas según lo facturado" />
            <Indicador etiqueta="Asignados a área o terapeuta" valor={fmt.moneda(totalMes - comunes)} />
            <Indicador etiqueta="Mes anterior" valor={fmt.moneda(totalAnterior)} detalle={`${recurrentesAnterior} recurrentes`} />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <TarjetaGrafico className="lg:col-span-2" titulo={`Costos de ${nombreMes(mes)}`} cuerpoClassName="min-h-[22rem]">
              <TablaDatos llenar columnas={columnas} filas={delMes} claveFila={c => c.id} orden={{ clave: 'monto', desc: true }} vacio="Todavía no hay costos cargados en este mes." />
            </TarjetaGrafico>
            <TarjetaGrafico titulo="Por categoría" cuerpoClassName="min-h-[22rem]">
              {porCategoria.length ? (
                <BarrasHorizontales
                  filas={porCategoria.map(c => ({
                    clave: c.id,
                    etiqueta: c.etiqueta,
                    valor: c.monto,
                    color: tema.serie,
                    tooltip: <FilaTooltip etiqueta={`${fmt.pct(totalMes ? c.monto / totalMes : null)} del total`} valor={fmt.moneda(c.monto)} fuerte />,
                  }))}
                  formatoValor={fmt.monedaCompacta}
                />
              ) : <SinDatos texto="Sin costos en este mes." />}
            </TarjetaGrafico>
          </div>
        </>
      )}
    </div>
  );
};
