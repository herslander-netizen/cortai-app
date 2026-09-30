CREATE POLICY "Servico interno gerencia convites de avaliacao"
ON public.convites_de_avaliacao
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);