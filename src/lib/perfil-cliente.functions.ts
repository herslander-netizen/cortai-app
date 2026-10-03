import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";
import { validarPreferenciasCliente, type PreferenciasCliente } from "@/lib/preferencias-cliente";

const BUCKET = "fotos-corte";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Só membros ativos da barbearia dona do cliente chegam aqui. */
async function contexto(context: any, clienteId: string) {
  const tenantId = await tenantIdDoMembro(context);
  const db = await admin();
  const { data: cliente } = await db
    .from("clientes")
    .select(
      "id, nome, telefone, ficha_tecnica, ficha_chips, alergias, opt_in_whatsapp, preferencias",
    )
    .eq("id", clienteId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!cliente) throw new Error("Cliente não encontrado.");
  return { db: db as any, tenantId, cliente };
}

export type PerfilCliente = {
  cliente: { id: string; nome: string; telefone: string; avulso: boolean };
  ficha: { chips: string[]; alergias: string | null; texto: string | null };
  preferencias: PreferenciasCliente;
  catalogo: string[];
  resumo: {
    ultimo: string | null;
    servicos: string[];
    profissional: string | null;
    totalCentavos: number;
    visitas: number;
  };
  faltas: number;
  cancelamentos: number;
  fotos: { id: string; url: string; criadoEm: string }[];
  historico: {
    id: string;
    inicio: string;
    servico: string;
    profissional: string;
    status: string;
    valorCentavos: number;
  }[];
  /** Data sugerida de retorno pelo último serviço concluído (ou prazo geral de 30 dias). */
  retornoSugerido: { data: string; servico: string } | null;
  fuso: string;
};

export const getPerfilCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { clienteId: string }) => {
    if (!d?.clienteId) throw new Error("cliente invalido");
    return { clienteId: String(d.clienteId) };
  })
  .handler(async ({ data, context }): Promise<PerfilCliente> => {
    const { db, tenantId, cliente } = await contexto(context, data.clienteId);
    const [tenantRes, agRes, fotosRes, comandasRes] = await Promise.all([
      db.from("tenants").select("chips_ficha, fuso").eq("id", tenantId).maybeSingle(),
      db
        .from("agendamentos")
        .select(
          "id, inicio, status, valor_centavos, servicos(nome, retorno_dias), profissionais(nome)",
        )
        .eq("tenant_id", tenantId)
        .eq("cliente_id", cliente.id)
        .order("inicio", { ascending: false })
        .limit(60),
      db
        .from("fotos_de_corte")
        .select("id, caminho, criado_em")
        .eq("tenant_id", tenantId)
        .eq("cliente_id", cliente.id)
        .order("criado_em", { ascending: false })
        .limit(6),
      db
        .from("comandas")
        .select("agendamento_id, total_centavos")
        .eq("tenant_id", tenantId)
        .eq("cliente_id", cliente.id)
        .eq("status", "paga"),
    ]);

    const pagoPorAg = new Map<string, number>();
    for (const c of comandasRes.data ?? [])
      if (c.agendamento_id) pagoPorAg.set(c.agendamento_id, c.total_centavos ?? 0);

    const agora = Date.now();
    type H = {
      id: string;
      inicio: string;
      servico: string;
      profissional: string;
      status: string;
      valorCentavos: number;
    };
    const historico: H[] = (agRes.data ?? []).map((a: any) => ({
      id: a.id,
      inicio: a.inicio,
      servico: a.servicos?.nome ?? "Serviço",
      profissional: a.profissionais?.nome ?? "—",
      status: a.status,
      valorCentavos: pagoPorAg.get(a.id) ?? a.valor_centavos ?? 0,
    }));
    const feitos = historico.filter((h) => h.status === "finalizado");
    const ultimoFeitoBruto = (agRes.data ?? []).find((a: any) => a.status === "finalizado") as any;
    const retornoSugerido = ultimoFeitoBruto
      ? {
          data: new Date(
            new Date(ultimoFeitoBruto.inicio).getTime() +
              (ultimoFeitoBruto.servicos?.retorno_dias ?? 30) * 86_400_000,
          ).toISOString(),
          servico: ultimoFeitoBruto.servicos?.nome ?? "Serviço",
        }
      : null;
    const ultimo =
      feitos[0] ?? historico.find((h) => new Date(h.inicio).getTime() <= agora) ?? null;
    const servicosFreq = new Map<string, number>();
    for (const h of feitos) servicosFreq.set(h.servico, (servicosFreq.get(h.servico) ?? 0) + 1);

    const fotos = await Promise.all(
      (fotosRes.data ?? []).map(async (f: any) => {
        const { data: s } = await db.storage.from(BUCKET).createSignedUrl(f.caminho, 600);
        return { id: f.id, url: s?.signedUrl ?? "", criadoEm: f.criado_em };
      }),
    );

    return {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        avulso: cliente.telefone === "avulso",
      },
      ficha: {
        chips: cliente.ficha_chips ?? [],
        alergias: cliente.alergias,
        texto: cliente.ficha_tecnica,
      },
      preferencias: validarPreferenciasCliente(cliente.preferencias),
      catalogo: tenantRes.data?.chips_ficha ?? [],
      resumo: {
        ultimo: ultimo?.inicio ?? null,
        servicos: [...servicosFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([n]) => n),
        profissional: ultimo?.profissional ?? null,
        totalCentavos: feitos.reduce((s, h) => s + h.valorCentavos, 0),
        visitas: feitos.length,
      },
      faltas: historico.filter((h) => h.status === "nao_compareceu").length,
      cancelamentos: historico.filter((h) => h.status === "cancelado").length,
      fotos: fotos.filter((f) => f.url),
      historico: historico.slice(0, 30),
      retornoSugerido,
      fuso: tenantRes.data?.fuso ?? "America/Sao_Paulo",
    };
  });

const limpar = (t: string | null | undefined, max: number) => {
  const v = (t ?? "").trim();
  if (v.length > max) throw new Error("Texto muito longo.");
  return v === "" ? null : v;
};

export const salvarFichaCorte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      clienteId: string;
      chips: string[];
      alergias: string | null;
      texto: string | null;
      novoChip?: string | null;
    }) => ({
      clienteId: String(d.clienteId),
      chips: Array.from(new Set((d.chips ?? []).map((c) => String(c).trim()).filter(Boolean)))
        .slice(0, 20)
        .map((c) => c.slice(0, 30)),
      alergias: limpar(d.alergias, 200),
      texto: limpar(d.texto, 1000),
      novoChip: limpar(d.novoChip, 30),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, tenantId, cliente } = await contexto(context, data.clienteId);
    await exigirPermissao(context, tenantId, "editar_clientes");
    if (cliente.telefone === "avulso")
      throw new Error("Identifique o cliente avulso antes de salvar a ficha.");
    const { error } = await db
      .from("clientes")
      .update({ ficha_chips: data.chips, alergias: data.alergias, ficha_tecnica: data.texto })
      .eq("id", cliente.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Não foi possível salvar a ficha.");
    if (data.novoChip) {
      const { data: t } = await db
        .from("tenants")
        .select("chips_ficha")
        .eq("id", tenantId)
        .maybeSingle();
      const atual: string[] = t?.chips_ficha ?? [];
      if (!atual.includes(data.novoChip) && atual.length < 30) {
        await db
          .from("tenants")
          .update({ chips_ficha: [...atual, data.novoChip] })
          .eq("id", tenantId);
      }
    }
    return { ok: true };
  });

export const salvarPreferenciasCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { clienteId: string; preferencias: unknown }) => ({
    clienteId: String(d.clienteId),
    preferencias: validarPreferenciasCliente(d.preferencias),
  }))
  .handler(async ({ data, context }) => {
    const { db, tenantId, cliente } = await contexto(context, data.clienteId);
    await exigirPermissao(context, tenantId, "editar_clientes");
    if (cliente.telefone === "avulso")
      throw new Error("Identifique o cliente antes de salvar preferências.");
    const atuais = validarPreferenciasCliente(cliente.preferencias);
    const preferencias = validarPreferenciasCliente({ ...atuais, ...data.preferencias });
    const { error } = await db
      .from("clientes")
      .update({ preferencias })
      .eq("id", cliente.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Não foi possível salvar as preferências.");
    return { preferencias };
  });

export const salvarDetalhesCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { clienteId: string; nome: string; telefone: string; email?: string | null }) => {
      const nome = String(d.nome ?? "").trim().replace(/\s+/g, " ");
      const telefone = String(d.telefone ?? "").replace(/\D/g, "").slice(0, 15);
      if (nome.length < 2 || nome.length > 80) throw new Error("Informe o nome completo.");
      if (telefone.length < 10) throw new Error("Informe um telefone com DDD.");
      const e = normalizarEmailCliente(d.email);
      if (!e.ok) throw new Error(e.erro);
      return { clienteId: String(d.clienteId), nome, telefone, email: e.email };
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenantId, cliente } = await contexto(context, data.clienteId);
    await exigirPermissao(context, tenantId, "editar_clientes");
    if (cliente.telefone === "avulso")
      throw new Error("Identifique o cliente avulso na comanda antes de editar.");
    const { variantesDoTelefone } = await import("@/lib/telefone");
    const { data: outro } = await db
      .from("clientes")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("telefone", variantesDoTelefone(data.telefone))
      .neq("id", cliente.id)
      .limit(1)
      .maybeSingle();
    if (outro) throw new Error("Já existe outro cliente com esse telefone.");
    const { error } = await db
      .from("clientes")
      .update({ nome: data.nome, telefone: data.telefone, email: data.email })
      .eq("id", cliente.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Não foi possível salvar. Tente de novo.");
    return { nome: data.nome, telefone: data.telefone, email: data.email };
  });

export const enviarFotoCorte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      clienteId: string;
      agendamentoId?: string | null;
      imagem: string;
      consentimento: boolean;
    }) => {
      if (d.consentimento !== true)
        throw new Error("A foto só pode ser salva com autorização do cliente.");
      const m = /^data:image\/(jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(d.imagem ?? "");
      if (!m) throw new Error("Imagem inválida.");
      if (m[2]!.length > 1_500_000) throw new Error("Imagem muito grande.");
      return {
        clienteId: String(d.clienteId),
        agendamentoId: d.agendamentoId ? String(d.agendamentoId) : null,
        tipo: m[1]!,
        base64: m[2]!,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenantId, cliente } = await contexto(context, data.clienteId);
    await exigirPermissao(context, tenantId, "editar_clientes");
    let agendamentoId: string | null = null;
    if (data.agendamentoId) {
      const { data: ag } = await db
        .from("agendamentos")
        .select("id")
        .eq("id", data.agendamentoId)
        .eq("tenant_id", tenantId)
        .eq("cliente_id", cliente.id)
        .maybeSingle();
      agendamentoId = ag?.id ?? null;
    }
    const caminho = `${tenantId}/${cliente.id}/${crypto.randomUUID()}.${data.tipo === "webp" ? "webp" : "jpg"}`;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { error: up } = await db.storage
      .from(BUCKET)
      .upload(caminho, bytes, { contentType: `image/${data.tipo}`, upsert: false });
    if (up) throw new Error("Não foi possível enviar a foto.");
    const { error } = await db.from("fotos_de_corte").insert({
      tenant_id: tenantId,
      cliente_id: cliente.id,
      agendamento_id: agendamentoId,
      caminho,
      consentimento_em: new Date().toISOString(),
      registrado_por: context.userId,
    });
    if (error) {
      await db.storage.from(BUCKET).remove([caminho]);
      throw new Error("Não foi possível registrar a foto.");
    }
    return { ok: true };
  });

export const apagarFotoCorte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { fotoId: string }) => ({ fotoId: String(d.fotoId) }))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "editar_clientes");
    const db: any = await admin();
    const { data: foto } = await db
      .from("fotos_de_corte")
      .select("id, caminho")
      .eq("id", data.fotoId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!foto) throw new Error("Foto não encontrada.");
    await db.storage.from(BUCKET).remove([foto.caminho]);
    await db.from("fotos_de_corte").delete().eq("id", foto.id);
    return { ok: true };
  });
