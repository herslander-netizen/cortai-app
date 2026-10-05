/**
 * Publicação nas redes — parte exclusiva do servidor.
 * Um só ponto publica (agora ou agendado): `publicarPostagem`. A varredura
 * periódica existente chama `processarPostagensVencidas`; não há agendador paralelo.
 */
import type { PlataformaSocial } from "@/lib/redes-sociais";

export const BUCKET_POSTAGENS = "tenant-logos";
const MAX_TENTATIVAS = 3;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Conexao = {
  status: string;
  token_acesso: string | null;
  conta_id_externo: string | null;
};

async function publicarNoInstagram(c: Conexao, imagemUrl: string, legenda: string) {
  const base = `https://graph.instagram.com/v21.0/${c.conta_id_externo}`;
  const token = encodeURIComponent(c.token_acesso ?? "");
  const criar = await fetch(`${base}/media?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imagemUrl, caption: legenda }),
  });
  const container = (await criar.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!criar.ok || !container.id) throw new Error(container.error?.message ?? "O Instagram recusou a imagem.");
  const pub = await fetch(`${base}/media_publish?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id }),
  });
  const r = (await pub.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!pub.ok || !r.id) throw new Error(r.error?.message ?? "O Instagram não publicou.");
  return r.id;
}

async function publicarNoTikTok(c: Conexao, imagemUrl: string, legenda: string) {
  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.token_acesso ?? ""}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: { title: legenda.slice(0, 90), description: legenda.slice(0, 4000), privacy_level: "PUBLIC_TO_EVERYONE" },
      source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [imagemUrl] },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });
  const r = (await res.json().catch(() => ({}))) as {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string };
  };
  if (!res.ok || !r.data?.publish_id) throw new Error(r.error?.message || "O TikTok não publicou.");
  return r.data.publish_id;
}

/** Publica uma postagem. Nunca lança: grava o resultado e devolve o status final. */
export async function publicarPostagem(id: string): Promise<"publicada" | "falha" | "ignorada"> {
  const db = await admin();
  // Trava: só quem muda de 'agendada' para 'publicando' segue (evita publicar duas vezes).
  const { data: post } = await db
    .from("postagens_sociais")
    .update({ status: "publicando" })
    .eq("id", id)
    .eq("status", "agendada")
    .select("id, tenant_id, plataforma, legenda, midia_url, tentativas")
    .maybeSingle();
  if (!post) return "ignorada";

  const { data: conexao } = await db
    .from("conexoes_sociais")
    .select("status, token_acesso, conta_id_externo")
    .eq("tenant_id", post.tenant_id)
    .eq("plataforma", post.plataforma)
    .maybeSingle();

  const falhar = async (erro: string, definitivo = false) => {
    const tentativas = post.tentativas + 1;
    const desistir = definitivo || tentativas >= MAX_TENTATIVAS;
    await db
      .from("postagens_sociais")
      .update({
        status: desistir ? "falha" : "agendada",
        tentativas,
        erro: erro.slice(0, 300),
        ...(desistir ? {} : { agendado_para: new Date(Date.now() + 10 * 60_000).toISOString() }),
      })
      .eq("id", id);
    return "falha" as const;
  };

  if (!conexao) return falhar("Conta não conectada. Conecte em Redes sociais.", true);
  if (conexao.status === "simulada") {
    await db
      .from("postagens_sociais")
      .update({ status: "publicada", simulada: true, publicado_em: new Date().toISOString(), erro: null })
      .eq("id", id);
    return "publicada";
  }
  if (conexao.status !== "conectada" || !conexao.token_acesso)
    return falhar("Conexão expirada. Reconecte em Redes sociais.", true);

  const { data: assinada } = await db.storage
    .from(BUCKET_POSTAGENS)
    .createSignedUrl(post.midia_url, 60 * 60);
  if (!assinada?.signedUrl) return falhar("Imagem da postagem não encontrada.", true);

  try {
    const plataforma = post.plataforma as PlataformaSocial;
    const idExterno =
      plataforma === "instagram"
        ? await publicarNoInstagram(conexao, assinada.signedUrl, post.legenda)
        : await publicarNoTikTok(conexao, assinada.signedUrl, post.legenda);
    await db
      .from("postagens_sociais")
      .update({ status: "publicada", id_externo: idExterno, publicado_em: new Date().toISOString(), erro: null })
      .eq("id", id);
    return "publicada";
  } catch (e) {
    return falhar(e instanceof Error ? e.message : "Falha ao publicar.");
  }
}

/** Chamado pela varredura periódica existente. Lote pequeno e limitado. */
export async function processarPostagensVencidas(): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("postagens_sociais")
    .select("id")
    .eq("status", "agendada")
    .lte("agendado_para", new Date().toISOString())
    .order("agendado_para")
    .limit(20);
  let publicadas = 0;
  for (const p of data ?? []) {
    if ((await publicarPostagem(p.id)) === "publicada") publicadas++;
  }
  return publicadas;
}
