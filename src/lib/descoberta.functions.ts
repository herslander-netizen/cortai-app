import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { segmentoValido, type Segmento } from "@/lib/segmentos";

export type BarbeariaResumo = {
  id: string;
  nome: string;
  slug: string;
  endereco: string | null;
  descricao: string | null;
  segmento: Segmento;
};

/** Busca pública de barbearias ativas. Nunca retorna barbearias inativas. */
export const buscarBarbearias = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ termo: z.string().trim().max(80).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<BarbeariaResumo[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let consulta = supabaseAdmin
      .from("tenants")
      .select("id, nome, slug, endereco, descricao, segmento")
      .eq("ativo", true)
      .order("nome")
      .limit(30);

    const termo = data.termo?.trim();
    if (termo) {
      const escapado = termo.replace(/[%,()]/g, " ");
      consulta = consulta.or(`nome.ilike.%${escapado}%,endereco.ilike.%${escapado}%`);
    }

    const { data: linhas, error } = await consulta;
    if (error) throw new Error("Não foi possível buscar lugares agora.");
    return (linhas ?? []).map((linha) => ({ ...linha, segmento: segmentoValido(linha.segmento) })) as BarbeariaResumo[];
  });
