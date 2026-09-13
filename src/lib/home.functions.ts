import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { esquemaHome, normalizarHome, type ConfigHome } from "@/lib/home-publica";

const BUCKET = "home-publica";

/** Cliente público (chave publicável) para leituras do site. */
function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Só o dono da plataforma edita a Home. */
async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data: permitido } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!permitido) throw new Error("Acesso exclusivo do dono da plataforma.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Troca os caminhos de imagem guardados no editor por endereços temporários
 * que o navegador consegue abrir. Imagens vazias continuam usando as fotos
 * originais que já acompanham a Home.
 */
async function resolverImagens(config: ConfigHome): Promise<ConfigHome> {
  const caminhos = new Set<string>();
  const coletar = (valor?: string) => {
    if (valor && !valor.startsWith("http") && !valor.startsWith("/")) caminhos.add(valor);
  };
  coletar(config.hero.imagem);
  coletar(config.seo.imagem);
  config.secoes.forEach((s) => coletar(s.imagem));
  if (!caminhos.size) return config;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lista = [...caminhos];
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(lista, 60 * 60 * 24 * 7);
  const mapa = new Map<string, string>();
  (data ?? []).forEach((item, i) => {
    if (item.signedUrl) mapa.set(lista[i]!, item.signedUrl);
  });
  const trocar = (valor?: string) => (valor && mapa.get(valor)) || valor || "";
  return {
    ...config,
    hero: { ...config.hero, imagem: trocar(config.hero.imagem) },
    seo: { ...config.seo, imagem: trocar(config.seo.imagem) },
    secoes: config.secoes.map((s) => ({ ...s, imagem: trocar(s.imagem) })),
  };
}

/** Conteúdo publicado da Home. Lido no servidor (a função não é aberta ao público). */
export const getHomePublicada = createServerFn({ method: "GET" }).handler(async (): Promise<ConfigHome> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("home_publicada");
    return await resolverImagens(normalizarHome(data));
  } catch {
    return normalizarHome(null);
  }
});

/** Rascunho + publicado + histórico, para o editor do admin. */
export const getHomeAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await exigirAdmin(context);
    const [linha, versoes] = await Promise.all([
      db.from("home_publica").select("rascunho, publicado, publicado_em, atualizado_em").eq("id", true).maybeSingle(),
      db.from("home_publica_versoes").select("id, rotulo, criado_em").order("criado_em", { ascending: false }).limit(10),
    ]);
    const publicado = normalizarHome(linha.data?.publicado);
    const rascunhoBruto = linha.data?.rascunho;
    const temRascunho = Boolean(rascunhoBruto && Object.keys(rascunhoBruto as object).length);
    return {
      rascunho: temRascunho ? normalizarHome(rascunhoBruto) : publicado,
      publicado,
      publicadoEm: linha.data?.publicado_em ?? null,
      atualizadoEm: linha.data?.atualizado_em ?? null,
      temRascunho: temRascunho && JSON.stringify(normalizarHome(rascunhoBruto)) !== JSON.stringify(publicado),
      versoes: versoes.data ?? [],
    };
  });

export const salvarRascunhoHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaHome.parse(input))
  .handler(async ({ data, context }) => {
    const db = await exigirAdmin(context);
    const { error } = await db
      .from("home_publica")
      .update({ rascunho: data as never, atualizado_por: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const publicarHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaHome.parse(input))
  .handler(async ({ data, context }) => {
    const db = await exigirAdmin(context);
    const { data: atual } = await db.from("home_publica").select("publicado").eq("id", true).maybeSingle();
    if (atual?.publicado && Object.keys(atual.publicado as object).length) {
      await db.from("home_publica_versoes").insert({
        snapshot: atual.publicado as never,
        rotulo: "Versão anterior",
        criado_por: context.userId,
      });
    }
    const { error } = await db
      .from("home_publica")
      .update({ publicado: data as never, rascunho: data as never, publicado_em: new Date().toISOString(), atualizado_por: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const descartarRascunhoHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await exigirAdmin(context);
    const { data: atual } = await db.from("home_publica").select("publicado").eq("id", true).maybeSingle();
    const { error } = await db
      .from("home_publica")
      .update({ rascunho: (atual?.publicado ?? {}) as never, atualizado_por: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const restaurarVersaoHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await exigirAdmin(context);
    const { data: versao } = await db.from("home_publica_versoes").select("snapshot").eq("id", data.id).maybeSingle();
    if (!versao) throw new Error("Versão não encontrada.");
    const { error } = await db
      .from("home_publica")
      .update({ rascunho: versao.snapshot as never, atualizado_por: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Endereços temporários das imagens do editor, para a prévia do admin. */
export const assinarImagensHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ caminhos: z.array(z.string().max(500)).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const lista = data.caminhos.filter((c) => c && !c.startsWith("http") && !c.startsWith("/"));
    if (!lista.length) return {} as Record<string, string>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: urls } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(lista, 60 * 60);
    const mapa: Record<string, string> = {};
    (urls ?? []).forEach((item, i) => {
      if (item.signedUrl) mapa[lista[i]!] = item.signedUrl;
    });
    return mapa;
  });

/** Biblioteca simples: arquivos já enviados para a Home. */
export const listarImagensHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 60, sortBy: { column: "created_at", order: "desc" } });
    const nomes = (data ?? []).filter((a) => a.name && a.id).map((a) => a.name);
    if (!nomes.length) return [] as { caminho: string; url: string }[];
    const { data: urls } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(nomes, 60 * 60);
    return nomes.map((nome, i) => ({ caminho: nome, url: urls?.[i]?.signedUrl ?? "" })).filter((i) => i.url);
  });
