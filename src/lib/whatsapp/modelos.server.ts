/**
 * Catálogo de modelos da Meta (`modelos_whatsapp`): leitura do modelo aprovado
 * por tipo de aviso e atualização pelo webhook de status/categoria.
 */
import { reclassificouParaMarketing, tipoDoCatalogo, type ModeloDoCatalogo } from "./modelos";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function modeloAprovadoDoTipo(tipo: string): Promise<ModeloDoCatalogo | null> {
  const db = await admin();
  const { data } = await db
    .from("modelos_whatsapp" as never)
    .select("nome, idioma, categoria, status, tipo_aviso, variaveis, botoes")
    .eq("tipo_aviso", tipoDoCatalogo(tipo))
    .eq("status", "APPROVED")
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ModeloDoCatalogo | null) ?? null;
}

type ValorDoModelo = {
  event?: string;
  message_template_id?: number | string;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string | null;
  new_category?: string;
  previous_category?: string;
};

/** `message_template_status_update` e `template_category_update`. */
export async function atualizarModeloPeloWebhook(campo: string, valor: ValorDoModelo) {
  const nome = valor.message_template_name;
  if (!nome) return;
  const db = await admin();
  const idioma = valor.message_template_language ?? "pt_BR";
  const { data: atual } = await db
    .from("modelos_whatsapp" as never)
    .select("id, categoria, status")
    .eq("nome", nome)
    .eq("idioma", idioma)
    .maybeSingle();
  const linha = atual as { id: string; categoria: string; status: string } | null;
  if (!linha) return; // modelo fora do catálogo: fica só na caixa de entrada

  const mudanca: Record<string, unknown> = {};
  if (valor.message_template_id) mudanca["meta_template_id"] = String(valor.message_template_id);
  if (campo === "message_template_status_update" && valor.event) {
    mudanca["status"] = valor.event.toUpperCase();
    mudanca["motivo_status"] = valor.reason && valor.reason !== "NONE" ? valor.reason : null;
  }
  const novaCategoria = valor.new_category?.toUpperCase();
  if (novaCategoria) mudanca["categoria"] = novaCategoria;
  if (Object.keys(mudanca).length) {
    const { error } = await db
      .from("modelos_whatsapp" as never)
      .update(mudanca as never)
      .eq("id", linha.id);
    if (error) throw new Error(error.message);
  }

  if (
    novaCategoria &&
    reclassificouParaMarketing(valor.previous_category ?? linha.categoria, novaCategoria)
  ) {
    await db.from("alertas_da_plataforma").insert({
      nivel: "critico",
      origem: "whatsapp",
      titulo: `Modelo ${nome} foi reclassificado como marketing`,
      detalhes: {
        modelo: nome,
        anterior: valor.previous_category ?? linha.categoria,
        nova: novaCategoria,
      },
    });
  }
}
