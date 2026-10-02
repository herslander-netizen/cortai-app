import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

export const TIPOS_DE_PROJETO = [
  { valor: "aplicativo", rotulo: "Aplicativo personalizado" },
  { valor: "sistema_web", rotulo: "Sistema web" },
  { valor: "site", rotulo: "Site" },
  { valor: "agendamento", rotulo: "Agendamento" },
  { valor: "integracao", rotulo: "Integração/automação" },
  { valor: "outro", rotulo: "Outro" },
] as const;

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  empresa: z.string().trim().max(160).optional(),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido.").max(30),
  email: z.string().trim().email("E-mail inválido.").max(255).optional().or(z.literal("")),
  tipo: z.enum(["aplicativo", "sistema_web", "site", "agendamento", "integracao", "outro"]),
  mensagem: z.string().trim().min(5, "Conte em poucas linhas o que você precisa.").max(2000),
});

export type PedidoDeProjeto = z.infer<typeof esquema>;

/** Recebe pedidos comerciais da Alvo Digital. Público por natureza: só grava, nunca lê. */
export const enviarPedidoDeProjeto = createServerFn({ method: "POST" })
  .validator((input: PedidoDeProjeto) => esquema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await client.from("pedidos_de_projeto").insert({
      nome: data.nome,
      empresa: data.empresa || null,
      whatsapp: data.whatsapp,
      email: data.email || null,
      tipo: data.tipo,
      mensagem: data.mensagem,
    });
    if (error)
      throw new Error("Não foi possível enviar seu pedido agora. Tente novamente em instantes.");
    return { ok: true as const };
  });

/**
 * Contato público da plataforma (WhatsApp e redes da Alvo Digital).
 * Lido no servidor para que visitantes não precisem de acesso direto ao banco.
 */
export const getContatoDaPlataforma = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ whatsapp: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("contato_da_plataforma");
    if (error) return { whatsapp: null };
    const linha = Array.isArray(data) ? data[0] : null;
    const digitos = String(linha?.whatsapp_alvo ?? "").replace(/\D/g, "");
    return { whatsapp: digitos.length >= 10 ? `https://wa.me/${digitos}` : null };
  },
);
