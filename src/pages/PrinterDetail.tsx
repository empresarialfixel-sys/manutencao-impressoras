import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Maintenance, PartLife, Printer } from '../types';
import { errMsg, fmtDate, fmtNum } from '../format';

export default function PrinterDetail() {
  const { id } = useParams();
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [history, setHistory] = useState<Maintenance[]>([]);
  const [parts, setParts] = useState<PartLife[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [p, m, l] = await Promise.all([
      supabase.from('printers').select('*').eq('id', id!).single(),
      supabase
        .from('maintenances')
        .select('*, part_replacements(id, part_code, description, quantity)')
        .eq('printer_id', id!)
        .order('counter', { ascending: false }),
      supabase.from('part_life').select('*').eq('printer_id', id!).order('pages_since_replacement', { ascending: false }),
    ]);
    const err = p.error || m.error || l.error;
    if (err) { setError(errMsg(err)); return; }
    setPrinter(p.data as Printer);
    setHistory(m.data as Maintenance[]);
    setParts(l.data as PartLife[]);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function removeMaintenance(mid: string) {
    if (!confirm('Excluir este registro de manutenção e as peças dele?')) return;
    const { error } = await supabase.from('maintenances').delete().eq('id', mid);
    if (error) setError(errMsg(error)); else load();
  }

  if (error) return <p className="error">{error}</p>;
  if (!printer) return <p className="muted">Carregando…</p>;

  const current = history[0]?.counter ?? printer.installation_counter;

  return (
    <div className="stack">
      <Link to="/" className="back">← Impressoras</Link>

      <section className="card">
        <div className="row-between">
          <h1>{printer.customer || 'Sem cliente'}</h1>
          <Link to={`/impressoras/${printer.id}/editar`} className="link">Editar</Link>
        </div>
        <dl className="facts">
          <dt>Série</dt><dd>{printer.serial_number}</dd>
          <dt>Modelo</dt><dd>{printer.model || '—'}</dd>
          <dt>Local</dt><dd>{printer.location || '—'}</dd>
          <dt>Contador instalação</dt><dd>{fmtNum(printer.installation_counter)}</dd>
          <dt>Contador atual</dt><dd><b>{fmtNum(current)}</b></dd>
          <dt>Páginas desde instalação</dt><dd>{fmtNum(current - printer.installation_counter)}</dd>
        </dl>
      </section>

      <Link className="btn" to={`/impressoras/${printer.id}/manutencao`}>+ Registrar manutenção</Link>

      {parts.length > 0 && (
        <section>
          <h2>Peças — páginas desde a última troca</h2>
          <table className="table">
            <thead><tr><th>Peça</th><th>Trocada em</th><th className="num">Páginas</th></tr></thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.part_code}>
                  <td><b>{p.part_code}</b><div className="muted small">{p.description}</div></td>
                  <td>{fmtDate(p.replaced_on)}<div className="muted small">{fmtNum(p.replaced_at_counter)}</div></td>
                  <td className="num">{fmtNum(p.pages_since_replacement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2>Histórico ({history.length})</h2>
        {history.length === 0 && <p className="muted">Nenhuma manutenção registrada.</p>}
        <ul className="list">
          {history.map((m, i) => {
            const prev = history[i + 1]?.counter ?? printer.installation_counter;
            return (
              <li key={m.id} className="list-item">
                <div className="row-between">
                  <strong>{fmtDate(m.maintenance_date)}</strong>
                  <span className="tag">{fmtNum(m.counter)} págs</span>
                </div>
                <div className="muted small">
                  {m.technician || 'Técnico não informado'} · +{fmtNum(m.counter - prev)} desde a anterior
                </div>
                {m.summary && <p className="summary">{m.summary}</p>}
                {m.part_replacements.length > 0 && (
                  <ul className="parts">
                    {m.part_replacements.map((pr) => (
                      <li key={pr.id}>{pr.quantity}× <b>{pr.part_code}</b> {pr.description}</li>
                    ))}
                  </ul>
                )}
                <button className="link danger-text small" onClick={() => removeMaintenance(m.id)}>Excluir</button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
