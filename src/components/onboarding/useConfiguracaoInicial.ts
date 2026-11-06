/**
 * Estado e ações do Onboarding (`/barbeiro/configurar`): rascunhos que nascem do que já está salvo, avanço que só
 * acontece depois de gravar, logo com ajuste antes do envio, equipe, serviços, link. A tela só desenha os passos.
 */
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import type { Funcao } from "@/components/onboarding/passos/PassoDaEquipe";
import type { ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { supabase } from "@/integrations/supabase/client";
import { aviso } from "@/lib/avisos";
import { convidarMembro } from "@/lib/equipe.functions";
import { avancarSeSalvar } from "@/lib/erro-amigavel";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import { comprimirImagem } from "@/lib/imagem";
import {
  adicionarProfissional,
  concluirConfiguracao,
  ETAPAS_DO_ONBOARDING,
  getImplantacao,
  marcarItemDoChecklist,
  REGRAS_RECOMENDADAS,
  salvarDadosDaBarbearia,
  salvarEtapaDaImplantacao,
  salvarHorarios,
  salvarModoAgendamento,
  salvarRegrasDeAgendamento,
  salvarServicos,
  type RegrasDeAgendamento,
} from "@/lib/onboarding.functions";
import { getSessao } from "@/lib/sessao.functions";
import { useEquipeDoOnboarding, useLinkDoOnboarding, useLogoDoOnboarding } from "./useLogoELink";
import { SEGMENTOS_CONFIG, termos } from "@/lib/segmentos";

export type Etapa = (typeof ETAPAS_DO_ONBOARDING)[number];

export const ROTULOS: Record<Etapa, string> = {
  dados: "Negócio",
  equipe: "Equipe",
  servicos: "Serviços",
  horarios: "Horários",
  regras: "Regras",
  canais: "Agendamento",
  link: "Link",
  pronto: "Pronto",
};

/** Etapas antigas salvas antes da revisão caem no passo equivalente. */
function etapaSalva(valor: string): Etapa {
  if ((ETAPAS_DO_ONBOARDING as readonly string[]).includes(valor)) return valor as Etapa;
  if (valor === "agenda") return "horarios";
  if (valor === "recursos") return "regras";
  return "dados";
}

/** Título de cada passo no topo (antes era "… em 5 minutos" em todos). */
export function tituloDoPasso(etapa: Etapa, possessivo: string) {
  const negocio = `${possessivo.charAt(0).toUpperCase()}${possessivo.slice(1)}`;
  const titulos: Record<Etapa, string> = {
    dados: negocio,
    equipe: "Sua equipe",
    servicos: "Serviços",
    horarios: "Horários",
    regras: "Regras de agendamento",
    canais: "Como seu cliente agenda?",
    link: "Seu link",
    pronto: "Tudo pronto",
  };
  return titulos[etapa];
}

export function useConfiguracaoInicial() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const salvarDados = useServerFn(salvarDadosDaBarbearia);
  const gravarHorarios = useServerFn(salvarHorarios);
  const gravarServicos = useServerFn(salvarServicos);
  const gravarRegras = useServerFn(salvarRegrasDeAgendamento);
  const gravarEtapa = useServerFn(salvarEtapaDaImplantacao);
  const criarProfissional = useServerFn(adicionarProfissional);
  const convidar = useServerFn(convidarMembro);
  const marcar = useServerFn(marcarItemDoChecklist);
  const concluir = useServerFn(concluirConfiguracao);
  const gravarModo = useServerFn(salvarModoAgendamento);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["implantacao"],
    queryFn: () => getImplantacao(),
    staleTime: 60_000,
  });
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });

  const [etapaEscolhida, setEtapaEscolhida] = useState<Etapa | null>(null);
  const [mostrandoBoasVindas, setMostrandoBoasVindas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const etapa: Etapa =
    etapaEscolhida ?? (data ? (data.concluidoEm ? "pronto" : etapaSalva(data.etapa)) : "dados");
  const indice = ETAPAS_DO_ONBOARDING.indexOf(etapa);
  const indicePersistido = data ? ETAPAS_DO_ONBOARDING.indexOf(etapaSalva(data.etapa)) : 0;
  const mostrarBoasVindas = Boolean(data && mostrandoBoasVindas && !data.concluidoEm);

  // Rascunhos: nascem com o que já está salvo.
  const [nome, setNome] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<HorarioSugerido[] | null>(null);
  const [servicos, setServicos] = useState<ServicoEditavel[] | null>(null);
  const [regras, setRegras] = useState<RegrasDeAgendamento | null>(null);
  const [modo, setModo] = useState<"tradicional" | "conversa" | null>(null);

  const valorNome = nome ?? data?.tenant.nome ?? "";
  const segmento = data?.tenant.segmento ?? "outro";
  const definicao = SEGMENTOS_CONFIG[segmento];
  const vocabulario = termos(segmento);
  const valorWhatsapp = whatsapp ?? data?.tenant.whatsapp ?? "";
  const valorEndereco = endereco ?? data?.tenant.endereco ?? "";
  const valorHorarios = horarios ?? data?.horarios ?? horariosPadrao();
  const valorRegras = regras ?? data?.regras ?? REGRAS_RECOMENDADAS;
  const valorModo = modo ?? data?.modoAgendamento ?? "tradicional";
  const ativos = useMemo(() => (data?.servicos ?? []).filter((s) => s.ativo), [data]);
  const valorServicos: ServicoEditavel[] =
    servicos ??
    (ativos.length
      ? ativos.map((s) => ({
          id: s.id,
          nome: s.nome,
          categoria: s.categoria,
          duracaoMin: s.duracaoMin,
          precoCentavos: s.precoCentavos,
          profissionalIds: s.profissionalIds,
          retornoDias: s.retornoDias,
          fotoUrl: s.fotoUrl,
        }))
      : definicao.servicosSugeridos.map((s) => ({ ...s })));
  const profissionais = (data?.profissionais ?? []).filter((p) => p.ativo);

  const origem = typeof window !== "undefined" ? window.location.origin : "https://cortai.dev";
  const link = data ? `${origem}/${data.tenant.slug}` : "";
  const linkCurto = link.replace(/^https?:\/\//, "");

  function recarregar() {
    void queryClient.invalidateQueries({ queryKey: ["implantacao"] });
    void queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] });
    void queryClient.invalidateQueries({ queryKey: ["sessao"] });
  }

  /** Grava primeiro e só então avança; se falhar, a pessoa continua na mesma etapa. */
  function irPara(destino: Etapa, gravar?: () => Promise<unknown>) {
    if (salvando) return;
    setSalvando(true);
    void avancarSeSalvar({
      ...(gravar ? { gravar } : {}),
      gravarEtapa: () => gravarEtapa({ data: { etapa: destino } }),
      avancar: () => {
        setEtapaEscolhida(destino);
        if (typeof window !== "undefined") window.scrollTo({ top: 0 });
        recarregar();
      },
      // No topo, para nunca cobrir o botão Continuar.
      aoErro: (m) => toast.error(m, { position: "top-center" }),
    }).finally(() => setSalvando(false));
  }
  const proxima = (gravar?: () => Promise<unknown>) =>
    irPara(
      ETAPAS_DO_ONBOARDING[Math.min(ETAPAS_DO_ONBOARDING.length - 1, indice + 1)] ?? "pronto",
      gravar,
    );
  const anterior = () =>
    setEtapaEscolhida(ETAPAS_DO_ONBOARDING[Math.max(0, indice - 1)] ?? "dados");

  function abrirPassoInicial(destino: "dados" | "equipe" | "servicos") {
    setEtapaEscolhida(destino);
    setMostrandoBoasVindas(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  const equipe = useEquipeDoOnboarding({
    criar: (nome) => criarProfissional({ data: { nome } }),
    convidar: (email, papel) =>
      convidar({ data: { email, papel, redirectTo: `${origem}/convite` } }),
    recarregar,
  });
  const logoDoNegocio = useLogoDoOnboarding(data?.tenant.id);
  const compartilhar = useLinkDoOnboarding({
    link,
    nome: data?.tenant.nome,
    marcar: () => marcar({ data: { chave: "compartilhar_link", feito: true } }),
    recarregar,
  });

  /** Entre tocar em Concluir (etapa do link) e a tela final, o Figaro mostra a espera em tela cheia. */
  const configurando = salvando && etapa === "link";

  /** Garante que quem configura aparece na agenda quando ninguém foi cadastrado. */
  async function garantirDonoNaAgenda() {
    if (profissionais.length > 0) return;
    const nomeDono = (sessao?.nome ?? sessao?.email?.split("@")[0] ?? "Eu").trim();
    await criarProfissional({ data: { nome: nomeDono.length >= 2 ? nomeDono : "Profissional" } });
  }

  const salvarServicosAgora = () => {
    const validos = valorServicos.filter((s) => s.nome.trim().length >= 2);
    if (!validos.length) return Promise.resolve();
    return gravarServicos({
      data: {
        servicos: validos.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          nome: s.nome.trim(),
          duracaoMin: s.duracaoMin,
          precoCentavos: s.precoCentavos,
          categoria: s.categoria?.trim() || "Serviço",
          ...(s.profissionalIds !== undefined ? { profissionalIds: s.profissionalIds } : {}),
          ...(s.retornoDias !== undefined ? { retornoDias: s.retornoDias } : {}),
          ...(s.fotoUrl !== undefined ? { fotoUrl: s.fotoUrl } : {}),
        })),
      },
    }).then(() => setServicos(null));
  };

  return {
    ...equipe,
    ...logoDoNegocio,
    ...compartilhar,
    navigate,
    salvarDados,
    gravarHorarios,
    gravarRegras,
    marcar,
    concluir,
    gravarModo,
    data,
    isLoading,
    refetch,
    setEtapaEscolhida,
    mostrandoBoasVindas,
    setMostrandoBoasVindas,
    salvando,
    etapa,
    indice,
    indicePersistido,
    mostrarBoasVindas,
    nome,
    setNome,
    whatsapp,
    setWhatsapp,
    endereco,
    setEndereco,
    horarios,
    setHorarios,
    servicos,
    setServicos,
    regras,
    setRegras,
    modo,
    setModo,
    valorNome,
    segmento,
    vocabulario,
    valorWhatsapp,
    valorEndereco,
    valorHorarios,
    valorRegras,
    valorModo,
    valorServicos,
    profissionais,
    link,
    linkCurto,
    proxima,
    anterior,
    abrirPassoInicial,
    configurando,
    garantirDonoNaAgenda,
    salvarServicosAgora,
  };
}
