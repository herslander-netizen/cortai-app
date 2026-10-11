import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";

/**
 * Transcreve o comando de voz da equipe no painel. A chave de IA fica só no servidor; o
 * navegador manda o áudio e recebe texto. Exige sessão e vínculo ativo com um negócio.
 */
export const transcreverComandoDeVozDoPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        audioBase64: z.string().min(100).max(6_000_000),
        mimeType: z.string().min(3).max(80),
        duracaoS: z.number().min(0).max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { transcreverComandoDeVoz } = await import("@/lib/voz.server");
    return transcreverComandoDeVoz({
      tenantId,
      userId: context.userId,
      audioBase64: data.audioBase64,
      mimeType: data.mimeType,
      duracaoS: data.duracaoS,
    });
  });
