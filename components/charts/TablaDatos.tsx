import { ReactNode, useMemo, useState } from 'react';

export interface ColumnaTabla<T> {
  clave: string;
  titulo: string;
  valor: (f: T) => number | string | null; // para ordenar
  mostrar?: (f: T) => ReactNode;
  numerica?: boolean;
}

interface Props<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveFila: (f: T) => string;
  orden?: { clave: string; desc: boolean };
  maxFilas?: number;
  vacio?: string;
}

// Tabla ordenable (la vista accesible de cada gráfico y los listados de detalle).
export function TablaDatos<T>({ columnas, filas, claveFila, orden: ordenInicial, maxFilas, vacio = 'Sin datos.' }: Props<T>) {
  const [orden, setOrden] = useState(ordenInicial ?? null);
  const [verTodas, setVerTodas] = useState(false);

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find(c => c.clave === orden.clave);
    if (!col) return filas;
    return [...filas].sort((a, b) => {
      const va = col.valor(a), vb = col.valor(b);
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return orden.desc ? -cmp : cmp;
    });
  }, [filas, columnas, orden]);

  const visibles = maxFilas && !verTodas ? ordenadas.slice(0, maxFilas) : ordenadas;

  if (!filas.length) return <p className="py-6 text-center text-sm text-slate-500">{vacio}</p>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columnas.map(c => {
                const activa = orden?.clave === c.clave;
                return (
                  <th
                    key={c.clave}
                    scope="col"
                    aria-sort={activa ? (orden!.desc ? 'descending' : 'ascending') : 'none'}
                    className={`whitespace-nowrap px-3 py-2 font-medium text-slate-500 ${c.numerica ? 'text-right' : 'text-left'}`}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-slate-900 focus:outline-none focus-visible:underline"
                      onClick={() => setOrden(o => ({ clave: c.clave, desc: o?.clave === c.clave ? !o.desc : !!c.numerica }))}
                    >
                      {c.titulo}
                      <span aria-hidden className={activa ? 'text-slate-700' : 'text-slate-300'}>{activa && !orden!.desc ? '▲' : '▼'}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.map(f => (
              <tr key={claveFila(f)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {columnas.map(c => (
                  <td
                    key={c.clave}
                    className={`whitespace-nowrap px-3 py-2 text-slate-700 ${c.numerica ? 'text-right tabular-nums' : 'text-left'}`}
                  >
                    {c.mostrar ? c.mostrar(f) : c.valor(f) ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {maxFilas && ordenadas.length > maxFilas && (
        <button
          type="button"
          onClick={() => setVerTodas(v => !v)}
          className="mt-2 text-sm font-medium text-primary-dark hover:underline"
        >
          {verTodas ? 'Ver menos' : `Ver las ${ordenadas.length}`}
        </button>
      )}
    </div>
  );
}
