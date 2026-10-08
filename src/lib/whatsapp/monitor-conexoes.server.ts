/**
 * Monitor das conexões próprias (Evolution) de cada negócio.
 * Roda dentro da varredura de 15 min já existente — sem agendador novo.
 *
 * - consulta o estado real por sessão, em lotes pequenos e com prazo;
 * - queda silenciosa → "desconectado" + um aviso ao dono por episódio;
 * - reconexão automática limitada (1 por janela, espera crescente);
 * - QR exigido → "qr_pronto" + aviso; nunca tenta contornar o QR.
 */
import type { EstadoDaSessao } from "./gateway.server";
import { decidirAcaoDoMonitor, logConexao } from "./saude-conexao";

const TAMANHO_DO_LOTE = 10;
const PRAZO_MS = 8_000;
const LIMITE_POR_EXECUCAO = 300;

type Linha = {
  id: string;
  tenant_id: string;
  sessao_id: string;
  provedor: string | null;
  status: string;
  conectado_em: string | null;
  reconexao_tentativas: number;
  reconexao_tentada_em: string | null;
};

function comPrazo<T>(p: Promise<T>, ms = PRAZO_MS): Promise<T> {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error(`Sem resposta em ${ms} ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), ok(v)),
      (e) => (clearTimeout(t), falha(e)),
    );
  });
}

async function avisarDono(linha: Linha, tipo: "queda" | "qr") {
  const { emitirAviso } = await import("@/lib/avisos/emitir.server");
  await emitirAviso({
    tenantId: linha.tenant_id,
    evento: "whatsapp_conexao",
    titulo: tipo === "qr" ? "WhatsApp pede novo QR Code" : "WhatsApp desconectado",
    corpo:
      tipo === "qr"
        ? "Abra a tela do WhatsApp no Cortaí e escaneie o QR Code para voltar a enviar avisos."
        : "A conexão do WhatsApp caiu. Já tentamos reconectar; se continuar, toque em Reconectar.",
    link: "/barbeiro/cortai",
    referencia: linha.id,
    // Um aviso por episódio: a versão muda só quando a conexão volta e cai de novo.
    versao: `${tipo}-${linha.conectado_em ?? "nunca"}`,
    alvos: [{ destinatario: "gestor" }],
  });
}

async function verificarUma(linha: Linha, agora: Date) {
  const { gatewayDoProvedor, normalizarStatus } = await import("./gateway.server");
  const { atualizarEstadoDaConexao } = await import("./fluxo.server");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const gw = gatewayDoProvedor(linha.provedor);
  const base = { sessaoId: linha.sessao_id, tenantId: linha.tenant_id };

  let real: EstadoDaSessao;
  try {
    real = await comPrazo(gw.consultarStatus(linha.sessao_id));
  } catch (e) {
    // Serviço sem resposta não prova queda: registra e tenta na próxima varredura.
    logConexao("monitor_sem_resposta", { ...base, erro: e instanceof Error ? e.message : "" });
    await db.from("conexoes_whatsapp").update({ verificado_em: agora.toISOString() }).eq("id", linha.id);
    return "sem_resposta" as const;
  }

  const acao = decidirAcaoDoMonitor({
    statusBanco: linha.status,
    statusReal: normalizarStatus(real.status),
    tentativas: linha.reconexao_tentativas,
    tentadaEm: linha.reconexao_tentada_em,
    agora,
  });
  await db.from("conexoes_whatsapp").update({ verificado_em: agora.toISOString() }).eq("id", linha.id);

  if (acao.tipo === "nada") return "ok" as const;
  if (acao.tipo === "conectado") {
    await atualizarEstadoDaConexao(linha.sessao_id, {
      status: "conectado",
      numero: real.numero ?? null,
      nomeExibicao: real.nomeExibicao ?? null,
      origem: "monitor",
    });
    return "ok" as const;
  }
  if (acao.tipo === "aguardando_qr") {
    await atualizarEstadoDaConexao(linha.sessao_id, {
      status: "qr_pronto",
      qrCode: real.qrCode ?? null,
      qrExpiraEm: real.qrExpiraEm ?? null,
      origem: "monitor",
    });
    await avisarDono(linha, "qr");
    return "qr" as const;
  }

  // Queda (silenciosa ou não): grava o estado real e avisa uma vez.
  if (linha.status !== "desconectado") {
    logConexao("queda_detectada", { ...base, statusBanco: linha.status, statusReal: real.status });
    await atualizarEstadoDaConexao(linha.sessao_id, {
      status: "desconectado",
      erro: real.erro ?? "Conexão caiu (detectada pelo monitor).",
      origem: "monitor",
    });
    await avisarDono(linha, "queda");
  }
  if (!acao.reconectar) {
    logConexao("reconexao_adiada", { ...base, tentativas: linha.reconexao_tentativas });
    return "queda" as const;
  }

  const tentativas = linha.reconexao_tentativas + 1;
  await db
    .from("conexoes_whatsapp")
    .update({ reconexao_tentativas: tentativas, reconexao_tentada_em: agora.toISOString() })
    .eq("id", linha.id);
  try {
    const depois = await comPrazo(gw.reiniciarSessao(linha.sessao_id));
    const st = normalizarStatus(depois.status);
    logConexao("reconexao_tentada", { ...base, tentativas, resultado: st });
    if (st === "conectado") {
      await atualizarEstadoDaConexao(linha.sessao_id, { status: "conectado", origem: "reconexao" });
      return "reconectado" as const;
    }
    if (st === "qr_pronto") {
      await atualizarEstadoDaConexao(linha.sessao_id, {
        status: "qr_pronto",
        qrCode: depois.qrCode ?? null,
        qrExpiraEm: depois.qrExpiraEm ?? null,
        origem: "reconexao",
      });
      await avisarDono(linha, "qr");
      return "qr" as const;
    }
  } catch (e) {
    logConexao("reconexao_falhou", { ...base, tentativas, erro: e instanceof Error ? e.message : "" });
  }
  return "queda" as const;
}

export async function monitorarConexoesWhatsapp(agora = new Date()) {
  const resumo = { verificadas: 0, quedas: 0, reconectadas: 0, qr: 0, semResposta: 0 };
  const { gatewayConfigurado } = await import("./gateway.server");
  if (!gatewayConfigurado("evolution")) return resumo;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // Só conexões próprias da Evolution que deveriam estar ativas, ou em recuperação.
  // "desconectado" sem tentativas = desligado pelo dono: não mexe.
  const { data } = await db
    .from("conexoes_whatsapp")
    .select(
      "id, tenant_id, sessao_id, provedor, status, conectado_em, reconexao_tentativas, reconexao_tentada_em",
    )
    .eq("provedor", "evolution")
    .eq("compartilhada", false)
    .or("status.in.(conectado,conectando,erro),and(status.eq.desconectado,reconexao_tentativas.gt.0)")
    .order("verificado_em", { ascending: true, nullsFirst: true })
    .limit(LIMITE_POR_EXECUCAO);
  const linhas = (data ?? []) as Linha[];
  for (let i = 0; i < linhas.length; i += TAMANHO_DO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_DO_LOTE);
    const r = await Promise.allSettled(lote.map((l) => verificarUma(l, agora)));
    for (const x of r) {
      resumo.verificadas++;
      if (x.status !== "fulfilled") continue;
      if (x.value === "queda") resumo.quedas++;
      if (x.value === "reconectado") resumo.reconectadas++;
      if (x.value === "qr") resumo.qr++;
      if (x.value === "sem_resposta") resumo.semResposta++;
    }
  }
  logConexao("monitor_resumo", resumo);
  return resumo;
}
