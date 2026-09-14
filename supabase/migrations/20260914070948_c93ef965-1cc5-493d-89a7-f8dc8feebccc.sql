ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_tipo_permitido;
UPDATE public.perfis SET tipo = 'pendente' WHERE tipo NOT IN ('pendente','cliente','barbeiro');
ALTER TABLE public.perfis ADD CONSTRAINT perfis_tipo_permitido CHECK (tipo IN ('pendente','cliente','barbeiro'));

DROP POLICY IF EXISTS "criar perfil proprio" ON public.perfis;
DROP POLICY IF EXISTS "atualizar perfil proprio" ON public.perfis;

CREATE POLICY "criar perfil proprio" ON public.perfis
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND tipo IN ('pendente','cliente','barbeiro'));

CREATE POLICY "atualizar perfil proprio" ON public.perfis
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND tipo IN ('pendente','cliente','barbeiro'));