DROP POLICY IF EXISTS "criar perfil proprio" ON public.perfis;
DROP POLICY IF EXISTS "atualizar perfil proprio" ON public.perfis;

CREATE POLICY "criar perfil proprio"
ON public.perfis FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    tipo = ANY (ARRAY['pendente'::text, 'cliente'::text])
    OR (tipo = 'barbeiro' AND EXISTS (
      SELECT 1 FROM public.tenant_usuarios tu WHERE tu.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "atualizar perfil proprio"
ON public.perfis FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND (
    tipo = ANY (ARRAY['pendente'::text, 'cliente'::text])
    OR (tipo = 'barbeiro' AND EXISTS (
      SELECT 1 FROM public.tenant_usuarios tu WHERE tu.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Membros autenticados leem a matriz de recursos" ON public.recursos_de_plano;

CREATE POLICY "Somente admin da plataforma le a matriz de recursos"
ON public.recursos_de_plano FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));