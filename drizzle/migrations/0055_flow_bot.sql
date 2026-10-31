-- Flow Bot dentro do Flow (Fase A, docs/flow-bot-no-flow-analise.md). Só acréscimo.
-- Configuração por negócio (começa desligado), versões publicadas do fluxo, conversa em andamento, rastro de cada
-- decisão (para diagnosticar e corrigir) e prazo do modo humano na conversa do WhatsApp.

-- Pessoa da equipe assumiu a conversa (pediu atendente ou respondeu pelo celular): o bot e a Flow IA ficam em
-- silêncio até este instante. `modo_humano` (sem prazo) continua valendo como antes.
ALTER TABLE public.conversas_whatsapp ADD COLUMN IF NOT EXISTS modo_humano_ate timestamptz;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.flow_bot_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  fluxo jsonb NOT NULL,
  nota text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flow_bot_versoes_versao_positiva CHECK (versao > 0),
  CONSTRAINT flow_bot_versoes_nota_tamanho CHECK (nota IS NULL OR char_length(nota) <= 300),
  CONSTRAINT flow_bot_versoes_unica UNIQUE (tenant_id, versao)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.flow_bot_config (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- desligado: não faz nada; sombra: decide e registra sem enviar; ligado: responde.
  modo text NOT NULL DEFAULT 'desligado',
  -- sempre; aberto: só com o negócio aberto; fechado: só fora do horário.
  horario text NOT NULL DEFAULT 'sempre',
  -- Silêncio do bot depois que alguém da equipe responde pelo celular.
  pausa_humano_min integer NOT NULL DEFAULT 120,
  -- Sem versão publicada, vale o modelo padrão do Flow (src/lib/flow-bot/modelos/atendimento.json).
  versao_publicada integer,
  atualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flow_bot_config_modo CHECK (modo IN ('desligado', 'sombra', 'ligado')),
  CONSTRAINT flow_bot_config_horario CHECK (horario IN ('sempre', 'aberto', 'fechado')),
  CONSTRAINT flow_bot_config_pausa CHECK (pausa_humano_min BETWEEN 5 AND 1440),
  CONSTRAINT flow_bot_config_versao_existe FOREIGN KEY (tenant_id, versao_publicada)
    REFERENCES public.flow_bot_versoes (tenant_id, versao)
);
--> statement-breakpoint
-- Conversa em andamento no fluxo (esperas, variáveis, visitas). Só o servidor lê e grava.
CREATE TABLE IF NOT EXISTS public.flow_bot_sessoes (
  conversa_id uuid PRIMARY KEY REFERENCES public.conversas_whatsapp(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fluxo_ref text NOT NULL,
  sessao jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Por que o bot respondeu cada mensagem: passos percorridos, motivo, respostas e fatos que faltaram.
CREATE TABLE IF NOT EXISTS public.flow_bot_rastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.conversas_whatsapp(id) ON DELETE CASCADE,
  mensagem_externa_id text,
  modo text NOT NULL,
  fluxo_ref text NOT NULL,
  motivo text NOT NULL,
  passos jsonb NOT NULL DEFAULT '[]'::jsonb,
  respostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  realidade_ausente text[] NOT NULL DEFAULT '{}',
  enviado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flow_bot_rastro_modo CHECK (modo IN ('sombra', 'ligado'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS flow_bot_rastro_conversa_idx ON public.flow_bot_rastro (conversa_id, criado_em DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS flow_bot_rastro_tenant_idx ON public.flow_bot_rastro (tenant_id, criado_em DESC);
--> statement-breakpoint
-- A mesma mensagem nunca é decidida duas vezes (entrega repetida do webhook).
CREATE UNIQUE INDEX IF NOT EXISTS flow_bot_rastro_mensagem_unica
  ON public.flow_bot_rastro (conversa_id, mensagem_externa_id) WHERE mensagem_externa_id IS NOT NULL;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.flow_bot_config TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.flow_bot_versoes TO authenticated;
--> statement-breakpoint
GRANT SELECT ON public.flow_bot_rastro TO authenticated;
--> statement-breakpoint
GRANT ALL ON public.flow_bot_config, public.flow_bot_versoes, public.flow_bot_sessoes, public.flow_bot_rastro TO service_role;
--> statement-breakpoint
ALTER TABLE public.flow_bot_config ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.flow_bot_versoes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.flow_bot_sessoes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.flow_bot_rastro ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "membros leem config do bot" ON public.flow_bot_config;
--> statement-breakpoint
CREATE POLICY "membros leem config do bot" ON public.flow_bot_config
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
--> statement-breakpoint
DROP POLICY IF EXISTS "quem altera o negocio cria config do bot" ON public.flow_bot_config;
--> statement-breakpoint
CREATE POLICY "quem altera o negocio cria config do bot" ON public.flow_bot_config
  FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
--> statement-breakpoint
DROP POLICY IF EXISTS "quem altera o negocio muda config do bot" ON public.flow_bot_config;
--> statement-breakpoint
CREATE POLICY "quem altera o negocio muda config do bot" ON public.flow_bot_config
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
--> statement-breakpoint
DROP POLICY IF EXISTS "membros leem versoes do bot" ON public.flow_bot_versoes;
--> statement-breakpoint
CREATE POLICY "membros leem versoes do bot" ON public.flow_bot_versoes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
--> statement-breakpoint
-- Versões não se editam nem se apagam: corrigir = publicar uma nova (a anterior fica para voltar).
DROP POLICY IF EXISTS "quem altera o negocio publica versao do bot" ON public.flow_bot_versoes;
--> statement-breakpoint
CREATE POLICY "quem altera o negocio publica versao do bot" ON public.flow_bot_versoes
  FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
--> statement-breakpoint
DROP POLICY IF EXISTS "membros leem rastro do bot" ON public.flow_bot_rastro;
--> statement-breakpoint
CREATE POLICY "membros leem rastro do bot" ON public.flow_bot_rastro
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
