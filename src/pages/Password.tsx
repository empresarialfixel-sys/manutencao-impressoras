import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { errMsg } from '../format';

/** Usada no primeiro acesso (convite), na recuperação de senha ou para trocar a senha. */
export default function Password() {
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (pw !== pw2) { setError('As senhas não conferem.'); return; }
    setBusy(true); setError('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setError(errMsg(error)); else { alert('Senha salva.'); nav('/', { replace: true }); }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <h1>Definir senha</h1>
      <label>Nova senha
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </label>
      <label>Repita a senha
        <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button>
    </form>
  );
}
