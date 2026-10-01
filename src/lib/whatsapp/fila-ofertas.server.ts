/**
 * Lista de espera operacional: vaga liberada -> oferta ao primeiro cliente
 * compatível -> aceite atômico (RPC) ou expiração/recusa -> próximo da fila.
 * Usa o motor oficial (`validarAgendamento`) e o envio oficial do WhatsApp.
 * Nunca reserva sem o cliente confirmar. Nunca lança para quem cancelou.
 */
import { fusoDoTenant } from "@/lib/fuso.server";
import {
  STATUS_QUE_OCUPAM,
  regrasDaBarbearia,
  validarAgendamento,
} from "@/lib/agenda-regras.server";
import {
  candidatosDaVaga,
  servicoDaEntrada,
  type PreferenciaDaFila,
  type ServicoDaVaga,
} from "@/lib/fila-compatibilidade";

export const PRAZO_DA_OFERTA_MIN = 30;
const ANTECEDENCIA_MINIMA_MIN = 10;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function partes(iso: string, fuso: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...o }).format(d);
  const diaLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const horaLocal = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: fuso, hour: "2-digit", hourCycle: "h23" }).format(
      d,
    ),
  );
  return {
    diaLocal,
    horaLocal,
    dia: f({ weekday: "short", day: "2-digit", month: "2-digit" }),
    hora: f({ hour: "2-digit", minute: "2-digit" }),
  };
}

export function linkDaOferta(token: string) {
  return `https://cortai.dev/vaga/${token}`;
}

/** Oferece a vaga de um agendamento cancelado/remarcado ao próximo compatível. */
export async function ofertarVaga(
  agendamentoId: string,
): Promise<{ ofertaId: string | null; motivo?: string }> {
  const db = await admin();
  const { data: ag } = await db
    .from("agendamentos")
    .select("id, tenant_id, inicio, fim, status, profissional_id, servico_id")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag || !["cancelado", "remarcado"].includes(ag.status))
    return { ofertaId: null, motivo: "sem_vaga" };
  const profissionalId = ag.profissional_id;
  const servicoLiberadoId = ag.servico_id;
  if (!profissionalId || !servicoLiberadoId) return { ofertaId: null, motivo: "sem_vaga" };
  const agora = Date.now();
  const inicioMs = new Date(ag.inicio).getTime();
  if (inicioMs - agora < (ANTECEDENCIA_MINIMA_MIN + 5) * 60_000)
    return { ofertaId: null, motivo: "muito_perto" };

  const { data: ativo } = await db.rpc("recurso_do_tenant_ativo", {
    _tenant_id: ag.tenant_id,
    _chave: "fila_espera",
  });
  if (ativo !== true) return { ofertaId: null, motivo: "recurso_inativo" };

  const { data: jaAtiva } = await db
    .from("ofertas_da_fila")
    .select("id")
    .eq("agendamento_liberado_id", ag.id)
    .eq("status", "enviada")
    .maybeSingle();
  if (jaAtiva) return { ofertaId: jaAtiva.id, motivo: "ja_ativa" };

  // A vaga ainda está livre? (alguém pode ter ocupado depois do cancelamento)
  const regras = await regrasDaBarbearia(db, ag.tenant_id);
  const margem = Math.max(regras.intervaloEntreMin, 0) * 60_000;
  const { data: depois } = await db
    .from("agendamentos")
    .select("inicio, fim")
    .eq("profissional_id", profissionalId)
    .in("status", [...STATUS_QUE_OCUPAM])
    .gt("fim", new Date(inicioMs - margem).toISOString())
    .lt("inicio", new Date(inicioMs + 12 * 3600_000).toISOString())
    .order("inicio");
  if (
    (depois ?? []).some(
      (o) =>
        new Date(o.inicio).getTime() <= inicioMs && new Date(o.fim).getTime() + margem > inicioMs,
    )
  ) {
    return { ofertaId: null, motivo: "ocupada" };
  }
  const proximo = (depois ?? []).find((o) => new Date(o.inicio).getTime() > inicioMs);
  const livreAteMs = proximo
    ? new Date(proximo.inicio).getTime() - margem
    : inicioMs + 12 * 3600_000;

  const [{ data: fila }, { data: servicos }, { data: anteriores }] = await Promise.all([
    db
      .from("fila_de_espera")
      .select("id, posicao, criado_em, profissional_id, servico_id, janela_preferida, cliente_id")
      .eq("tenant_id", ag.tenant_id)
      .eq("status", "aguardando")
      .not("janela_preferida", "is", null)
      .limit(200),
    db.from("servicos").select("id, duracao_min, profissional_ids").eq("tenant_id", ag.tenant_id),
    db.from("ofertas_da_fila").select("fila_id").eq("agendamento_liberado_id", ag.id),
  ]);
  const mapa = new Map<string, ServicoDaVaga>(
    (servicos ?? []).map((s) => [s.id, s as ServicoDaVaga]),
  );
  const p = partes(ag.inicio, regras.fuso);
  const vaga = {
    inicioMs,
    livreAteMs,
    profissionalId,
    diaLocal: p.diaLocal,
    horaLocal: p.horaLocal,
    servicoLiberadoId,
  };
  const prefs: (PreferenciaDaFila & { clienteId: string })[] = (fila ?? []).map((f) => ({
    id: f.id,
    posicao: f.posicao ?? 0,
    criadoEm: f.criado_em,
    profissionalId: f.profissional_id,
    servicoId: f.servico_id,
    janela: (f.janela_preferida ?? null) as PreferenciaDaFila["janela"],
    clienteId: f.cliente_id,
  }));
  const candidatos = candidatosDaVaga(
    prefs,
    vaga,
    mapa,
    new Set((anteriores ?? []).map((a) => a.fila_id)),
  );

  for (const c of candidatos) {
    const cand = prefs.find((x) => x.id === c.id)!;
    const servico = mapa.get(servicoDaEntrada(c, vaga))!;
    // Motor oficial: horário de funcionamento, antecedência, janela, folga e conflito do cliente.
    try {
      const conflito = await validarAgendamento(db, {
        tenantId: ag.tenant_id,
        servico,
        profissionalId,
        inicio: new Date(inicioMs),
        clienteId: cand.clienteId,
      });
      if (conflito) continue;
    } catch {
      continue;
    }
    const expira = Math.min(
      agora + PRAZO_DA_OFERTA_MIN * 60_000,
      inicioMs - ANTECEDENCIA_MINIMA_MIN * 60_000,
    );
    const { data: oferta, error } = await db
      .from("ofertas_da_fila")
      .insert({
        tenant_id: ag.tenant_id,
        fila_id: c.id,
        agendamento_liberado_id: ag.id,
        profissional_id: profissionalId,
        servico_id: servico.id,
        inicio: ag.inicio,
        fim: new Date(inicioMs + servico.duracao_min * 60_000).toISOString(),
        expira_em: new Date(expira).toISOString(),
      })
      .select("id, token")
      .maybeSingle();
    // Índice único: outra execução já ofertou esta vaga.
    if (error || !oferta) return { ofertaId: null, motivo: "concorrente" };
    await db
      .from("fila_de_espera")
      .update({ status: "avisado", avisado_em: new Date().toISOString() })
      .eq("id", c.id)
      .eq("status", "aguardando");
    await enviarOferta(oferta.id).catch(() => undefined);
    return { ofertaId: oferta.id };
  }
  return { ofertaId: null, motivo: "sem_compativel" };
}

/** Aviso interno + WhatsApp oficial (quando conectado). Falha nunca quebra o fluxo. */
async function enviarOferta(ofertaId: string) {
  const db = await admin();
  const { data: o } = await db
    .from("ofertas_da_fila")
    .select(
      "id, token, tenant_id, inicio, expira_em, servicos(nome), profissionais(nome), fila_de_espera(cliente_id, clientes(nome, telefone))",
    )
    .eq("id", ofertaId)
    .maybeSingle();
  if (!o) return;
  const fuso = await fusoDoTenant(o.tenant_id);
  const p = partes(o.inicio, fuso);
  const cli = (
    o.fila_de_espera as { clientes?: { nome?: string; telefone?: string | null } | null } | null
  )?.clientes;
  const servico = (o.servicos as { nome?: string } | null)?.nome ?? "atendimento";
  const profissional = (o.profissionais as { nome?: string } | null)?.nome;
  await db.rpc("criar_notificacao", {
    _tenant: o.tenant_id,
    _tipo: "fila",
    _titulo: "Vaga oferecida à lista de espera",
    _corpo: `${cli?.nome ?? "Cliente"} recebeu a vaga de ${p.dia} às ${p.hora} (${servico}).`,
    _link: LINKS_DE_TELA.espera,
  });

  const telefone = String(cli?.telefone ?? "").replace(/\D/g, "");
  if (telefone.length < 10) return;
  const { conexaoDeEnvio } = await import("./conexao-envio.server");
  const conexao = await conexaoDeEnvio(o.tenant_id);
  if (!conexao) {
    console.warn("[whatsapp] oferta da lista de espera sem remetente: Nenhum WhatsApp disponível.");
    return;
  }
  const { conversaDoTelefone, enviarPelaBarbearia } = await import("./fluxo.server");
  const conversa = await conversaDoTelefone({
    tenantId: o.tenant_id,
    conexaoId: conexao.id,
    telefone,
    nomeContato: cli?.nome ?? null,
  });
  const nome = (cli?.nome ?? "").split(/\s+/)[0];
  const prazo = partes(o.expira_em, fuso).hora;
  await enviarPelaBarbearia({
    tenantId: o.tenant_id,
    conversaId: conversa.id,
    conexaoId: conexao.id,
    sessaoId: conexao.sessao_id,
    telefone,
    texto: [
      `${nome ? `${nome}, a` : "A"}briu uma vaga da sua lista de espera.`,
      `${servico}${profissional ? ` com ${profissional}` : ""} · ${p.dia} às ${p.hora}.`,
      "",
      `Para confirmar até ${prazo}: ${linkDaOferta(o.token)}`,
    ].join("\n"),
    porIa: false,
    iniciadaPelaBarbearia: true,
  });
  await db.from("ofertas_da_fila").update({ enviada_whatsapp: true }).eq("id", o.id);
}

export async function aceitarOferta(token: string) {
  const db = await admin();
  const { data, error } = await db.rpc("aceitar_oferta_da_fila", { _token: token });
  if (error) throw new Error("Não foi possível confirmar agora. Tente de novo.");
  const r = data as { ok: boolean; motivo?: string; agendamento_id?: string; repetida?: boolean };
  if (r.ok && r.agendamento_id && !r.repetida) {
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("./confirmacao.server");
      await enviarConfirmacaoDeAgendamento(r.agendamento_id);
    } catch {
      /* agendamento salvo; falha fica registrada no envio */
    }
  }
  if (!r.ok) {
    // Vaga perdida para quem aceitou: libera o cliente e segue a fila se ainda houver vaga.
    const { data: o } = await db
      .from("ofertas_da_fila")
      .select("fila_id, agendamento_liberado_id")
      .eq("token", token)
      .maybeSingle();
    if (o) {
      await db
        .from("fila_de_espera")
        .update({ status: "aguardando" })
        .eq("id", o.fila_id)
        .eq("status", "avisado");
      if (r.motivo === "expirada" && o.agendamento_liberado_id)
        await ofertarVaga(o.agendamento_liberado_id).catch(() => undefined);
    }
  }
  return r;
}

export async function recusarOferta(token: string) {
  const db = await admin();
  const { data: o } = await db
    .from("ofertas_da_fila")
    .update({ status: "recusada", respondida_em: new Date().toISOString() })
    .eq("token", token)
    .eq("status", "enviada")
    .select("fila_id, agendamento_liberado_id")
    .maybeSingle();
  if (!o) return { ok: false };
  await db
    .from("fila_de_espera")
    .update({ status: "aguardando" })
    .eq("id", o.fila_id)
    .eq("status", "avisado");
  if (o.agendamento_liberado_id)
    await ofertarVaga(o.agendamento_liberado_id).catch(() => undefined);
  return { ok: true };
}

/** Oferta cancelada porque a vaga foi ocupada (ex.: cancelamento desfeito). */
export async function cancelarOfertasDaVaga(agendamentoId: string) {
  const db = await admin();
  const { data } = await db
    .from("ofertas_da_fila")
    .update({ status: "cancelada", respondida_em: new Date().toISOString() })
    .eq("agendamento_liberado_id", agendamentoId)
    .eq("status", "enviada")
    .select("fila_id");
  for (const o of data ?? []) {
    await db
      .from("fila_de_espera")
      .update({ status: "aguardando" })
      .eq("id", o.fila_id)
      .eq("status", "avisado");
  }
}

/**
 * Varredura (agendador de 15 min): expira ofertas vencidas e passa ao próximo;
 * também cobre cancelamentos recentes que ainda não geraram oferta.
 */
export async function processarListaDeEspera(agora = new Date()) {
  const db = await admin();
  const { data: vencidas } = await db
    .from("ofertas_da_fila")
    .update({ status: "expirada" })
    .eq("status", "enviada")
    .lt("expira_em", agora.toISOString())
    .select("fila_id, agendamento_liberado_id");
  let ofertas = 0;
  for (const v of vencidas ?? []) {
    await db
      .from("fila_de_espera")
      .update({ status: "aguardando" })
      .eq("id", v.fila_id)
      .eq("status", "avisado");
  }
  const vagas = new Set(
    (vencidas ?? []).map((v) => v.agendamento_liberado_id).filter(Boolean) as string[],
  );
  const { data: cancelados } = await db
    .from("agendamentos")
    .select("id")
    .in("status", ["cancelado", "remarcado"])
    .gt("inicio", new Date(agora.getTime() + 20 * 60_000).toISOString())
    .gt("status_alterado_em", new Date(agora.getTime() - 24 * 3600_000).toISOString())
    .limit(100);
  for (const c of cancelados ?? []) vagas.add(c.id);
  for (const id of vagas) {
    const r = await ofertarVaga(id).catch(() => ({ ofertaId: null }));
    if (r.ofertaId) ofertas += 1;
  }
  return { expiradas: vencidas?.length ?? 0, ofertas };
}
