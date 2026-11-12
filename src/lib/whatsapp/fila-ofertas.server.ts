/**
 * Lista de espera operacional: vaga liberada -> oferta ao primeiro cliente
 * compatível -> aceite atômico (RPC) ou expiração/recusa -> próximo da fila.
 * Usa o motor oficial (`validarAgendamento`) e o envio oficial do WhatsApp.
 * Nunca reserva sem o cliente confirmar. Nunca lança para quem cancelou.
 */
import { fusoDoTenant } from "@/lib/fuso.server";
import { classificarImpedimentoDeOferta } from "@/lib/fila-ofertas-canal";
import {
  reservarOfertaTransacional,
  encerrarOfertaTransacional,
  type ExecutarRpcDaFila,
} from "@/lib/fila-ofertas-transacional";
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
  regrasDaEsperaDoTenant,
  servicoDaEntrada,
  type PreferenciaDaFila,
  type ServicoDaVaga,
} from "@/lib/fila-compatibilidade";
import { urlPublica } from "@/lib/origem-publica";

export { PRAZO_DA_OFERTA_MIN } from "@/lib/fila-compatibilidade";
const LOTE_DA_FILA = 200;
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

/**
 * As RPCs transacionais são pré-requisito deste PR. Não criar fallback não atômico:
 * a migração precisa ser aplicada e testada ANTES de qualquer merge/deploy.
 */
function executarTransicaoDaFila(
  db: Awaited<ReturnType<typeof admin>>,
): ExecutarRpcDaFila {
  const rpc = (db as unknown as { rpc: ExecutarRpcDaFila }).rpc;
  return (nome, parametros) => rpc.call(db, nome, parametros);
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
  return urlPublica(`/vaga/${token}`);
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
  // Regras do negócio (migração 0060). Sem as colunas (migração ainda não aplicada) vale o padrão de antes.
  const { data: regrasTenant } = await db
    .from("tenants")
    .select("espera_prazo_min, espera_antecedencia_min, espera_qualquer_profissional")
    .eq("id", ag.tenant_id)
    .maybeSingle();
  const regrasEspera = regrasDaEsperaDoTenant(regrasTenant);
  if (!ofertaViavel(agora, inicioMs, regrasEspera))
    return { ofertaId: null, motivo: "muito_perto" };

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
    horaMinLocal: p.hora,
    servicoLiberadoId,
  };

  // Ordem real (posição, entrada, id) em lotes de 200, até o fim da fila;
  // para no primeiro compatível válido ou após 20 candidatos compatíveis.
  // Duas passadas pela fila inteira: primeiro só quem pediu exatamente este dia e
  // horário (em toda a fila, não por lote), depois todos os demais na ordem real.
  let tentativas = 0;
  for (const soExatos of [true, false])
    for (let de = 0; tentativas < TENTATIVAS_POR_VAGA; de += LOTE_DA_FILA) {
      let consulta = db
        .from("fila_de_espera")
        .select("id, posicao, criado_em, profissional_id, servico_id, janela_preferida, cliente_id")
        .eq("tenant_id", ag.tenant_id)
        .eq("status", "aguardando")
        .not("janela_preferida", "is", null);
      // "Só o profissional pedido" (padrão): quem pediu outro profissional nem entra no lote.
      if (!regrasEspera.qualquerProfissional)
        consulta = consulta.or(`profissional_id.is.null,profissional_id.eq.${profissionalId}`);
      consulta = consulta
        .order("posicao", { ascending: true, nullsFirst: false })
        .order("criado_em", { ascending: true })
        .order("id", { ascending: true })
        .range(de, de + LOTE_DA_FILA - 1);
      if (soExatos)
        consulta = consulta
          .eq("janela_preferida->>horario", p.hora)
          .eq("janela_preferida->>dia", p.diaLocal);
      const { data: lote } = await consulta;
      const prefs: (PreferenciaDaFila & { clienteId: string })[] = (lote ?? []).map((f) => ({
        id: f.id,
        posicao: f.posicao ?? 0,
        criadoEm: f.criado_em,
        profissionalId: f.profissional_id,
        servicoId: f.servico_id,
        janela: (f.janela_preferida ?? null) as PreferenciaDaFila["janela"],
        clienteId: f.cliente_id,
      }));
      for (const c of candidatosDaVaga(prefs, vaga, mapa, jaOfertados, regrasEspera)) {
        if (tentativas++ >= TENTATIVAS_POR_VAGA) break;
        jaOfertados.add(c.id); // não reavaliar na segunda passada
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
        if (!ofertaViavel(agoraOferta, inicioMs, regrasEspera))
          return { ofertaId: null, motivo: "muito_perto" };

        const reserva = await reservarOfertaTransacional(executarTransicaoDaFila(db), {
          tenantId: ag.tenant_id,
          filaId: c.id,
          agendamentoLiberadoId: ag.id,
          profissionalId,
          servicoId: servico.id,
          inicio: ag.inicio,
          fim: new Date(inicioMs + servico.duracao_min * 60_000).toISOString(),
          expiraEm: new Date(prazoDaOferta(agoraOferta, inicioMs, regrasEspera)).toISOString(),
        });
        if (!reserva.ok) {
          if (["entrada_indisponivel", "incompativel", "servico_invalido", "profissional_invalido", "cliente_indisponivel"].includes(reserva.motivo))
            continue;
          return { ofertaId: null, motivo: reserva.motivo };
        }
        const ofertaId = reserva.ofertaId;
        // Falha comprovada antes do envio não pode deixar a vaga "enviada".
        // Se o provedor pode ter recebido a chamada, preservar a oferta até
        // esclarecimento/expiração para não prometer a mesma vaga a duas pessoas.
        const entrega = await enviarOferta(ofertaId).catch(() => "incerta" as const);
        if (entrega === "sem_canal") {
          const encerramento = await encerrarOfertaTransacional(
            executarTransicaoDaFila(db),
            { tenantId: ag.tenant_id, ofertaId, estado: "cancelada" },
          );
          if (!encerramento.ok)
            return { ofertaId, motivo: "cancelamento_pendente" };
          continue;
        }
        return {
          ofertaId,
          ...(entrega === "incerta" ? { motivo: "entrega_indeterminada" } : {}),
        };
      }
      if (!lote || lote.length < LOTE_DA_FILA) break;
    }
  return { ofertaId: null, motivo: "sem_compativel" };
}

/** Ausência comprovada de canal ≠ falha incerta após uma tentativa ao provedor. */
type EntregaDaOferta = "enviada" | "sem_canal" | "incerta";

/** Aviso interno + WhatsApp oficial (quando conectado). Falha nunca quebra o fluxo. */
async function enviarOferta(ofertaId: string): Promise<EntregaDaOferta> {
  const db = await admin();
  const { data: o } = await db
    .from("ofertas_da_fila")
    .select(
      "id, token, tenant_id, inicio, expira_em, servicos(nome), profissionais(nome), fila_de_espera(cliente_id, janela_preferida, clientes(nome, telefone))",
    )
    .eq("id", ofertaId)
    .maybeSingle();
  if (!o) return "incerta";
  const fuso = await fusoDoTenant(o.tenant_id);
  const p = partes(o.inicio, fuso);
  const cli = (
    o.fila_de_espera as { clientes?: { nome?: string; telefone?: string | null } | null } | null
  )?.clientes;
  const servico = (o.servicos as { nome?: string } | null)?.nome ?? "atendimento";
  const profissional = (o.profissionais as { nome?: string } | null)?.nome;
  // O sininho da equipe é acessório: uma falha nele não pode segurar uma
  // reserva nem impedir a decisão de envio da fila.
  try {
    await db.rpc("criar_notificacao", {
      _tenant: o.tenant_id,
      _tipo: "fila",
      _titulo: "Vaga em preparação para a lista de espera",
      _corpo: `Foi preparada uma oferta para ${cli?.nome ?? "Cliente"}: ${p.dia} às ${p.hora} (${servico}). Verifique se o envio foi confirmado.`,
      _link: LINKS_DE_TELA.espera,
    });
  } catch {
    // Falha no aviso interno fica independente do canal de cliente.
  }

  const telefone = String(cli?.telefone ?? "").replace(/\D/g, "");
  if (telefone.length < 10) return "sem_canal";
  const clienteId = (o.fila_de_espera as { cliente_id?: string | null } | null)?.cliente_id ?? null;
  // Porteiro do telefone + autorização específica para receber ofertas da lista.
  const { decisaoDeEnvio } = await import("./porteiro.server");
  const decisaoTitularidade = await decisaoDeEnvio(clienteId);
  if (!decisaoTitularidade.pode)
    return classificarImpedimentoDeOferta(decisaoTitularidade.motivo);
  const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
  const autorizacaoInicial = await verificarConsentimentoWhatsapp({
    tenantId: o.tenant_id,
    telefone,
    finalidade: "lista_espera",
  });
  if (!autorizacaoInicial.pode)
    return classificarImpedimentoDeOferta(autorizacaoInicial.motivo);

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
  if (erroEnvio || !envio) return "incerta";
  const envioId = (envio as { id: string }).id;
  const { aplicarFalhaDeEnvio } = await import("./falhas-envio.server");

  const { conexaoDeEnvio, SEM_WHATSAPP_DISPONIVEL } = await import("./conexao-envio.server");
  const conexao = await conexaoDeEnvio(o.tenant_id, "notificacoes");
  const nome = (cli?.nome ?? "").split(/\s+/)[0];
  const prazo = partes(o.expira_em, fuso).hora;
  const { data: tenant } = await db
    .from("tenants")
    .select("nome")
    .eq("id", o.tenant_id)
    .maybeSingle();
  const negocio = tenant?.nome ?? "Negócio";
  const janelaPedida = (
    o.fila_de_espera as { janela_preferida?: { horario?: string } | null } | null
  )?.janela_preferida;
  const pediuEsteHorario = janelaPedida?.horario === p.hora;
  const texto = pediuEsteHorario
    ? [
        `🔔 ${nome ? `${nome}, s` : "S"}eu horário ficou disponível em ${negocio}!`,
        `${p.dia} às ${p.hora} está disponível para você.`,
        `Serviço: ${servico}${profissional ? `\nProfissional: ${profissional}` : ""}`,
        "Você entrou na lista de espera para esse horário.",
        "",
        `Responda até ${prazo}. Se preferir: ${linkDaOferta(o.token)}`,
      ].join("\n")
    : [
        `${nome ? `${nome}, a` : "A"}briu uma vaga da sua lista de espera em ${negocio}.`,
        `${servico}${profissional ? ` com ${profissional}` : ""} · ${p.dia} às ${p.hora}.`,
        "",
        `Responda até ${prazo}. Se preferir: ${linkDaOferta(o.token)}`,
      ].join("\n");
  if (!conexao) {
    await db.from("envios_de_whatsapp").update({ conteudo: texto }).eq("id", envioId);
    await aplicarFalhaDeEnvio({ envioId, codigo: null, motivo: SEM_WHATSAPP_DISPONIVEL });
    return "sem_canal";
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
  // Revalida no último instante para honrar SAIR mesmo após a oferta ser preparada.
  const autorizacaoFinal = await verificarConsentimentoWhatsapp({
    tenantId: o.tenant_id,
    telefone,
    finalidade: "lista_espera",
  });
  if (!autorizacaoFinal.pode) {
    await db
      .from("envios_de_whatsapp")
      .update({
        status: "falhou",
        erro: autorizacaoFinal.motivo.slice(0, 500),
        falhou_em: new Date().toISOString(),
        proxima_tentativa_em: null,
      })
      .eq("id", envioId);
    return classificarImpedimentoDeOferta(autorizacaoFinal.motivo);
  }

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
      consentimento: "lista_espera",
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
    return "enviada";
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
    // Transportes podem aceitar o envio e falhar ao responder. Não gerar
    // oferta concorrente automaticamente sem confirmação negativa do canal.
    return "incerta";
  }
}

export async function aceitarOferta(token: string) {
  const db = await admin();
  const { data, error } = await db.rpc("aceitar_oferta_da_fila", { _token: token });
  if (error) throw new Error("Não foi possível confirmar agora. Tente de novo.");
  const r = data as { ok: boolean; motivo?: string; agendamento_id?: string; repetida?: boolean };
  let confirmacaoEnviada = false;
  if (r.ok && r.agendamento_id && !r.repetida) {
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("./confirmacao.server");
      const envio = await enviarConfirmacaoDeAgendamento(r.agendamento_id);
      confirmacaoEnviada = envio?.enviado === true;
    } catch {
      /* agendamento salvo; falha fica registrada no envio */
    }
  }
  if (!r.ok && r.motivo === "expirada") {
    // A RPC já libera somente a reserva da oferta atual; nunca liberar de novo.
    const { data: antiga } = await db
      .from("ofertas_da_fila")
      .select("agendamento_liberado_id")
      .eq("token", token)
      .maybeSingle();
    if (antiga?.agendamento_liberado_id)
      await ofertarVaga(antiga.agendamento_liberado_id).catch(() => undefined);
  }
  return { ...r, confirmacaoEnviada };
}

export async function recusarOferta(token: string) {
  const db = await admin();
  const { data: o, error } = await db
    .from("ofertas_da_fila")
    .select("id, tenant_id")
    .eq("token", token)
    .eq("status", "enviada")
    .maybeSingle();
  if (error || !o) return { ok: false };
  const fim = await encerrarOfertaTransacional(executarTransicaoDaFila(db), {
    tenantId: o.tenant_id, ofertaId: o.id, estado: "recusada",
  });
  if (!fim.ok) return { ok: false };
  if (fim.agendamentoLiberadoId)
    await ofertarVaga(fim.agendamentoLiberadoId).catch(() => undefined);
  return { ok: true };
}

/** Oferta cancelada porque a vaga foi ocupada (ex.: cancelamento desfeito). */
export async function cancelarOfertasDaVaga(agendamentoId: string) {
  const db = await admin();
  const { data: ativas, error } = await db
    .from("ofertas_da_fila")
    .select("id, tenant_id")
    .eq("agendamento_liberado_id", agendamentoId)
    .eq("status", "enviada");
  if (error) throw new Error("Não foi possível consultar as ofertas da vaga.");
  for (const o of ativas ?? []) {
    await encerrarOfertaTransacional(executarTransicaoDaFila(db), {
      tenantId: o.tenant_id, ofertaId: o.id, estado: "cancelada",
    });
  }
}

/**
 * Varredura (agendador de 15 min): expira ofertas vencidas e passa ao próximo;
 * também cobre cancelamentos recentes que ainda não geraram oferta.
 */
export async function processarListaDeEspera(agora = new Date()) {
  const db = await admin();
  const { data: vencidas, error: erroBusca } = await db
    .from("ofertas_da_fila")
    .select("id, tenant_id")
    .eq("status", "enviada")
    .lt("expira_em", agora.toISOString())
    .limit(100);
  if (erroBusca) throw new Error("Não foi possível consultar ofertas expiradas.");
  let expiradas = 0;
  let ofertas = 0;
  const vagas = new Set<string>();
  for (const o of vencidas ?? []) {
    const fim = await encerrarOfertaTransacional(executarTransicaoDaFila(db), {
      tenantId: o.tenant_id, ofertaId: o.id, estado: "expirada",
    });
    if (!fim.ok) continue;
    expiradas += 1;
    if (fim.agendamentoLiberadoId) vagas.add(fim.agendamentoLiberadoId);
  }
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
  return { expiradas, ofertas };
}
