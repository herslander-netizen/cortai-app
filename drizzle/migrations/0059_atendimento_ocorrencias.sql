-- Aprendizado do atendimento (dono, 06/11/2026): conversas do WhatsApp que saíram do fluxo ficam registradas para a
-- equipe melhorar o atendimento. Só acréscimo. Texto sempre mascarado pelo servidor (telefone, e-mail, CPF).

CREATE TABLE IF NOT EXISTS public.atendimento_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid REFERENCES public.conversas_whatsapp(id) ON DELETE SET NULL,
  mensagem_externa_id text,
  motivo text NOT NULL,
  origem text NOT NULL,
  texto text NOT NULL DEFAULT '',
  texto_normalizado text NOT NULL DEFAULT '',
  intencao text,
  etapa text,
  detalhe text,
  status text NOT NULL DEFAULT 'nova',
  criado_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  resolvido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT atendimento_ocorrencias_motivo_chk
    CHECK (motivo IN ('nao_entendida', 'fora_da_etapa', 'correcao', 'erro', 'abandono', 'atendente')),
  CONSTRAINT atendimento_ocorrencias_origem_chk CHECK (origem IN ('fluxo', 'bot', 'ia')),
  CONSTRAINT atendimento_ocorrencias_status_chk CHECK (status IN ('nova', 'resolvida', 'ignorada')),
  CONSTRAINT atendimento_ocorrencias_texto_chk CHECK (length(texto) <= 500 AND length(texto_normalizado) <= 300),
  CONSTRAINT atendimento_ocorrencias_detalhe_chk CHECK (detalhe IS NULL OR length(detalhe) <= 300)
);

COMMENT ON TABLE public.atendimento_ocorrencias IS
  'Mensagens do WhatsApp que saíram do fluxo (não entendida, fora da etapa, correção, erro, abandono, atendente), com texto mascarado, para a equipe melhorar o atendimento.';

-- A mesma mensagem não gera a mesma ocorrência duas vezes (reentrega do webhook).
CREATE UNIQUE INDEX IF NOT EXISTS atendimento_ocorrencias_unica_idx
  ON public.atendimento_ocorrencias (tenant_id, mensagem_externa_id, motivo)
  WHERE mensagem_externa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS atendimento_ocorrencias_lista_idx
  ON public.atendimento_ocorrencias (tenant_id, status, criado_em DESC);

ALTER TABLE public.atendimento_ocorrencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.atendimento_ocorrencias FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.atendimento_ocorrencias TO authenticated;
GRANT ALL ON TABLE public.atendimento_ocorrencias TO service_role;

-- Leitura pela equipe do próprio negócio com acesso ao WhatsApp; gravação só pelo servidor.
DROP POLICY IF EXISTS atendimento_ocorrencias_equipe_le ON public.atendimento_ocorrencias;
CREATE POLICY atendimento_ocorrencias_equipe_le ON public.atendimento_ocorrencias
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(atendimento_ocorrencias.tenant_id, 'ver_cortai'));
