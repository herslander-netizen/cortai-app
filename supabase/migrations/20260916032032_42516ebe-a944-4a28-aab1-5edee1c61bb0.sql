DROP POLICY IF EXISTS "Qualquer pessoa pode enviar um pedido" ON public.pedidos_de_projeto;

CREATE POLICY "Qualquer pessoa pode enviar um pedido"
ON public.pedidos_de_projeto
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'novo'
  AND char_length(btrim(nome)) BETWEEN 2 AND 120
  AND char_length(btrim(whatsapp)) BETWEEN 8 AND 30
  AND char_length(btrim(mensagem)) BETWEEN 5 AND 2000
  AND tipo = ANY (ARRAY['aplicativo','sistema_web','site','agendamento','integracao','outro'])
  AND (empresa IS NULL OR char_length(empresa) <= 160)
  AND (email IS NULL OR (char_length(email) <= 255 AND email LIKE '%_@_%.__%'))
);