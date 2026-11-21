import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { isConfigured, supabase } from './supabase';
import Login from './pages/Login';
import Printers from './pages/Printers';
import PrinterForm from './pages/PrinterForm';
import PrinterDetail from './pages/PrinterDetail';
import MaintenanceNew from './pages/MaintenanceNew';
import PartLifePage from './pages/PartLife';
import Password from './pages/Password';

// Capturado antes do supabase-js limpar a URL do link de e-mail
const cameFromInvite = /type=(invite|recovery)/.test(window.location.hash + window.location.search);

export interface Member {
  full_name: string;
  role: 'admin' | 'tecnico';
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [member, setMember] = useState<Member | null | undefined>(undefined);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session && cameFromInvite) nav('/senha');
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Link de recuperação ou convite: leva direto para definir a senha
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && cameFromInvite)) nav('/senha');
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  useEffect(() => {
    if (!session) { setMember(undefined); return; }
    supabase
      .from('team_members')
      .select('full_name, role')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setMember((data as Member) ?? null));
  }, [session]);

  if (!isConfigured) {
    return (
      <div className="center-screen">
        <div className="card">
          <h1>Configuração pendente</h1>
          <p>Crie o arquivo <code>.env</code> com <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja <code>.env.example</code>).</p>
        </div>
      </div>
    );
  }

  if (session === undefined || (session && member === undefined)) {
    return <div className="center-screen"><p className="muted">Carregando…</p></div>;
  }

  if (!session) return <Login />;

  if (member === null) {
    return (
      <div className="center-screen">
        <div className="card">
          <h1>Acesso pendente</h1>
          <p>Você entrou como <b>{session.user.email}</b>, mas ainda não faz parte da equipe.</p>
          <p className="muted">Peça para o administrador cadastrar seu usuário.</p>
          <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </div>
    );
  }

  const name = member?.full_name || session.user.email || '';

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">🖨️ Manutenção</span>
        <span className="row-between">
          <NavLink to="/senha" className="link">Senha</NavLink>
          <button className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
        </span>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Printers />} />
          <Route path="/impressoras/nova" element={<PrinterForm />} />
          <Route path="/impressoras/:id" element={<PrinterDetail />} />
          <Route path="/impressoras/:id/editar" element={<PrinterForm />} />
          <Route path="/impressoras/:id/manutencao" element={<MaintenanceNew technicianName={name} />} />
          <Route path="/pecas" element={<PartLifePage />} />
          <Route path="/senha" element={<Password />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>Impressoras</NavLink>
        <NavLink to="/pecas">Vida das peças</NavLink>
      </nav>
    </div>
  );
}
