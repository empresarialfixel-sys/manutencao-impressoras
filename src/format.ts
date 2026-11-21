const num = new Intl.NumberFormat('pt-BR');

export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : num.format(n));

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/** Traduz erros comuns do Postgres/Supabase para mensagens legíveis. */
export function errMsg(e: unknown): string {
  const err = e as { message?: string; code?: string } | null;
  if (!err) return 'Erro desconhecido';
  if (err.code === '23505') return 'Já existe uma impressora com esse número de série.';
  if (err.code === '42501') return 'Sem permissão. Seu usuário precisa estar cadastrado na equipe.';
  if (err.message === 'Invalid login credentials') return 'E-mail ou senha incorretos.';
  return err.message || String(e);
}
