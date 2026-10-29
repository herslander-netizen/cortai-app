/**
 * Quem está falando no WhatsApp: CLIENTE (padrão) ou alguém da EQUIPE
 * (dono/profissional) do negócio da conversa.
 *
 * A equipe só é reconhecida por telefone VERIFICADO (`telefones_da_equipe`):
 * a pessoa gera um código no painel e o envia deste mesmo WhatsApp. Telefone
 * apenas digitado no perfil nunca dá acesso a dados da equipe.
 */
import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";

export type PapelNaConversa = "cliente" | "profissional" | "dono";

export type IdentidadeDaEquipe = {
  papel: "profissional" | "dono";
  userId: string;
  profissionalId: string | null;
  nome: string | null;
  /** Permissões efetivas armazenadas para o membro; o dono é tratado pela regra central. */
  permissoes: string[];
};

const VALIDADE_CODIGO_MS = 15 * 60_000;
const MAX_TENTATIVAS = 5;
const PADRAO_CODIGO = /^\s*(?:c[oó]digo|cortai)\s*:?\s*(\d{6})\s*$/i;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hash(codigo: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cortai:${codigo}`));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Membro ativo da equipe deste negócio, pelo telefone verificado. */
export async function identificarEquipe(
  tenantId: string,
  telefone: string,
): Promise<IdentidadeDaEquipe | null> {
  const variantes = variantesDoTelefone(telefone);
  if (!variantes.length) return null;
  const db = await admin();
  const { data: tels } = await db
    .from("telefones_da_equipe")
    .select("user_id")
    .in("telefone", variantes)
    .not("verificado_em", "is", null);
  const ids = (tels ?? []).map((t) => t.user_id);
  if (!ids.length) return null;
  const { data: membro } = await db
    .from("tenant_usuarios")
    .select("user_id, papel, permissoes")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .in("user_id", ids)
    .order("papel", { ascending: false }) // "dono" antes do papel legado de profissional
    .limit(1)
    .maybeSingle();
  if (!membro) return null;
  const [{ data: prof }, { data: perfil }] = await Promise.all([
    db
      .from("profissionais")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", membro.user_id)
      .eq("ativo", true)
      .maybeSingle(),
    db.from("perfis").select("nome").eq("user_id", membro.user_id).maybeSingle(),
  ]);
  return {
    papel: membro.papel === "dono" ? "dono" : "profissional",
    userId: membro.user_id,
    profissionalId: prof?.id ?? null,
    nome: perfil?.nome ?? null,
    permissoes: Array.isArray(membro.permissoes) ? membro.permissoes : [],
  };
}

/** Gera (ou renova) o código que a pessoa envia pelo WhatsApp. */
export async function gerarCodigoDeVerificacao(userId: string, telefoneDoPerfil: string) {
  const telefone = normalizarTelefone(telefoneDoPerfil);
  if (telefone.length < 12) throw new Error("Cadastre seu WhatsApp no perfil antes de confirmar.");
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  const codigo = String(100000 + (n[0]! % 900000));
  const db = await admin();
  const { error } = await db.from("telefones_da_equipe").upsert({
    user_id: userId,
    telefone,
    verificado_em: null,
    codigo_hash: await hash(codigo),
    codigo_expira_em: new Date(Date.now() + VALIDADE_CODIGO_MS).toISOString(),
    tentativas: 0,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error("Não foi possível gerar o código agora.");
  return { codigo, telefone };
}

export async function statusDaVerificacao(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("telefones_da_equipe")
    .select("telefone, verificado_em")
    .eq("user_id", userId)
    .maybeSingle();
  return { telefone: data?.telefone ?? null, verificadoEm: data?.verificado_em ?? null };
}

/**
 * Mensagem "CODIGO 123456" vinda do WhatsApp. Só confirma quando o código
 * bate, não expirou e o remetente é o mesmo telefone do perfil.
 * Devolve o texto de resposta, ou null quando a mensagem não é um código.
 */
export async function tentarVerificarPorMensagem(
  telefone: string,
  texto: string,
): Promise<string | null> {
  const m = PADRAO_CODIGO.exec(texto);
  if (!m) return null;
  const db = await admin();
  const variantes = variantesDoTelefone(telefone);
  const { data: linha } = await db
    .from("telefones_da_equipe")
    .select("user_id, codigo_hash, codigo_expira_em, tentativas")
    .in("telefone", variantes)
    .not("codigo_hash", "is", null)
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!linha) return "Não encontrei um código pendente para este número. Gere um novo no painel do Flow.";
  if (linha.tentativas >= MAX_TENTATIVAS || !linha.codigo_expira_em || new Date(linha.codigo_expira_em) < new Date())
    return "Este código expirou. Gere um novo no painel do Flow.";
  if ((await hash(m[1]!)) !== linha.codigo_hash) {
    await db
      .from("telefones_da_equipe")
      .update({ tentativas: linha.tentativas + 1 })
      .eq("user_id", linha.user_id);
    return "Código incorreto. Confira no painel e envie de novo.";
  }
  await db
    .from("telefones_da_equipe")
    .update({
      telefone: normalizarTelefone(telefone),
      verificado_em: new Date().toISOString(),
      codigo_hash: null,
      codigo_expira_em: null,
      tentativas: 0,
      atualizado_em: new Date().toISOString(),
    })
    .eq("user_id", linha.user_id);
  return "WhatsApp confirmado. Agora você pode conversar comigo por aqui: pergunte sua agenda, seu próximo atendimento ou avise um atraso.";
}
