import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import type { PartLife } from '../types';
import { errMsg, fmtDate, fmtNum } from '../format';

export default function PartLifePage() {
  const [rows, setRows] = useState<PartLife[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('part_life')
      .select('*')
      .order('pages_since_replacement', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) setError(errMsg(error)); else setRows(data as PartLife[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.part_code, r.description, r.customer, r.serial_number, r.model].some((v) => v.toLowerCase().includes(t)),
    );
  }, [rows, q]);

  return (
    <>
      <h1>Vida das peças</h1>
      <p className="muted small">Páginas impressas desde a última troca de cada peça (pelo contador da última visita).</p>
      <input className="search" type="search" placeholder="Filtrar por peça, cliente, série ou modelo"
        value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <p className="error">{error}</p>}
      {loading ? <p className="muted">Carregando…</p> : filtered.length === 0 ? (
        <p className="muted">Nenhuma troca de peça registrada.</p>
      ) : (
        <ul className="list">
          {filtered.map((r) => (
            <li key={r.printer_id + r.part_code}>
              <Link to={`/impressoras/${r.printer_id}`} className="list-item">
                <div className="row-between">
                  <strong>{r.part_code}</strong>
                  <span className="tag strong">{fmtNum(r.pages_since_replacement)} págs</span>
                </div>
                <div className="muted small">{r.description}</div>
                <div className="meta">
                  <span>{r.customer || 'Sem cliente'} · {r.serial_number}</span>
                  <span>Trocada em {fmtDate(r.replaced_on)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
