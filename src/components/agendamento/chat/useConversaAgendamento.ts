import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { perguntarSecretariaPublica } from "@/lib/brain/secretaria-publica.functions";

import type { AgendaPublica } from "@/lib/agendamento-publico.functions";
import {
  entender,
  horarioNoPeriodo,
  servicosParecidos,
  type Periodo,
} from "@/lib/conversa/entender";
import type { PassoEditavel } from "@/lib/conversa/memoria-cliente";
import { TEXTOS_CONVERSA } from "@/lib/conversa/respostas";
import { hojeNoFuso } from "@/lib/horarios";
import { useMemoriaDaConversa } from "./useMemoriaDaConversa";
import { respostaNaoEntendi, respostaRapida } from "./respostasRapidas";
import type { Chip, Etapa, MensagemExtra, Selecao } from "./tipos";

type Pendente = { dia?: string; primeiro?: boolean; horario?: string; iso?: string };

/**
 * Orquestra a conversa sobre a seleção oficial. Não calcula disponibilidade:
 * só lê `porDia`/`agenda` de `useSelecaoAgendamento` e chama os mesmos setters.
 */
export function useConversaAgendamento({
  data,
  selecao,
  temFuturo,
  podeConfirmar,
  confirmar,
}: {
  data: AgendaPublica;
  selecao: Selecao;
  temFuturo: boolean;
  podeConfirmar: boolean;
  confirmar: () => void;
}) {
  const slug = data.tenant.slug;
  const s = selecao;
  const perguntarIa = useServerFn(perguntarSecretariaPublica);
  const [profEscolhido, setProfEscolhido] = useState(false);
  const [diaEscolhido, setDiaEscolhido] = useState(false);
  const [extras, setExtras] = useState<MensagemExtra[]>([]);
  const [falhas, setFalhas] = useState(0);
  const [confirmarDia, setConfirmarDia] = useState<{ dia: string; rotulo: string } | null>(null);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [mostrar, setMostrar] = useState(3);
  const [pendente, setPendente] = useState<Pendente>({});
  const contador = useRef(0);

  const etapa: Etapa = !s.servico
    ? "servico"
    : !profEscolhido
      ? "profissional"
      : !diaEscolhido || !s.dia
        ? "dia"
        : !s.escolhido
          ? "horario"
          : "dados";

  const { memoria, rascunho, abertura, setAbertura } = useMemoriaDaConversa({
    slug,
    servicoIds: data.servicos.map((x) => x.id),
    temFuturo,
    rascunhoAtual: s.servicoId
      ? {
          servicoId: s.servicoId,
          ...(profEscolhido ? { profissionalId: s.profissionalId } : {}),
          ...(diaEscolhido && s.dia ? { dia: s.dia } : {}),
          ...(s.inicio ? { inicio: s.inicio } : {}),
        }
      : null,
  });

  // Mensagens laterais pertencem ao passo atual.
  useEffect(() => {
    setExtras([]);
    setMostrar(3);
  }, [etapa]);

  // Pedidos que dependem de horários recalculados pelo motor oficial.
  useEffect(() => {
    if (!s.servico || !profEscolhido) return;
    if (pendente.dia) {
      // Dia dito antes do serviço/profissional: aplica quando a agenda existir.
      const { dia, ...resto } = pendente;
      setPendente(resto);
      if (s.dias.includes(dia)) escolherDia(dia);
      else falar(TEXTOS_CONVERSA.horarioIndisponivel);
      return;
    }
    if (pendente.primeiro) {
      const livre = s.dias.find((d) => (s.porDia.get(d)?.opcoes.length ?? 0) > 0);
      setPendente((p) => ({ ...p, primeiro: false }));
      if (livre) {
        s.setDia(livre);
        setDiaEscolhido(true);
      }
      return;
    }
    if (!diaEscolhido || !s.dia || (!pendente.horario && !pendente.iso)) return;
    const opcoes = s.agenda?.opcoes ?? [];
    const achado = opcoes.find((o) => o.iso === pendente.iso || o.label === pendente.horario);
    setPendente({});
    if (achado) s.setInicio(achado.iso);
    else falar(TEXTOS_CONVERSA.horarioIndisponivel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, s.servico, s.dia, s.agenda, profEscolhido, diaEscolhido]);

  function falar(texto: string, chips?: Chip[], autor: MensagemExtra["autor"] = "recepcao") {
    contador.current += 1;
    const id = contador.current;
    setExtras((atual) => [...atual, { id, autor, texto, ...(chips ? { chips } : {}) }]);
  }

  function escolherProfissional(id: string) {
    s.setProfissionalId(id);
    setProfEscolhido(true);
    s.setDia(null);
    setDiaEscolhido(false);
  }

  function escolherDia(dia: string) {
    s.setDia(dia);
    setDiaEscolhido(true);
  }

  function corrigir(passo: PassoEditavel) {
    setAbertura(null);
    if (passo === "servico") {
      s.setServicoId(null);
      setProfEscolhido(false);
      setDiaEscolhido(false);
    } else if (passo === "profissional") {
      setProfEscolhido(false);
      s.setDia(null);
      setDiaEscolhido(false);
    } else if (passo === "dia") {
      setDiaEscolhido(false);
      s.setInicio(null);
    } else s.setInicio(null);
  }

  function recomecar() {
    corrigir("servico");
    setExtras([]);
    setFalhas(0);
    setPeriodo(null);
    setConfirmarDia(null);
    setPendente({});
  }

  function oDeSempre() {
    if (!memoria?.ultimoServicoId) return;
    s.setServicoId(memoria.ultimoServicoId);
    const prof = memoria.ultimoProfissionalId;
    const apto = prof && data.profissionais.some((p) => p.id === prof) ? prof : "qualquer";
    escolherProfissional(apto);
    if (memoria.periodoPreferido) setPeriodo(memoria.periodoPreferido);
    setAbertura(null);
  }

  function continuarRascunho() {
    if (!rascunho?.servicoId) return;
    s.setServicoId(rascunho.servicoId);
    if (rascunho.profissionalId) escolherProfissional(rascunho.profissionalId);
    if (rascunho.profissionalId && rascunho.dia) escolherDia(rascunho.dia);
    if (rascunho.inicio) setPendente({ iso: rascunho.inicio });
    setAbertura(null);
  }

  const agendar: Chip = { rotulo: "Agendar", acao: () => setAbertura(null) };
  const ofertas = useMemo(() => {
    const todas = s.agenda?.opcoes ?? [];
    const filtradas = periodo ? todas.filter((o) => horarioNoPeriodo(o.label, periodo)) : todas;
    return { lista: filtradas.length ? filtradas : todas, foraDoPeriodo: !filtradas.length };
  }, [s.agenda, periodo]);

  function enviarTexto(frase: string) {
    const texto = frase.trim();
    if (!texto) return;
    falar(texto, undefined, "cliente");
    const e = entender(texto, {
      hoje: hojeNoFuso(data.tenant.fuso),
      servicos: data.servicos,
      profissionais: data.profissionais,
      horariosOferecidos: etapa === "horario" ? ofertas.lista.map((o) => o.label) : [],
    });
    if (e.ruido) return falar("😄");
    if (e.intencao === "menu") return recomecar();
    if (e.intencao === "voltar") {
      const anterior = { dados: "horario", horario: "dia", dia: "profissional" } as const;
      return corrigir(etapa in anterior ? anterior[etapa as keyof typeof anterior] : "servico");
    }
    if (e.intencao === "sim" && confirmarDia) {
      if (s.servico && profEscolhido) escolherDia(confirmarDia.dia);
      else setPendente((p) => ({ ...p, dia: confirmarDia.dia }));
      return setConfirmarDia(null);
    }
    if (e.intencao === "nao" && confirmarDia) {
      setConfirmarDia(null);
      return falar(TEXTOS_CONVERSA.dia);
    }
    if (e.intencao === "sim" && etapa === "dados") {
      if (podeConfirmar) return confirmar();
      return falar(TEXTOS_CONVERSA.dados);
    }
    if (e.intencao === "sim" && abertura === "sempre") return oDeSempre();
    const rapida = e.intencao ? respostaRapida(e.intencao, data, agendar) : null;
    if (rapida) {
      setFalhas(0);
      return falar(rapida.texto, rapida.chips);
    }

    let entendeu = Boolean(e.intencao === "agendar");
    if (e.servicoId) {
      s.setServicoId(e.servicoId);
      entendeu = true;
    }
    if (e.profissionalId) {
      escolherProfissional(e.profissionalId);
      entendeu = true;
    } else if (
      etapa === "profissional" &&
      /qualquer|sem preferencia|tanto faz/.test(e.textoNormalizado)
    ) {
      escolherProfissional("qualquer");
      entendeu = true;
    }
    if (e.dia) {
      if (s.servico && profEscolhido && !e.servicoId && !e.profissionalId && s.dias.includes(e.dia))
        escolherDia(e.dia);
      else setPendente((p) => ({ ...p, dia: e.dia! }));
      entendeu = true;
    } else if (e.confirmarDia) {
      setConfirmarDia(e.confirmarDia);
      entendeu = true;
    }
    if (e.periodo) {
      setPeriodo(e.periodo);
      entendeu = true;
    }
    if (e.primeiroDisponivel) {
      setPendente((p) => ({ ...p, primeiro: true }));
      entendeu = true;
    }
    if (e.horario) {
      setPendente((p) => ({ ...p, horario: e.horario! }));
      entendeu = true;
    }
    if (!e.servicoId && !s.servico) {
      // "corte" pode ser mais de um serviço: pergunta em vez de supor.
      const candidatos = servicosParecidos(e.textoNormalizado, data.servicos);
      if (candidatos.length === 1) {
        s.setServicoId(candidatos[0]!.id);
        entendeu = true;
      } else if (candidatos.length > 1) {
        setAbertura(null);
        setFalhas(0);
        return falar(
          "Temos algumas opções. Qual delas?",
          candidatos.slice(0, 4).map((x) => ({ rotulo: x.nome, acao: () => s.setServicoId(x.id) })),
        );
      }
    }
    if (entendeu) {
      setAbertura(null);
      return setFalhas(0);
    }
    // Dúvida fora do roteiro: a Flow IA do site responde com os dados reais
    // (só leitura). Sem IA disponível, segue a resposta fixa de sempre.
    const historico = extras
      .slice(-8)
      .map((m) => ({
        autor: m.autor === "cliente" ? ("usuario" as const) : ("assistente" as const),
        texto: m.texto.slice(0, 600),
      }));
    void perguntarIa({ data: { slug, mensagem: texto, historico } })
      .then((r) => r.texto)
      .catch(() => null)
      .then((textoIa) => {
        if (textoIa) {
          setFalhas(0);
          return falar(textoIa, [agendar]);
        }
        const resposta = respostaNaoEntendi(data, falhas, agendar, () => enviarTexto("serviços"));
        falar(resposta.texto, resposta.chips);
        setFalhas((f) => f + 1);
      });
  }

  return {
    etapa,
    extras,
    abertura,
    setAbertura,
    memoria,
    rascunho,
    confirmarDia,
    setConfirmarDia,
    ofertas,
    mostrar,
    verMais: () => setMostrar((m) => m + 3),
    periodo,
    setPeriodo,
    profEscolhido,
    escolherProfissional,
    escolherDia,
    corrigir,
    recomecar,
    oDeSempre,
    continuarRascunho,
    pedirPrimeiro: () => setPendente({ primeiro: true }),
    enviarTexto,
  };
}
