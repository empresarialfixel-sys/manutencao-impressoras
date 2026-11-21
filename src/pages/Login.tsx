import { useState, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { errMsg } from '../format';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(errMsg(error));
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) { setError('Digite seu e-mail primeiro.'); return; }
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) setError(errMsg(error)); else setInfo('Enviamos um link para redefinir a senha.');
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={submit}>
        <h1>🖨️ Manutenção de Impressoras</h1>
        <label>E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Senha
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" className="link" onClick={resetPassword}>Esqueci minha senha</button>
      </form>
    </div>
  );
}
