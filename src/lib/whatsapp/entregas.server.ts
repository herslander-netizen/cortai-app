/**
 * Retorno de entrega da Meta (sent/delivered/read/failed) aplicado em
 * `mensagens_whatsapp` e em `envios_de_whatsapp`, pelo id externo da mensagem.
 * Só avança: um "sent" atrasado nunca sobrescreve "delivered"/"read".
 */
import { lerErroMeta } from "./erros-meta";

export type EstadoDeEntrega = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: { code?: number; title?: string; message?: string }[];
};

const ORDEM_MENSAGEM: Record<string, number> = { enviada: 1, entregue: 2, lida: 3, falhou: 9 };
const ORDEM_ENVIO: Record<string, number> = {
  pendente: 0,
  enviando: 0,
  erro: 0,
  enviado: 1,
  entregue: 2,
  lida: 3,
  sem_modelo: 9,
  falhou: 9,
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function traduzirEstado(status: string | undefined) {
  if (status === "sent") return { mensagem: "enviada", envio: "enviado" } as const;
  if (status === "delivered") return { mensagem: "entregue", envio: "entregue" } as const;
  if (status === "read") return { mensagem: "lida", envio: "lida" } as const;
  if (status === "failed") return { mensagem: "falhou", envio: "falhou" } as const;
  return null;
}

export async function aplicarEntrega(estado: EstadoDeEntrega): Promise<void> {
  if (!estado.id || !estado.status) return;
  const novo = traduzirEstado(estado.status);
  if (!novo) return;
  const db = await admin();
  const quando = estado.timestamp
    ? new Date(Number(estado.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const primeiroErro = estado.errors?.[0];
  const erro =
    estado.status === "failed"
      ? (estado.errors?.map((e) => e.message ?? e.title ?? String(e.code)).join("; ") || "Falha na entrega.")
      : null;

  const { data: msg } = await db
    .from("mensagens_whatsapp")
    .select("id, status")
    .eq("mensagem_externa_id", estado.id)
    .eq("direcao", "saida")
    .limit(1)
    .maybeSingle();
  if (msg && (ORDEM_MENSAGEM[msg.status] ?? 0) < (ORDEM_MENSAGEM[novo.mensagem] ?? 0)) {
    await db
      .from("mensagens_whatsapp")
      .update({ status: novo.mensagem, ...(erro ? { erro } : {}) })
      .eq("id", msg.id);
  }

  const { data: envio } = await db
    .from("envios_de_whatsapp")
    .select("id, status, entregue_em, lido_em")
    .eq("mensagem_externa_id", estado.id)
    .limit(1)
    .maybeSingle();
  if (!envio) return;

  if (novo.envio === "falhou") {
    if ((ORDEM_ENVIO[envio.status] ?? 0) >= 9) return;
    const codigo = primeiroErro?.code ?? lerErroMeta(erro ?? "").codigo;
    const { aplicarFalhaDeEnvio } = await import("./falhas-envio.server");
    await aplicarFalhaDeEnvio({ envioId: envio.id, codigo: codigo ?? null, motivo: erro ?? "Falha na entrega." });
    return;
  }
  // Horários de cada estado são preservados mesmo quando o estado já avançou.
  const horarios = {
    ...(novo.envio === "entregue" && !envio.entregue_em ? { entregue_em: quando } : {}),
    ...(novo.envio === "lida" && !envio.lido_em ? { lido_em: quando } : {}),
    ...(novo.envio === "lida" && !envio.entregue_em ? { entregue_em: quando } : {}),
  };
  const avanca = (ORDEM_ENVIO[envio.status] ?? 0) < (ORDEM_ENVIO[novo.envio] ?? 0) && (ORDEM_ENVIO[envio.status] ?? 0) < 9;
  if (!avanca && Object.keys(horarios).length === 0) return;
  await db
    .from("envios_de_whatsapp")
    .update({ ...(avanca ? { status: novo.envio } : {}), ...horarios })
    .eq("id", envio.id);
}
