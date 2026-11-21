# Manutenção de Impressoras

App web (funciona no celular) para registrar impressoras, manutenções e peças trocadas,
e acompanhar quantas páginas cada peça já rodou desde a última troca.

Feito com React + Vite + Supabase.

## 1. Banco de dados (Supabase)

No **SQL Editor** do seu projeto Supabase:

1. Rode o schema original (tabelas `printers`, `maintenances`, `part_replacements`).
2. Rode `supabase/01_melhorias.sql` **uma vez**. Ele cria:
   - a tabela `team_members` (só quem está nela acessa os dados);
   - validações (série única, contador ≥ instalação, quantidade > 0);
   - a função `register_maintenance` (salva manutenção + peças de uma vez);
   - as views `part_life` (vida das peças) e `printer_overview` (lista principal).
3. Em **Authentication → Users**, crie seu usuário (ou convide por e-mail).
4. Torne-se admin (troque o e-mail):

   ```sql
   INSERT INTO public.team_members (user_id, full_name, role)
   SELECT id, 'Seu Nome', 'admin' FROM auth.users WHERE email = 'seu@email.com';
   ```

5. Em **Authentication → Sign In / Providers**, desligue *Allow new users to sign up*.
6. Em **Authentication → URL Configuration**, coloque o endereço do app em *Site URL*
   (ex.: `https://seu-app.vercel.app`) para os links de convite e senha funcionarem.

### Adicionar um técnico

1. **Authentication → Users → Invite user** com o e-mail dele.
2. No SQL Editor:

   ```sql
   INSERT INTO public.team_members (user_id, full_name)
   SELECT id, 'Nome do Técnico' FROM auth.users WHERE email = 'tecnico@email.com';
   ```

Ele recebe o e-mail, clica no link e define a senha.

## 2. Rodar no computador

```bash
cp .env.example .env   # preencha com Project Settings → API do Supabase
npm install
npm run dev
```

## 3. Publicar

Funciona em Vercel ou Netlify (os arquivos `vercel.json` e `public/_redirects` já estão prontos).
Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da hospedagem.
Build: `npm run build`, pasta de saída: `dist`.

## Telas

- **Impressoras**: lista com busca por série, modelo, cliente ou local.
- **Impressora**: dados, contador atual, vida das peças e histórico de visitas.
- **Nova manutenção**: data, contador (avisa se for menor que o último), técnico, descrição
  e peças trocadas (o código autocompleta com peças já usadas antes).
- **Vida das peças**: todas as peças de todas as impressoras, ordenadas pelas que mais rodaram.
