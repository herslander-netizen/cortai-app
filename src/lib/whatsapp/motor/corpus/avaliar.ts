/**
 * Avaliação do entendimento contra o corpus pt-BR. Função pura: mede, não muda comportamento.
 * Usada pelo teste de regressão e pelo relatório do estudo (scripts/avaliar-entendimento.ts).
 */
import { avisaNumeroErrado, pedeParaSair, pedeParaVoltar } from "../../porteiro";
import { classificar, type IntencaoDoMotor } from "../intencoes";
import { normalizar } from "../vocabulario";
import {
  AGORA_DO_CORPUS,
  CORPUS,
  ENTIDADES,
  type Estilo,
  type FraseDoCorpus,
  type IntencaoFlow,
} from "./frases-ptbr";

const FUSO = "America/Sao_Paulo";

/** Intenção da taxonomia → o que o motor deve devolver. `null` = o motor ainda não tem essa intenção. */
const ESPERADO: Record<IntencaoFlow, readonly IntencaoDoMotor[] | null> = {
  consultar_servicos: ["SERVICOS"],
  consultar_precos: ["PRECO"],
  consultar_profissionais: ["PROFISSIONAIS"],
  localizacao: ["LOCALIZACAO"],
  funcionamento: ["FUNCIONAMENTO"],
  nome_do_negocio: ["BARBEARIA"],
  pagamento: null,
  agendar: ["AGENDAR", "DISPONIBILIDADE"],
  consultar_disponibilidade: ["DISPONIBILIDADE", "AGENDAR"],
  encaixe: ["DISPONIBILIDADE", "AGENDAR"],
  lista_de_espera: ["FILA"],
  remarcar: ["REMARCAR"],
  cancelar: ["CANCELAR"],
  atraso: ["ATRASO"],
  meus_agendamentos: ["MEUS_AGENDAMENTOS"],
  repetir_ultimo: ["HISTORICO"],
  fidelidade: ["FIDELIDADE"],
  saldo: ["SALDO"],
  agradecer: null,
  elogiar: null,
  reclamar: ["HUMANO"],
  avaliar: null,
  falar_com_atendente: ["HUMANO"],
  ajuda: ["AJUDA"],
  saudacao: ["SAUDACAO"],
  despedida: null,
  confirmar: ["CONFIRMAR"],
  negar: ["NEGAR"],
  escolher_opcao: ["SELECAO"],
  trocar_estabelecimento: ["TROCAR_BARBEARIA"],
  parar_avisos: null,
  voltar_avisos: null,
  numero_errado: null,
};

/** Respostas do motor que mudam o rumo da conversa (abrem agendamento, cancelam, confirmam…). */
const OPERACIONAIS = new Set<IntencaoDoMotor>([
  "AGENDAR",
  "DISPONIBILIDADE",
  "CANCELAR",
  "REMARCAR",
  "CONFIRMAR",
  "NEGAR",
  "SELECAO",
]);

const COMANDOS_DE_AVISO: Partial<Record<IntencaoFlow, (t: string) => boolean>> = {
  parar_avisos: pedeParaSair,
  voltar_avisos: pedeParaVoltar,
  numero_errado: avisaNumeroErrado,
};

export type Veredito = "certo" | "errado" | "sem_suporte_ok" | "sem_suporte_disparo";

export type ResultadoDaFrase = {
  texto: string;
  intencao: IntencaoFlow;
  estilo: Estilo;
  previsto: string;
  veredito: Veredito;
  /** Errou para uma intenção que muda o rumo da conversa. */
  disparoIndevido: boolean;
};

export function avaliarFrase(f: FraseDoCorpus, texto = f.texto): ResultadoDaFrase {
  const comando = COMANDOS_DE_AVISO[f.intencao];
  const c = classificar(texto, {
    fuso: FUSO,
    agora: AGORA_DO_CORPUS,
    totalDeOpcoes: f.opcoes ?? 0,
  });
  const previsto = c.intencao;
  const base = { texto, intencao: f.intencao, estilo: f.estilo, previsto };
  if (comando) {
    const ok = comando(texto);
    return {
      ...base,
      previsto: ok ? `porteiro:${f.intencao}` : previsto,
      veredito: ok ? "certo" : "errado",
      disparoIndevido: !ok && OPERACIONAIS.has(previsto),
    };
  }
  const esperado = ESPERADO[f.intencao];
  if (!esperado) {
    const disparo = OPERACIONAIS.has(previsto) || previsto === "HUMANO";
    return {
      ...base,
      veredito: disparo ? "sem_suporte_disparo" : "sem_suporte_ok",
      disparoIndevido: disparo,
    };
  }
  const aceitos = new Set<string>([...esperado, ...(f.aceita ?? [])]);
  const certo = aceitos.has(previsto);
  return {
    ...base,
    veredito: certo ? "certo" : "errado",
    disparoIndevido: !certo && OPERACIONAIS.has(previsto),
  };
}

/* ----------------------------------------------------------------- Variações */

const ABREVIACOES: readonly (readonly [RegExp, string])[] = [
  [/\bvocês\b/gi, "vcs"],
  [/\bvocê\b/gi, "vc"],
  [/\bque\b/gi, "q"],
  [/\bpara\b/gi, "pra"],
  [/\bhoje\b/gi, "hj"],
  [/\bquero\b/gi, "qro"],
  [/\bpor favor\b/gi, "pfv"],
  [/\bbeleza\b/gi, "blz"],
  [/\btambém\b/gi, "tb"],
  [/\bestá\b/gi, "tá"],
];

/** Variações que não mudam a intenção: o motor deveria acertar todas como acerta a original. */
export function variacoes(f: FraseDoCorpus): string[] {
  const t = f.texto;
  const lista = new Set<string>();
  const curta = f.intencao === "escolher_opcao" || COMANDOS_DE_AVISO[f.intencao] !== undefined;
  if (!curta && f.intencao !== "saudacao" && f.intencao !== "despedida") lista.add(`oi, ${t}`);
  if (!curta) lista.add(`${t.replace(/[.!?]+$/, "")} por favor`);
  lista.add(t.toUpperCase());
  lista.add(normalizar(t));
  const abreviada = ABREVIACOES.reduce((s, [de, para]) => s.replace(de, para), t);
  if (abreviada !== t) lista.add(abreviada);
  if (!curta) lista.add(`${t} 🙂`);
  lista.delete(t);
  return [...lista];
}

/* ------------------------------------------------------------------ Entidades */

export type ResultadoDaEntidade = { texto: string; ok: boolean; detalhe: string };

export function avaliarEntidades(): ResultadoDaEntidade[] {
  return ENTIDADES.map((e) => {
    const c = classificar(e.texto, {
      fuso: FUSO,
      agora: AGORA_DO_CORPUS,
      ...(e.segmento ? { segmento: e.segmento } : {}),
    });
    const erros: string[] = [];
    if (e.dia !== undefined && c.entidades.dia !== e.dia)
      erros.push(`dia ${c.entidades.dia ?? "—"} (esperado ${e.dia ?? "—"})`);
    if (e.periodo !== undefined) {
      const p = c.entidades.periodo;
      const ok = e.periodo
        ? p !== null && p.deMinutos === e.periodo[0] && p.ateMinutos === e.periodo[1]
        : p === null;
      if (!ok)
        erros.push(
          `período ${p ? `${p.deMinutos}–${p.ateMinutos}` : "—"} (esperado ${e.periodo ? e.periodo.join("–") : "—"})`,
        );
    }
    if (e.servico !== undefined && c.entidades.servico !== e.servico)
      erros.push(`serviço ${c.entidades.servico ?? "—"} (esperado ${e.servico ?? "—"})`);
    return { texto: e.texto, ok: erros.length === 0, detalhe: erros.join("; ") };
  });
}

/* ------------------------------------------------------------------- Resumo */

export type Placar = { total: number; certos: number; taxa: number };

function placar(lista: readonly { veredito: Veredito }[]): Placar {
  const total = lista.length;
  const certos = lista.filter(
    (r) => r.veredito === "certo" || r.veredito === "sem_suporte_ok",
  ).length;
  return { total, certos, taxa: total ? certos / total : 0 };
}

export type Avaliacao = {
  frases: ResultadoDaFrase[];
  geral: Placar;
  suportadas: Placar;
  semSuporte: { total: number; disparos: number };
  disparosIndevidos: ResultadoDaFrase[];
  porIntencao: Record<string, Placar & { erros: ResultadoDaFrase[] }>;
  porEstilo: Record<string, Placar>;
  variacoes: Placar & { quebras: { original: string; variacao: string; previsto: string }[] };
  entidades: Placar & { erros: ResultadoDaEntidade[] };
};

export function avaliarCorpus(): Avaliacao {
  const frases = CORPUS.map((f) => avaliarFrase(f));
  const suportadas = frases.filter((r) => !r.veredito.startsWith("sem_suporte"));
  const semSuporte = frases.filter((r) => r.veredito.startsWith("sem_suporte"));

  const porIntencao: Avaliacao["porIntencao"] = {};
  for (const r of frases) {
    const atual = porIntencao[r.intencao] ?? { total: 0, certos: 0, taxa: 0, erros: [] };
    atual.total += 1;
    if (r.veredito === "certo" || r.veredito === "sem_suporte_ok") atual.certos += 1;
    else atual.erros.push(r);
    atual.taxa = atual.certos / atual.total;
    porIntencao[r.intencao] = atual;
  }
  const porEstilo: Avaliacao["porEstilo"] = {};
  for (const estilo of new Set(frases.map((r) => r.estilo)))
    porEstilo[estilo] = placar(frases.filter((r) => r.estilo === estilo));

  // Variações: só das frases que o motor já acerta na forma original (mede robustez, não o que já falta).
  const quebras: Avaliacao["variacoes"]["quebras"] = [];
  let totalVar = 0;
  CORPUS.forEach((f, i) => {
    if (frases[i]!.veredito !== "certo") return;
    for (const v of variacoes(f)) {
      totalVar += 1;
      const r = avaliarFrase(f, v);
      if (r.veredito !== "certo")
        quebras.push({ original: f.texto, variacao: v, previsto: r.previsto });
    }
  });

  const entidades = avaliarEntidades();
  const entCertas = entidades.filter((e) => e.ok).length;

  return {
    frases,
    geral: placar(frases),
    suportadas: placar(suportadas),
    semSuporte: {
      total: semSuporte.length,
      disparos: semSuporte.filter((r) => r.veredito === "sem_suporte_disparo").length,
    },
    disparosIndevidos: frases.filter((r) => r.disparoIndevido),
    porIntencao,
    porEstilo,
    variacoes: {
      total: totalVar,
      certos: totalVar - quebras.length,
      taxa: totalVar ? (totalVar - quebras.length) / totalVar : 0,
      quebras,
    },
    entidades: {
      total: entidades.length,
      certos: entCertas,
      taxa: entidades.length ? entCertas / entidades.length : 0,
      erros: entidades.filter((e) => !e.ok),
    },
  };
}
