/**
 * Política de execução direta do cérebro Flow IA (pura, sem rede — testável).
 *
 * Regra de ouro: por padrão TODA escrita vira "pendente" e só executa após o "sim" da pessoa.
 * A exceção é restrita e verificável:
 *
 *  1. a ação está marcada como `dispensavel` em `POLITICA_DE_CONFIRMACAO` (hoje só agendar);
 *  2. o canal é o painel e quem fala é a equipe autenticada (nunca cliente, site ou WhatsApp);
 *  3. o interruptor `CORTAI_EXECUCAO_DIRETA` não está desligado;
 *  4. cada referência da ação (cliente, serviço, horário) foi RESOLVIDA por uma consulta oficial
 *     neste mesmo turno — o modelo não pode "chutar" um id nem um horário;
 *  5. nenhuma ambiguidade: busca de cliente com mais de um resultado nunca vale como resolvida.
 *
 * Faltou qualquer prova → cai no fluxo de confirmação de sempre (nada executa sem o "sim").
 * Disponibilidade, permissões, isolamento e conflitos continuam validados pelo backend na hora
 * de gravar; esta política só decide se a confirmação é dispensável, nunca substitui as regras.
 */

export type Confirmacao = "sempre" | "dispensavel";

/** Ações de escrita que PODEM dispensar a confirmação. Tudo que não está aqui exige "sim". */
export const POLITICA_DE_CONFIRMACAO: Readonly<Record<string, Confirmacao>> = {
  criar_agendamento: "dispensavel",
};

/** Interruptor de segurança: `CORTAI_EXECUCAO_DIRETA=false` (ou 0/off) exige confirmação sempre. */
export function execucaoDiretaLigada(env: Record<string, string | undefined> = process.env) {
  const v = (env["CORTAI_EXECUCAO_DIRETA"] ?? "").trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "off" || v === "nao");
}

/**
 * Comando por VOZ passa por conferência (a transcrição pode errar um nome ou uma hora):
 * a Flow IA mostra o que entendeu e a pessoa confirma com um toque. Quem quiser execução
 * direta também por voz liga `CORTAI_EXECUCAO_DIRETA_VOZ=true`.
 */
export function execucaoDiretaPorVozLigada(env: Record<string, string | undefined> = process.env) {
  const v = (env["CORTAI_EXECUCAO_DIRETA_VOZ"] ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "sim";
}

export type HorarioLivre = { servicoId: string | null; profissionalId: string; inicioMs: number };

/** O que as consultas oficiais deste turno provaram. Vive só durante um turno. */
export type Evidencias = {
  /** Clientes que apareceram como resultado ÚNICO de uma busca. */
  clientes: Set<string>;
  /** Buscas de cliente que devolveram mais de um candidato (ambiguidade que o modelo não resolveu). */
  buscasAmbiguas: number;
  servicos: Set<string>;
  profissionais: Set<string>;
  horarios: HorarioLivre[];
};

export function novasEvidencias(): Evidencias {
  return {
    clientes: new Set(),
    buscasAmbiguas: 0,
    servicos: new Set(),
    profissionais: new Set(),
    horarios: [],
  };
}

const texto = (v: unknown) => (typeof v === "string" && v ? v : null);
const lista = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];

/**
 * Registra o que uma LEITURA bem-sucedida provou. `dados` são os argumentos da chamada e
 * `resultado` o que o backend devolveu.
 */
export function registrarEvidencia(
  ev: Evidencias,
  acao: string,
  dados: Record<string, unknown>,
  resultado: unknown,
): void {
  const r = (resultado ?? null) as Record<string, unknown> | null;
  if (acao === "buscar_cliente_por_nome") {
    const clientes = lista(r?.["clientes"]);
    if (clientes.length === 1) {
      const id = texto(clientes[0]?.["id"]);
      if (id) ev.clientes.add(id);
    } else if (clientes.length > 1) ev.buscasAmbiguas += 1;
  } else if (acao === "buscar_cliente") {
    const id = texto(r?.["id"]);
    if (id) ev.clientes.add(id);
  } else if (acao === "listar_servicos") {
    for (const s of lista(resultado)) {
      const id = texto(s["id"]);
      if (id) ev.servicos.add(id);
    }
  } else if (acao === "consultar_servico") {
    const id = texto(r?.["id"]);
    if (id) ev.servicos.add(id);
  } else if (acao === "listar_profissionais") {
    for (const p of lista(resultado)) {
      const id = texto(p["id"]);
      if (id) ev.profissionais.add(id);
    }
  } else if (acao === "consultar_disponibilidade") {
    const servicoId = texto(dados["servicoId"]);
    for (const livre of lista(r?.["livres"])) {
      const profissionalId = texto(livre["profissionalId"]);
      const inicio = texto(livre["inicio"]);
      const ms = inicio ? Date.parse(inicio) : Number.NaN;
      if (profissionalId && Number.isFinite(ms))
        ev.horarios.push({ servicoId, profissionalId, inicioMs: ms });
    }
  }
}

export type ContextoDaDecisao = {
  canal: string;
  papel?: string | null;
  profissionalId?: string | null;
};

export type DecisaoDeExecucao = { direta: true } | { direta: false; motivo: string };

/**
 * Decide se a escrita `acao` pode rodar agora, sem o "sim" da pessoa.
 * `ligada` vem de `execucaoDiretaLigada()`; em teste, passe explicitamente.
 */
export function decidirExecucao(entrada: {
  acao: string;
  dados: Record<string, unknown>;
  ctx: ContextoDaDecisao;
  evidencias: Evidencias;
  ligada: boolean;
  /** Como o comando chegou. Padrão: texto. */
  origem?: "texto" | "voz";
  /** Voz pode executar direto? Padrão: não (pede conferência). */
  ligadaPorVoz?: boolean;
  /** Veredito da conferência visível; só "pronto" libera a execução direta. Padrão: pronto. */
  veredito?: "pronto" | "atencao" | "bloqueado";
}): DecisaoDeExecucao {
  const { acao, dados, ctx, evidencias: ev } = entrada;
  const nao = (motivo: string): DecisaoDeExecucao => ({ direta: false, motivo });

  if (POLITICA_DE_CONFIRMACAO[acao] !== "dispensavel") return nao("ação exige confirmação");
  if (entrada.veredito && entrada.veredito !== "pronto")
    return nao("a conferência tem pontos a verificar");
  if (!entrada.ligada) return nao("execução direta desligada");
  if (entrada.origem === "voz" && !entrada.ligadaPorVoz)
    return nao("comando por voz pede conferência antes de gravar");
  if (ctx.canal !== "painel") return nao("só no painel, com a equipe autenticada");
  if (ctx.papel !== "dono" && ctx.papel !== "profissional") return nao("papel sem execução direta");

  if (acao === "criar_agendamento") {
    const clienteId = texto(dados["clienteId"]);
    const servicoId = texto(dados["servicoId"]);
    const inicio = texto(dados["inicio"]);
    // Profissional agenda sempre para si (o backend força); o dono escolhe.
    const profissionalId =
      ctx.papel === "profissional" && ctx.profissionalId
        ? ctx.profissionalId
        : texto(dados["profissionalId"]);
    if (!clienteId || !ev.clientes.has(clienteId))
      return nao("cliente não foi resolvido sem ambiguidade");
    if (!servicoId || !ev.servicos.has(servicoId))
      return nao("serviço não foi confirmado no catálogo");
    if (!profissionalId) return nao("profissional não informado");
    const ms = inicio ? Date.parse(inicio) : Number.NaN;
    if (!Number.isFinite(ms)) return nao("horário inválido");
    const livre = ev.horarios.some(
      (h) =>
        h.inicioMs === ms &&
        h.profissionalId === profissionalId &&
        // A duração depende do serviço: disponibilidade sem serviço não prova nada.
        h.servicoId === servicoId,
    );
    if (!livre) return nao("horário não veio da consulta oficial de disponibilidade");
    return { direta: true };
  }
  return nao("sem regra de execução direta");
}
