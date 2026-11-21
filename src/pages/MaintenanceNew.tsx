import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Printer } from '../types';
import { errMsg, fmtNum, today } from '../format';

interface PartRow { part_code: string; description: string; quantity: number }
const blankPart = (): PartRow => ({ part_code: '', description: '', quantity: 1 });

export default function MaintenanceNew({ technicianName }: { technicianName: string }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [lastCounter, setLastCounter] = useState(0);
  const [knownParts, setKnownParts] = useState<Record<string, string>>({});
  const [date, setDate] = useState(today());
  const [counter, setCounter] = useState('');
  const [technician, setTechnician] = useState(technicianName);
  const [summary, setSummary] = useState('');
  const [parts, setParts] = useState<PartRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('printers').select('*').eq('id', id!).single(),
      supabase.from('maintenances').select('counter').eq('printer_id', id!).order('counter', { ascending: false }).limit(1),
      supabase.from('part_replacements').select('part_code, description').order('created_at', { ascending: false }).limit(500),
    ]).then(([p, m, k]) => {
      if (p.error) { setError(errMsg(p.error)); return; }
      const pr = p.data as Printer;
      setPrinter(pr);
      setLastCounter(m.data?.[0]?.counter ?? pr.installation_counter);
      const map: Record<string, string> = {};
      for (const r of k.data ?? []) if (!map[r.part_code]) map[r.part_code] = r.description;
      setKnownParts(map);
    });
  }, [id]);

  const updatePart = (i: number, patch: Partial<PartRow>) =>
    setParts(parts.map((p, j) => {
      if (j !== i) return p;
      const next = { ...p, ...patch };
      // Preenche a descrição automaticamente ao digitar um código já usado antes
      if (patch.part_code !== undefined && !p.description) {
        const known = knownParts[patch.part_code.trim().toUpperCase()];
        if (known) next.description = known;
      }
      return next;
    }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = Number(counter);
    if (c < lastCounter && !confirm(`O contador informado (${fmtNum(c)}) é MENOR que o último registrado (${fmtNum(lastCounter)}). Salvar mesmo assim?`)) return;
    setBusy(true); setError('');
    const { error } = await supabase.rpc('register_maintenance', {
      p_printer_id: id,
      p_date: date,
      p_counter: c,
      p_technician: technician.trim(),
      p_summary: summary.trim(),
      p_parts: parts.filter((p) => p.part_code.trim()),
    });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    nav(`/impressoras/${id}`, { replace: true });
  }

  if (!printer) return error ? <p className="error">{error}</p> : <p className="muted">Carregando…</p>;

  const delta = counter ? Number(counter) - lastCounter : null;

  return (
    <form className="stack" onSubmit={submit}>
      <h1>Nova manutenção</h1>
      <p className="muted">{printer.customer} · {printer.model} · <b>{printer.serial_number}</b></p>

      <label>Data
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>Contador atual *
        <input type="number" inputMode="numeric" min={0} value={counter} onChange={(e) => setCounter(e.target.value)} required />
        <span className={`hint ${delta != null && delta < 0 ? 'error' : ''}`}>
          Último: {fmtNum(lastCounter)}{delta != null && ` · ${delta >= 0 ? '+' : ''}${fmtNum(delta)} páginas`}
        </span>
      </label>
      <label>Técnico
        <input value={technician} onChange={(e) => setTechnician(e.target.value)} />
      </label>
      <label>O que foi feito
        <textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Limpeza, ajuste, defeito encontrado…" />
      </label>

      <fieldset className="parts-box">
        <legend>Peças trocadas</legend>
        <datalist id="known-parts">
          {Object.entries(knownParts).map(([code, desc]) => <option key={code} value={code}>{desc}</option>)}
        </datalist>
        {parts.map((p, i) => (
          <div className="part-row" key={i}>
            <input placeholder="Código" list="known-parts" value={p.part_code} autoCapitalize="characters"
              onChange={(e) => updatePart(i, { part_code: e.target.value })} />
            <input placeholder="Descrição" value={p.description}
              onChange={(e) => updatePart(i, { description: e.target.value })} />
            <input type="number" min={1} inputMode="numeric" aria-label="Quantidade" value={p.quantity}
              onChange={(e) => updatePart(i, { quantity: Math.max(1, Number(e.target.value)) })} />
            <button type="button" className="icon-btn" aria-label="Remover peça"
              onClick={() => setParts(parts.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn secondary small" onClick={() => setParts([...parts, blankPart()])}>+ Adicionar peça</button>
      </fieldset>

      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar manutenção'}</button>
      <button type="button" className="btn secondary" onClick={() => nav(-1)}>Cancelar</button>
    </form>
  );
}
