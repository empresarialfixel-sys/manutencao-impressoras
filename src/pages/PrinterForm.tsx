import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Printer } from '../types';
import { errMsg } from '../format';

const empty = { serial_number: '', model: '', customer: '', location: '', installation_counter: 0 };

export default function PrinterForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('printers').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) { setError(errMsg(error)); return; }
      const p = data as Printer;
      setForm({ serial_number: p.serial_number, model: p.model, customer: p.customer, location: p.location, installation_counter: p.installation_counter });
    });
  }, [id]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: k === 'installation_counter' ? Number(e.target.value) : e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const payload = { ...form, serial_number: form.serial_number.trim().toUpperCase() };
    const res = id
      ? await supabase.from('printers').update(payload).eq('id', id).select('id').single()
      : await supabase.from('printers').insert(payload).select('id').single();
    setBusy(false);
    if (res.error) { setError(errMsg(res.error)); return; }
    nav(`/impressoras/${res.data.id}`, { replace: true });
  }

  async function remove() {
    if (!id || !confirm('Excluir esta impressora e TODO o histórico de manutenções dela?')) return;
    const { error } = await supabase.from('printers').delete().eq('id', id);
    if (error) setError(errMsg(error)); else nav('/', { replace: true });
  }

  return (
    <form className="stack" onSubmit={submit}>
      <h1>{id ? 'Editar impressora' : 'Nova impressora'}</h1>
      <label>Número de série *
        <input value={form.serial_number} onChange={set('serial_number')} required autoCapitalize="characters" />
      </label>
      <label>Modelo
        <input value={form.model} onChange={set('model')} placeholder="Ex.: Kyocera M2040dn" />
      </label>
      <label>Cliente
        <input value={form.customer} onChange={set('customer')} />
      </label>
      <label>Local
        <input value={form.location} onChange={set('location')} placeholder="Ex.: Recepção, 2º andar" />
      </label>
      <label>Contador na instalação
        <input type="number" inputMode="numeric" min={0} value={form.installation_counter} onChange={set('installation_counter')} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
      <button type="button" className="btn secondary" onClick={() => nav(-1)}>Cancelar</button>
      {id && <button type="button" className="btn danger" onClick={remove}>Excluir impressora</button>}
    </form>
  );
}
