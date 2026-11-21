import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import type { PrinterOverview } from '../types';
import { errMsg, fmtDate, fmtNum } from '../format';

export default function Printers() {
  const [rows, setRows] = useState<PrinterOverview[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('printer_overview')
      .select('*')
      .order('customer')
      .order('serial_number')
      .then(({ data, error }) => {
        if (error) setError(errMsg(error)); else setRows(data as PrinterOverview[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((p) =>
      [p.serial_number, p.model, p.customer, p.location].some((v) => v.toLowerCase().includes(t)),
    );
  }, [rows, q]);

  return (
    <>
      <div className="page-head">
        <h1>Impressoras</h1>
        <Link className="btn small" to="/impressoras/nova">+ Nova</Link>
      </div>
      <input
        className="search"
        type="search"
        placeholder="Buscar por série, modelo, cliente ou local"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      {loading ? <p className="muted">Carregando…</p> : filtered.length === 0 ? (
        <p className="muted">{rows.length === 0 ? 'Nenhuma impressora cadastrada ainda.' : 'Nada encontrado.'}</p>
      ) : (
        <ul className="list">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link to={`/impressoras/${p.id}`} className="list-item">
                <div className="row-between">
                  <strong>{p.customer || 'Sem cliente'}</strong>
                  <span className="tag">{p.serial_number}</span>
                </div>
                <div className="muted">{[p.model, p.location].filter(Boolean).join(' · ') || '—'}</div>
                <div className="meta">
                  <span>Contador: {fmtNum(p.last_counter)}</span>
                  <span>Última visita: {fmtDate(p.last_visit)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
