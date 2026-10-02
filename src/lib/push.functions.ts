import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAPEIS_COM_PUSH } from "@/lib/push/regras";

/** Só a chave pública VAPID vai ao navegador. */
export const getChavePublicaPush = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { chavesVapid } = await import("@/lib/push/eventos.server");
    const chaves = await chavesVapid();
    return { publica: chaves.publica };
  });

const Inscricao = z.object({
  tenantId: z.string().uuid(),
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(20).max(200),
  auth: z.string().min(8).max(100),
  plataforma: z.enum(["android", "ios", "desktop"]),
});

/** Grava a inscrição deste aparelho; só para quem é da equipe do negócio. */
export const salvarInscricaoPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((dados) => Inscricao.parse(dados))
  .handler(async ({ data, context }) => {
    const { data: acesso } = await context.supabase.rpc("meu_acesso_no_tenant", {
      _tenant_id: data.tenantId,
    });
    const linha = (acesso as { papel: string; ativo: boolean }[] | null)?.[0];
    if (!linha || !linha.ativo || !PAPEIS_COM_PUSH.has(linha.papel)) {
      return { ok: false as const, motivo: "Avisos no celular são só para a equipe." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_inscricoes").upsert(
      {
        tenant_id: data.tenantId,
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        plataforma: data.plataforma,
        falhas: 0,
      },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false as const, motivo: "Não deu para ativar agora." };
    return { ok: true as const };
  });
