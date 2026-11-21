-- =====================================================================
-- Rode este script no SQL Editor do Supabase DEPOIS do schema original
-- (tabelas printers, maintenances, part_replacements).
-- =====================================================================

-- ---------- 1. Equipe: só membros cadastrados acessam os dados ----------
CREATE TABLE IF NOT EXISTS public.team_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'tecnico' CHECK (role IN ('admin', 'tecnico')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_team_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid());
$$;

DROP POLICY IF EXISTS "team read members" ON public.team_members;
CREATE POLICY "team read members" ON public.team_members
  FOR SELECT TO authenticated USING (public.is_team_member());

DROP POLICY IF EXISTS "team all printers" ON public.printers;
DROP POLICY IF EXISTS "team all maint"    ON public.maintenances;
DROP POLICY IF EXISTS "team all parts"    ON public.part_replacements;
CREATE POLICY "team printers" ON public.printers FOR ALL TO authenticated
  USING (public.is_team_member()) WITH CHECK (public.is_team_member());
CREATE POLICY "team maint" ON public.maintenances FOR ALL TO authenticated
  USING (public.is_team_member()) WITH CHECK (public.is_team_member());
CREATE POLICY "team parts" ON public.part_replacements FOR ALL TO authenticated
  USING (public.is_team_member()) WITH CHECK (public.is_team_member());

-- ---------- 2. Integridade ----------
ALTER TABLE public.printers     ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.maintenances ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.printers
  ADD CONSTRAINT printers_created_by_fk FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT printers_install_counter_ck CHECK (installation_counter >= 0);
ALTER TABLE public.maintenances
  ADD CONSTRAINT maint_created_by_fk FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT maint_counter_ck CHECK (counter >= 0);
ALTER TABLE public.part_replacements
  ADD CONSTRAINT parts_quantity_ck CHECK (quantity > 0);

-- Serial único sem diferenciar maiúsculas/espaços
CREATE UNIQUE INDEX IF NOT EXISTS printers_serial_norm_uq
  ON public.printers (upper(trim(serial_number)));

-- Contador da manutenção não pode ser menor que o da instalação
CREATE OR REPLACE FUNCTION public.check_maintenance_counter() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_install bigint;
BEGIN
  SELECT installation_counter INTO v_install FROM public.printers WHERE id = NEW.printer_id;
  IF NEW.counter < v_install THEN
    RAISE EXCEPTION 'Contador (%) menor que o contador de instalação (%)', NEW.counter, v_install;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_check_maintenance_counter ON public.maintenances;
CREATE TRIGGER trg_check_maintenance_counter
  BEFORE INSERT OR UPDATE OF counter ON public.maintenances
  FOR EACH ROW EXECUTE FUNCTION public.check_maintenance_counter();

-- ---------- 3. Registrar manutenção + peças numa única transação ----------
CREATE OR REPLACE FUNCTION public.register_maintenance(
  p_printer_id uuid,
  p_date date,
  p_counter bigint,
  p_technician text,
  p_summary text,
  p_parts jsonb DEFAULT '[]'::jsonb   -- [{ "part_code": "...", "description": "...", "quantity": 1 }]
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.maintenances (printer_id, maintenance_date, counter, technician, summary)
  VALUES (p_printer_id, p_date, p_counter, coalesce(p_technician, ''), coalesce(p_summary, ''))
  RETURNING id INTO v_id;

  INSERT INTO public.part_replacements (maintenance_id, part_code, description, quantity)
  SELECT v_id, upper(trim(x->>'part_code')), coalesce(x->>'description', ''),
         coalesce((x->>'quantity')::int, 1)
  FROM jsonb_array_elements(coalesce(p_parts, '[]'::jsonb)) AS x
  WHERE coalesce(trim(x->>'part_code'), '') <> '';

  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.register_maintenance(uuid, date, bigint, text, text, jsonb) TO authenticated;

-- ---------- 4. Vida útil das peças (páginas desde a última troca) ----------
CREATE OR REPLACE VIEW public.part_life WITH (security_invoker = true) AS
WITH last_swap AS (
  SELECT DISTINCT ON (m.printer_id, pr.part_code)
         m.printer_id, pr.part_code, pr.description,
         m.maintenance_date AS replaced_on, m.counter AS replaced_at_counter
  FROM public.part_replacements pr
  JOIN public.maintenances m ON m.id = pr.maintenance_id
  ORDER BY m.printer_id, pr.part_code, m.counter DESC
),
cur AS (
  SELECT DISTINCT ON (printer_id) printer_id, counter AS current_counter, maintenance_date AS last_visit
  FROM public.maintenances
  ORDER BY printer_id, counter DESC
)
SELECT ls.printer_id, p.serial_number, p.model, p.customer,
       ls.part_code, ls.description, ls.replaced_on, ls.replaced_at_counter,
       c.current_counter, c.last_visit,
       c.current_counter - ls.replaced_at_counter AS pages_since_replacement
FROM last_swap ls
JOIN public.printers p ON p.id = ls.printer_id
JOIN cur c ON c.printer_id = ls.printer_id;
GRANT SELECT ON public.part_life TO authenticated;

-- ---------- 5. Resumo por impressora (lista principal do app) ----------
CREATE OR REPLACE VIEW public.printer_overview WITH (security_invoker = true) AS
SELECT p.*,
       m.last_visit,
       coalesce(m.last_counter, p.installation_counter) AS last_counter,
       coalesce(m.visits, 0) AS visits
FROM public.printers p
LEFT JOIN LATERAL (
  SELECT max(maintenance_date) AS last_visit, max(counter) AS last_counter, count(*) AS visits
  FROM public.maintenances WHERE printer_id = p.id
) m ON true;
GRANT SELECT ON public.printer_overview TO authenticated;

-- =====================================================================
-- 6. PRIMEIRO ACESSO: depois de criar seu usuário em Authentication → Users,
--    rode a linha abaixo trocando o e-mail para se tornar admin:
--
-- INSERT INTO public.team_members (user_id, full_name, role)
-- SELECT id, 'Seu Nome', 'admin' FROM auth.users WHERE email = 'seu@email.com';
-- =====================================================================
