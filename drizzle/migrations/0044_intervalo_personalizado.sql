-- Permite personalizar a frequência dos horários oferecidos sem alterar a duração dos serviços.
-- Só amplia a validação da coluna existente; não altera nem remove dados.
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_passo_horarios_chk;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_passo_horarios_chk
  CHECK (passo_horarios_min BETWEEN 5 AND 120);
