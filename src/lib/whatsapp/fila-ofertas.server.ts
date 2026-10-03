/**
 * Lista de espera operacional: vaga liberada -> oferta ao primeiro cliente
 * compatível -> aceite atômico (RPC) ou expiração/recusa -> próximo da fila.
 * Usa o motor oficial (`validarAgendamento`) e o envio oficial do WhatsApp.
 * Nunca reserva sem o cliente confirmar. Nunca lança para quem cancelou.
 */
import { fusoDoTenant } from "@/lib/fuso.server";
import { LINKS_DE_TELA } from "@/lib/links-de-tela";
import {
  STATUS_QUE_OCUPAM,
  regrasDaBarbearia,
  validarAgendamento,
} from "@/lib/agenda-regras.server";
import {
  candidatosDaVaga,
  ofertaViavel,
  prazoDaOferta,
  servicoDaEntrada,
  type PreferenciaDaFila,
  type ServicoDaVaga,
} from "@/lib/fila-compatibilidade";

export { PRAZO_DA_OFERTA_MIN } from "@/lib/fila-compatibilidade";
const LOTE_DA_FILA = 200;
const TETO_DA_FILA = 2000;
const TENTATIVAS_POR_VAGA = 20;

/** Interruptor do negócio: desligado = nenhuma oferta automática nova. */
export async function automacaoDaListaAtiva(
  db: Awaited<ReturnType<typeof admin>>,
  tenantId: string,
) {
  const { data } = await db
    .from("tenants")
    .select("lista_espera_automatica")
    .eq("id", tenantId)
    .maybeSingle();
  return data?.lista_espera_automatica !== false;
}

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
  if (!ofertaViavel(agora, inicioMs)) return { ofertaId: null, motivo: "muito_perto" };

  const { data: ativo } = await db.rpc("recurso_do_tenant_ativo", {
    _tenant_id: ag.tenant_id,
    _chave: "fila_espera",
  });
  if (ativo !== true) return { ofertaId: null, motivo: "recurso_inativo" };
  if (!(await automacaoDaListaAtiva(db, ag.tenant_id)))
    return { ofertaId: null, motivo: "automacao_desligada" };

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

  const [{ data: servicos }, { data: anteriores }] = await Promise.all([
    db.from("servicos").select("id, duracao_min, profissional_ids").eq("tenant_id", ag.tenant_id),
    db.from("ofertas_da_fila").select("fila_id").eq("agendamento_liberado_id", ag.id),
  ]);
  const mapa = new Map<string, ServicoDaVaga>(
    (servicos ?? []).map((s) => [s.id, s as ServicoDaVaga]),
  );
  const jaOfertados = new Set((anteriores ?? []).map((a) => a.fila_id));
  const p = partes(ag.inicio, regras.fuso);
  const vaga = {
    inicioMs,
    livreAteMs,
    profissionalId,
    diaLocal: p.diaLocal,
    horaLocal: p.horaLocal,
    servicoLiberadoId,
  };

  // Ordem real (posição, entrada, id) em lotes de 200; para no primeiro compatível válido.
  let tentativas = 0;
  for (let de = 0; de < TETO_DA_FILA && tentativas < TENTATIVAS_POR_VAGA; de += LOTE_DA_FILA) {
    const { data: lote } = await db
      .from("fila_de_espera")
      .select("id, posicao, criado_em, profissional_id, servico_id, janela_preferida, cliente_id")
      .eq("tenant_id", ag.tenant_id)
      .eq("status", "aguardando")
      .not("janela_preferida", "is", null)
      .or(`profissional_id.is.null,profissional_id.eq.${profissionalId}`)
      .order("posicao", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: true })
      .order("id", { ascending: true })
      .range(de, de + LOTE_DA_FILA - 1);
    const prefs: (PreferenciaDaFila & { clienteId: string })[] = (lote ?? []).map((f) => ({
      id: f.id,
      posicao: f.posicao ?? 0,
      criadoEm: f.criado_em,
      profissionalId: f.profissional_id,
      servicoId: f.servico_id,
      janela: (f.janela_preferida ?? null) as PreferenciaDaFila["janela"],
      clienteId: f.cliente_id,
    }));
    for (const c of candidatosDaVaga(prefs, vaga, mapa, jaOfertados)) {
      if (tentativas++ >= TENTATIVAS_POR_VAGA) break;
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
      const agoraOferta = Date.now();
      if (!ofertaViavel(agoraOferta, inicioMs)) return { ofertaId: null, motivo: "muito_perto" };
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
          expira_em: new Date(prazoDaOferta(agoraOferta, inicioMs)).toISOString(),
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
    if (!lote || lote.length < LOTE_DA_FILA) break;
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
    _corpo: `${cli?.nome ?? "Cliente"} recebeu a vaga de ${p.dia} às ${p.hora} (${servico}). Responde até ${partes(o.expira_em, fuso).hora}.`,
    _link: LINKS_DE_TELA.espera,
  });

  const telefone = String(cli?.telefone ?? "").replace(/\D/g, "");
  if (telefone.length < 10) return;
  const clienteId = (o.fila_de_espera as { cliente_id?: string | null } | null)?.cliente_id ?? null;

  // Toda oferta vira um envio: entra nas entregas, falhas e métricas.
  const { data: envio, error: erroEnvio } = await db
    .from("envios_de_whatsapp")
    .insert({
      tenant_id: o.tenant_id,
      cliente_id: clienteId,
      telefone,
      tipo: "vaga_lista_espera",
      status: "enviando",
      tentativas: 1,
      oferta_id: o.id,
    } as never)
    .select("id")
    .single();
  if (erroEnvio || !envio) return;
  const envioId = (envio as { id: string }).id;
  const { aplicarFalhaDeEnvio } = await import("./falhas-envio.server");

  const { conexaoDeEnvio, SEM_WHATSAPP_DISPONIVEL } = await import("./conexao-envio.server");
  const conexao = await conexaoDeEnvio(o.tenant_id);
  const nome = (cli?.nome ?? "").split(/\s+/)[0];
  const prazo = partes(o.expira_em, fuso).hora;
  const { data: tenant } = await db
    .from("tenants")
    .select("nome")
    .eq("id", o.tenant_id)
    .maybeSingle();
  const negocio = tenant?.nome ?? "Negócio";
  const texto = [
    `${nome ? `${nome}, a` : "A"}briu uma vaga da sua lista de espera em ${negocio}.`,
    `${servico}${profissional ? ` com ${profissional}` : ""} · ${p.dia} às ${p.hora}.`,
    "",
    `Responda até ${prazo}. Se preferir: ${linkDaOferta(o.token)}`,
  ].join("\n");
  if (!conexao) {
    await db.from("envios_de_whatsapp").update({ conteudo: texto }).eq("id", envioId);
    await aplicarFalhaDeEnvio({ envioId, codigo: null, motivo: SEM_WHATSAPP_DISPONIVEL });
    return;
  }

  const { botoesInterativos, parametrosNaOrdem, payloadDoBotao } = await import("./modelos");
  const { modeloAprovadoDoTipo } = await import("./modelos.server");
  const doCatalogo = await modeloAprovadoDoTipo("vaga_lista_espera");
  const botoes = [
    { texto: "Quero", acao: "CORTAI_QUERO" },
    { texto: "Não posso", acao: "CORTAI_NAO_POSSO" },
  ];
  let modelo: import("./gateway.server").ModeloComBotoes | null = null;
  if (doCatalogo) {
    try {
      modelo = {
        nome: doCatalogo.nome,
        idioma: doCatalogo.idioma,
        parametros: parametrosNaOrdem(doCatalogo.variaveis, {
          cliente: nome || "cliente",
          negocio,
          data: p.dia,
          hora: p.hora,
          servico,
          profissional: profissional ?? "a equipe",
          prazo,
        }),
        botoes: doCatalogo.botoes.map((b) => payloadDoBotao(b.acao, envioId)),
      };
    } catch {
      modelo = null;
    }
  }

  const { conversaDoTelefone, enviarPelaBarbearia } = await import("./fluxo.server");
  const conversa = await conversaDoTelefone({
    tenantId: o.tenant_id,
    conexaoId: conexao.id,
    telefone,
    nomeContato: cli?.nome ?? null,
  });
  try {
    const r = await enviarPelaBarbearia({
      tenantId: o.tenant_id,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto,
      porIa: false,
      modelo,
      interativo: botoesInterativos(botoes, envioId),
      iniciadaPelaBarbearia: true,
    });
    await db
      .from("envios_de_whatsapp")
      .update({
        status: "enviado",
        conteudo: texto,
        enviado_em: new Date().toISOString(),
        aguarda_resposta: true,
        acoes: botoes.map((b) => b.acao),
        valido_ate: o.expira_em,
        mensagem_externa_id: r.externoId,
      } as never)
      .eq("id", envioId);
    await db.from("ofertas_da_fila").update({ enviada_whatsapp: true }).eq("id", o.id);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "Falha ao enviar pelo WhatsApp.";
    await db.from("envios_de_whatsapp").update({ conteudo: texto }).eq("id", envioId);
    const { lerErroMeta } = await import("./erros-meta");
    const lido = lerErroMeta(motivo);
    await aplicarFalhaDeEnvio({
      envioId,
      codigo: /janela de 24h/i.test(motivo) ? 131047 : lido.codigo,
      httpStatus: lido.httpStatus,
      motivo,
    });
  }
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
