/**
 * Envio pela linha da plataforma (WhatsApp administrativo). Uso fechado — ver `linha-da-plataforma.ts`.
 *
 * Ordem de cada aviso: evento da lista → registro com chave única (o mesmo aviso nunca sai duas vezes) → pessoa
 * com opt-in no telefone verificado → linha da plataforma conectada → envio pelo provedor da linha. Cada passo que
 * impede o envio fica registrado (`pulado` + motivo). Nada aqui lança: aviso da plataforma nunca trava quem chamou.
 */
import {
  ehEventoDaPlataforma,
  textoDoAviso,
  type DadosDoAviso,
  type EventoDaPlataforma,
} from "./linha-da-plataforma";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ResultadoDaPlataforma = { enviado: true } | { enviado: false; motivo: string };

/** A linha da plataforma conectada, ou null. Só a linha `escopo = 'central'` — nunca a de um negócio. */
export async function conexaoDaPlataforma() {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, provedor, status")
    .eq("escopo", "central")
    .is("tenant_id", null)
    .maybeSingle();
  return data && data.status === "conectado" ? data : null;
}

export async function avisarPelaPlataforma(p: {
  evento: EventoDaPlataforma;
  userId: string;
  /** Chave única do aviso (ex.: `queda:<conexão>:<episódio>:<pessoa>`). */
  chave: string;
  tenantId?: string | null;
  dados?: DadosDoAviso;
}): Promise<ResultadoDaPlataforma> {
  try {
    if (!ehEventoDaPlataforma(p.evento)) return { enviado: false, motivo: "evento fora da lista" };
    const db = await admin();
    const { data: registro, error } = await db
      .from("envios_da_plataforma")
      .insert({
        chave: p.chave,
        evento: p.evento,
        user_id: p.userId,
        tenant_id: p.tenantId ?? null,
        status: "pendente",
      })
      .select("id")
      .single();
    // 23505: este aviso já foi tratado; 42P01: migração 0056 ainda não aplicada neste banco.
    if (error)
      return { enviado: false, motivo: error.code === "23505" ? "repetido" : "sem registro" };
    const fechar = (status: "enviado" | "falhou" | "pulado", motivo: string | null) =>
      db.from("envios_da_plataforma").update({ status, motivo }).eq("id", registro.id);

    const { data: telefone } = await db
      .from("telefones_da_equipe")
      .select("telefone, verificado_em, avisos_da_plataforma")
      .eq("user_id", p.userId)
      .maybeSingle();
    if (!telefone?.telefone || !telefone.verificado_em || telefone.avisos_da_plataforma !== true) {
      await fechar("pulado", "sem opt-in ou telefone verificado");
      return { enviado: false, motivo: "sem opt-in" };
    }
    const linha = await conexaoDaPlataforma();
    if (!linha) {
      await fechar("pulado", "linha da plataforma desconectada");
      return { enviado: false, motivo: "linha desconectada" };
    }
    const { gatewayDoProvedor } = await import("./gateway.server");
    try {
      await gatewayDoProvedor(linha.provedor).enviarMensagem(
        linha.sessao_id,
        telefone.telefone,
        textoDoAviso(p.evento, p.dados),
      );
    } catch (e) {
      await fechar("falhou", e instanceof Error ? e.message.slice(0, 200) : "falha no envio");
      return { enviado: false, motivo: "falhou" };
    }
    await fechar("enviado", null);
    return { enviado: true };
  } catch (e) {
    console.error("[linha-da-plataforma]", e instanceof Error ? e.message : e);
    return { enviado: false, motivo: "erro" };
  }
}

/** Donos ativos de um negócio (quem recebe queda do WhatsApp e cobrança). */
export async function donosDoNegocio(tenantId: string): Promise<string[]> {
  const db = await admin();
  const { data } = await db
    .from("tenant_usuarios")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("papel", "dono")
    .eq("ativo", true);
  return (data ?? []).map((l) => l.user_id as string);
}

/** Admins da plataforma (alertas de infraestrutura). */
export async function adminsDaPlataforma(): Promise<string[]> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((l) => l.user_id as string);
}

/** Avisa cada pessoa da lista (chave por pessoa); falha de uma não impede as outras. */
export async function avisarVarios(
  pessoas: string[],
  p: Omit<Parameters<typeof avisarPelaPlataforma>[0], "userId" | "chave"> & { chaveBase: string },
) {
  await Promise.all(
    pessoas.map((userId) =>
      avisarPelaPlataforma({ ...p, userId, chave: `${p.chaveBase}:${userId}` }),
    ),
  );
}

/**
 * Mensagem recebida na linha da plataforma: uma orientação curta por pessoa por dia (sem conversa, sem IA, sem
 * gravar a mensagem — ela não pertence a nenhum negócio).
 */
export async function orientarNaLinhaDaPlataforma(
  conexao: { sessao_id: string; provedor?: string | null },
  telefone: string,
) {
  const { horaDaChave } = await import("./linha-da-plataforma");
  const dia = horaDaChave().slice(0, 8);
  const db = await admin();
  const { error } = await db.from("envios_da_plataforma").insert({
    chave: `orientacao:${telefone.slice(-8)}:${dia}`,
    evento: "alerta_admin",
    status: "enviado",
    motivo: "orientação a mensagem recebida",
  });
  if (error) return;
  const { gatewayDoProvedor } = await import("./gateway.server");
  await gatewayDoProvedor(conexao.provedor ?? null).enviarMensagem(
    conexao.sessao_id,
    telefone,
    "Este número só envia avisos da plataforma Flow e não lê respostas. Para falar com um negócio, use o WhatsApp dele.",
  );
}
