/**
 * Confirmação do telefone no agendamento público — banco e WhatsApp (só servidor).
 * Regras puras em `verificacao-telefone.ts`. Tudo tolera a migração 0029 ainda não
 * aplicada: sem a tabela, não há como confirmar e o agendamento segue marcado.
 */
import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";
import {
  MAX_TENTATIVAS_DO_CODIGO,
  PADRAO_DO_CODIGO,
  VALIDADE_DO_CODIGO_MS,
  situacaoDaVerificacao,
} from "@/lib/verificacao-telefone";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hash(codigo: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`cortai:telefone:${codigo}`),
  );
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Número do WhatsApp do negócio que pode receber o código: só a conexão própria
 * conectada (a mesma regra de `conexaoDeEnvio`, sem disparar o aviso de falha).
 */
export async function numeroQueRecebeCodigo(tenantId: string): Promise<string | null> {
  const db = await admin();
  const { escolherConexaoPorFinalidade } = await import("@/lib/whatsapp/finalidade-conexao");
  const { data: linhas } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status, compartilhada, provedor, tipo, escopo, tenant_id, numero")
    .eq("tenant_id", tenantId)
    .eq("escopo", "tenant");
  const escolha = escolherConexaoPorFinalidade(linhas ?? [], "atendimento");
  if (escolha.tipo !== "propria") return null;
  const numero = (escolha.conexao.numero ?? "").replace(/\D/g, "");
  return numero.length >= 10 ? numero : null;
}

/** Cria um pedido de confirmação. null = não há como confirmar agora. */
export async function pedirConfirmacaoDoTelefone(
  tenantId: string,
  telefone: string,
): Promise<{ verificacaoId: string; codigo: string; numero: string } | null> {
  const numero = await numeroQueRecebeCodigo(tenantId);
  if (!numero) return null;
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  const codigo = String(100000 + (n[0]! % 900000));
  const db = await admin();
  const { data, error } = await db
    .from("verificacoes_de_telefone")
    .insert({
      tenant_id: tenantId,
      telefone: normalizarTelefone(telefone),
      codigo_hash: await hash(codigo),
      expira_em: new Date(Date.now() + VALIDADE_DO_CODIGO_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return { verificacaoId: data.id, codigo, numero };
}

/** Situação de um pedido, conferindo que é do mesmo negócio e telefone. */
export async function situacaoDoPedido(
  tenantId: string,
  telefone: string,
  verificacaoId: string,
): Promise<"confirmado" | "pendente" | "expirado"> {
  const db = await admin();
  const { data } = await db
    .from("verificacoes_de_telefone")
    .select("expira_em, tentativas, verificado_em")
    .eq("id", verificacaoId)
    .eq("tenant_id", tenantId)
    .in("telefone", variantesDoTelefone(telefone))
    .maybeSingle();
  return situacaoDaVerificacao(data ?? null);
}

/**
 * Mensagem "CODIGO 123456" de um cliente. Só confirma quando o código bate com um
 * pedido pendente daquele mesmo telefone. Devolve a resposta, ou null quando não há
 * pedido de cliente pendente (a mensagem segue para a confirmação da equipe).
 */
export async function tentarConfirmarTelefoneDoCliente(
  telefone: string,
  texto: string,
): Promise<string | null> {
  const m = PADRAO_DO_CODIGO.exec(texto);
  if (!m) return null;
  const db = await admin();
  const { data: pendentes, error } = await db
    .from("verificacoes_de_telefone")
    .select("id, codigo_hash, expira_em, tentativas, verificado_em")
    .in("telefone", variantesDoTelefone(telefone))
    .is("verificado_em", null)
    .gt("expira_em", new Date().toISOString())
    .lt("tentativas", MAX_TENTATIVAS_DO_CODIGO)
    .order("criado_em", { ascending: false })
    .limit(5);
  if (error || !pendentes?.length) return null;
  const digital = await hash(m[1]!);
  const certo = pendentes.find((p) => p.codigo_hash === digital);
  if (!certo) {
    const ultimo = pendentes[0]!;
    await db
      .from("verificacoes_de_telefone")
      .update({ tentativas: ultimo.tentativas + 1 })
      .eq("id", ultimo.id);
    return "Código incorreto. Confira o código na página de agendamento e envie de novo.";
  }
  await db
    .from("verificacoes_de_telefone")
    .update({ verificado_em: new Date().toISOString() })
    .eq("id", certo.id);
  return "Telefone confirmado ✅ Volte para a página de agendamento: seu horário será concluído lá.";
}
