/**
 * Agendamento público do cliente — sem conta, sem senha, sem login.
 * Abriu → escolheu → informou nome e WhatsApp → confirmou.
 */
import { CampoDeFormulario } from "@/components/ui/formulario/CampoDeFormulario";
import { createFileRoute } from "@tanstack/react-router";
import { fluxoDoAgendamento } from "@/lib/experiencia-link";
import { montarSchemaNegocio } from "@/lib/schema-negocio";
import { termos } from "@/lib/segmentos";
import { detectarExperiencia, origemDaVisita, registrarEtapa, type EtapaFunil } from "@/lib/funil";
import { FontesDaMarca } from "@/components/marca/FontesDaMarca";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clock3, MessageCircle, Scissors, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AgendamentoChat } from "@/components/agendamento/AgendamentoChat";
import { ConfirmacaoAgendamento } from "@/components/agendamento/ConfirmacaoAgendamento";
import { TicketDaConfirmacao } from "@/components/comanda/TicketDaConfirmacao";
import { ConviteDeConta } from "@/components/agendamento/ConviteDeConta";
import { StatusFuncionamento } from "@/components/agendamento/StatusFuncionamento";
import { PreferenciasAposAgendamento } from "@/components/agendamento/PreferenciasAposAgendamento";
import { PreferenciasEmConversa } from "@/components/agendamento/chat/PreferenciasEmConversa";
import {
  armazenamentoLocal,
  limparRascunho,
  registrarAgendamentoNaMemoria,
} from "@/lib/conversa/memoria-cliente";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { brl } from "@/lib/format";
import { hojeNoFuso, normalizarFuso, semNenhumDiaAberto } from "@/lib/horarios";
import { useSelecaoAgendamento } from "@/components/agendamento/useSelecaoAgendamento";
import { HorariosOcupados } from "@/components/agendamento/HorariosOcupados";
import { useHistoricoAgendamento } from "@/hooks/useHistoricoAgendamento";
import { headDaBarbearia, mascaraTelefone } from "@/lib/previa";
import { agendamentoStyle } from "@/lib/pagina-config";
import {
  agendarComoConvidado,
  cancelarComoConvidado,
  getAgendaPublica,
  getPreviaDaBarbearia,
  situacaoComoConvidado,
  type ConfirmacaoPublica,
} from "@/lib/agendamento-publico.functions";

export const Route = createFileRoute("/agendar/$slug")({
  ssr: "data-only",
  validateSearch: (s: Record<string, unknown>): { origem?: string; de?: string } => ({
    ...(typeof s["origem"] === "string" ? { origem: s["origem"].slice(0, 30) } : {}),
    ...(typeof s["de"] === "string" ? { de: s["de"].slice(0, 20) } : {}),
  }),
  loader: ({ params }) => getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null),
  head: ({ params, loaderData }) => {
    const base = headDaBarbearia(
      params.slug,
      loaderData,
      `/agendar/${params.slug}`,
      "Agende seu horário",
    );
    if (!loaderData) return base;
    return {
      ...base,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(montarSchemaNegocio(loaderData)) },
      ],
    };
  },
  component: AgendamentoPublico,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function rotuloDoDia(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const x = new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, d ?? 1));
  return { rotulo: DIAS[x.getUTCDay()] ?? "", numero: x.getUTCDate() };
}

function horaLocal(iso: string, fuso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
}

function dataLocal(iso: string, fuso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: fuso,
  });
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-mute">{titulo}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type Salvo = { confirmacao: ConfirmacaoPublica; telefone: string; nome: string };
type Situacao =
  "confirmado" | "cancelado" | "cancelado_pela_barbearia" | "remarcado" | "nao_compareceu";

function AgendamentoPublico() {
  const { slug } = Route.useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agenda-publica", slug],
    queryFn: () => getAgendaPublica({ data: { slug } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const fuso = normalizarFuso(data?.tenant.fuso);
  const selecao = useSelecaoAgendamento({
    servicos: data?.servicos ?? [],
    profissionais: data?.profissionais ?? [],
    horarios: data?.horarios ?? [],
    excecoesIntervalo: data?.excecoesIntervalo,
    ocupados: data?.ocupados ?? [],
    fuso,
    regras: data?.regras ?? { antecedenciaMin: 0, intervaloEntreMin: 0 },
    quantidadeDias: data?.regras.janelaDias ?? 30,
    passoMin: data?.regras.passoMin ?? 30,
  });
  const {
    servicoId,
    setServicoId,
    servico,
    profissionalId: profId,
    setProfissionalId: setProfId,
    aptos,
    dias,
    dia,
    setDia,
    porDia,
    agenda,
    ocupadosDoDia,
    inicio: horario,
    setInicio: setHorario,
    escolhido,
  } = selecao;
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tocouTelefone, setTocouTelefone] = useState(false);
  const [tocouNome, setTocouNome] = useState(false);
  const [saudacao, setSaudacao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ agendamentoId: string; hora: string } | null>(null);
  const [confirmado, setConfirmado] = useState<ConfirmacaoPublica | null>(null);
  const [situacao, setSituacao] = useState<Situacao>("confirmado");
  // Alterar = marcar o novo e só então liberar o antigo (nunca fica sem horário nem com dois).
  const [substituiId, setSubstituiId] = useState<string | null>(null);
  const fluxo = data ? fluxoDoAgendamento(data.pagina.experiencia, data.pagina.chat.modo) : null;
  const experienciaPublicada = data?.pagina.experiencia;
  const slugFunil = data?.tenant ? slug : null;
  const marcarEtapa = (e: EtapaFunil) => {
    if (!slugFunil) return;
    registrarEtapa({
      slug: slugFunil,
      etapa: e,
      experiencia: detectarExperiencia(window.location.search, experienciaPublicada),
      fluxo,
      origem: origemDaVisita(),
    });
  };
  useEffect(() => {
    if (slugFunil) marcarEtapa("agendamento_aberto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugFunil]);
  useEffect(() => {
    if (servicoId) marcarEtapa("servico_escolhido");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicoId, slugFunil]);
  useEffect(() => {
    if (horario) marcarEtapa("horario_escolhido");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horario, slugFunil]);
  // Modo conversa: horário salvo no aparelho aparece primeiro como bolha no chat.
  const [futuroNoChat, setFuturoNoChat] = useState(false);
  const chaveSalva = `cortai-agendamento-publico:${slug}`;
  const etapa = confirmado
    ? "confirmacao"
    : !servico
      ? "servico"
      : !dia
        ? "dia"
        : !escolhido
          ? "horario"
          : "dados";
  useHistoricoAgendamento(etapa, (destino) => {
    if (destino === "servico") setServicoId(null);
    else if (destino === "profissional") {
      setDia(null);
      setHorario(null);
    } else if (destino === "dia") {
      setHorario(null);
    } else if (destino === "horario") {
      setHorario(null);
    }
  });

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(`cortai-cliente-publico:${slug}`);
      const salvo = bruto ? (JSON.parse(bruto) as { telefone?: string; nome?: string }) : null;
      if (salvo?.telefone) setTelefone(mascaraTelefone(salvo.telefone));
      if (salvo?.nome) {
        setNome(salvo.nome);
        setSaudacao(salvo.nome.split(/\s+/)[0] ?? salvo.nome);
      }
    } catch {
      /* cache opcional: o fluxo segue sem identificação */
    }
  }, [slug]);

  // A confirmação sobrevive a recarregar a página — e é conferida no servidor.
  useEffect(() => {
    let salvo: Salvo | null = null;
    try {
      const bruto = localStorage.getItem(chaveSalva);
      salvo = bruto ? (JSON.parse(bruto) as Salvo) : null;
    } catch {
      salvo = null;
    }
    if (!salvo) return;
    if (new Date(salvo.confirmacao.fim).getTime() < Date.now()) {
      localStorage.removeItem(chaveSalva);
      return;
    }
    setConfirmado(salvo.confirmacao);
    setFuturoNoChat(true);
    setTelefone(mascaraTelefone(salvo.telefone));
    setNome(salvo.nome);
    const atual = salvo;
    void situacaoComoConvidado({
      data: { agendamentoId: atual.confirmacao.agendamentoId, telefone: atual.telefone },
    })
      .then((s) => {
        if (!s) return;
        if (s.status === "cancelado") setSituacao("cancelado_pela_barbearia");
        else if (s.status === "remarcado") setSituacao("remarcado");
        else if (s.status === "nao_compareceu") setSituacao("nao_compareceu");
        if (s.inicio !== atual.confirmacao.inicio) {
          const nova = { ...atual.confirmacao, inicio: s.inicio, fim: s.fim };
          setConfirmado(nova);
          localStorage.setItem(chaveSalva, JSON.stringify({ ...atual, confirmacao: nova }));
        }
      })
      .catch(() => undefined);
  }, [chaveSalva]);

  const digitosTel = telefone.replace(/\D/g, "");
  const erroTelefone = digitosTel.length < 10 ? "Informe seu WhatsApp com DDD" : null;
  const erroNome = nome.trim().length < 2 ? "Informe seu nome" : null;
  const falta = !servico
    ? "Escolha um serviço"
    : !escolhido
      ? "Escolha um horário"
      : (erroTelefone ?? erroNome);

  const criar = useMutation({
    mutationFn: (troca?: string) =>
      agendarComoConvidado({
        data: {
          slug,
          servicoId: servicoId!,
          profissionalId: escolhido!.profId,
          inicio: escolhido!.iso,
          nome: nome.trim(),
          telefone: digitosTel,
          ...((troca ?? substituiId) ? { substituiId: (troca ?? substituiId)! } : {}),
        },
      }),
    onMutate: () => marcarEtapa("dados_enviados"),
    onSuccess: (res) => {
      if (res.tipo === "conflito") {
        setConflito({ agendamentoId: res.agendamentoId, hora: res.hora });
        return;
      }
      setErro(null);
      setConflito(null);
      setSubstituiId(null);
      setSituacao("confirmado");
      setConfirmado(res.confirmacao);
      marcarEtapa("confirmado");
      setFuturoNoChat(false);
      try {
        localStorage.setItem(
          chaveSalva,
          JSON.stringify({ confirmacao: res.confirmacao, telefone: digitosTel, nome: nome.trim() }),
        );
        const storage = armazenamentoLocal();
        registrarAgendamentoNaMemoria(
          slug,
          {
            servicoId: servicoId!,
            profissionalId: escolhido!.profId,
            horario: escolhido!.label,
            nome: nome.trim(),
            telefone: digitosTel,
          },
          storage,
        );
        limparRascunho(slug, storage);
      } catch {
        /* cache opcional */
      }
      void refetch();
    },
    onError: (e: Error) => {
      setErro(e.message);
      if (e.message.includes("acabou de ser reservado")) {
        setHorario(null);
        void refetch();
      }
    },
  });

  const cancelar = useMutation({
    mutationFn: () =>
      cancelarComoConvidado({
        data: { agendamentoId: confirmado!.agendamentoId, telefone: digitosTel },
      }),
    onSuccess: () => {
      setSituacao("cancelado");
      try {
        localStorage.removeItem(chaveSalva);
      } catch {
        /* opcional */
      }
      void refetch();
    },
    onError: (e: Error) => setErro(e.message),
  });

  function novoAgendamento() {
    try {
      localStorage.removeItem(chaveSalva);
    } catch {
      /* opcional */
    }
    setConfirmado(null);
    setSituacao("confirmado");
    setHorario(null);
    setSubstituiId(null);
    setErro(null);
  }

  if (isLoading)
    return (
      <main className="mx-auto min-h-screen w-full max-w-[520px] px-5 py-8">
        <EsqueletoFormulario campos={5} onTentarDeNovo={() => void refetch()} />
      </main>
    );
  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-paper">Negócio não encontrado</h1>
        <p className="mt-2 text-sm text-mute">Confira o link que você recebeu.</p>
      </main>
    );
  }

  const limiteAtingido = data.agendaOnline === "limite_atingido" && !confirmado;
  if (
    limiteAtingido ||
    !data.profissionais.length ||
    !data.servicos.length ||
    semNenhumDiaAberto(data.horarios)
  ) {
    const zap = data.tenant.whatsapp?.replace(/\D/g, "") || null;
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-paper">{data.tenant.nome}</h1>
        <p className="mt-2 text-sm text-mute">
          {limiteAtingido
            ? `A agenda online está indisponível no momento. Fale direto com ${termos(data.tenant.segmento).comArtigo} para marcar.`
            : "A agenda online ainda não está aberta. Fale direto com o negócio para marcar."}
        </p>
        {zap ? (
          <Button asChild className="mt-6 h-12 font-bold">
            <a
              href={`https://wa.me/${zap}?text=${encodeURIComponent("Olá! Quero agendar um horário.")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle />
              Chamar no WhatsApp
            </a>
          </Button>
        ) : null}
      </main>
    );
  }

  const modoConversa = fluxo === "conversa";
  const linkSobre = `/b/${slug}?ver=pagina`;
  if (confirmado && !(modoConversa && futuroNoChat && situacao === "confirmado")) {
    return (
      <div className="agendamento-marca" style={agendamentoStyle(data.pagina)}>
        <FontesDaMarca config={data.pagina} />
        <ConfirmacaoAgendamento
          confirmacao={confirmado}
          situacao={situacao}
          fuso={fuso}
          logoUrl={data.tenant.logoUrl}
          capaUrl={data.tenant.capaUrl}
          assinaturaVisivel={data.tenant.assinaturaVisivel !== false}
          {...(modoConversa ? { textoFinal: data.pagina.chat.textoFinal } : {})}
          cancelando={cancelar.isPending}
          {...(erro ? { erro } : {})}
          onAlterar={() => {
            setSubstituiId(confirmado.agendamentoId);
            setHorario(null);
            setConfirmado(null);
          }}
          onCancelar={() => cancelar.mutate()}
          onNovo={novoAgendamento}
          extras={
            situacao === "confirmado" ? (
              <>
                {confirmado.preferenciasToken ? (
                  modoConversa ? (
                    <PreferenciasEmConversa
                      agendamentoId={confirmado.agendamentoId}
                      token={confirmado.preferenciasToken}
                      slug={slug}
                    />
                  ) : (
                    <PreferenciasAposAgendamento
                      agendamentoId={confirmado.agendamentoId}
                      token={confirmado.preferenciasToken}
                      slug={slug}
                    />
                  )
                ) : null}
                {confirmado.preferenciasToken ? (
                  <TicketDaConfirmacao
                    agendamentoId={confirmado.agendamentoId}
                    token={confirmado.preferenciasToken}
                    slug={slug}
                  />
                ) : null}
                <ConviteDeConta agendamentoId={confirmado.agendamentoId} telefone={telefone} />
              </>
            ) : null
          }
        />
      </div>
    );
  }

  if (modoConversa) {
    const futuro =
      confirmado && futuroNoChat
        ? {
            dia: hojeNoFuso(fuso, new Date(confirmado.inicio)),
            hora: new Date(confirmado.inicio).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: fuso,
            }),
            onVer: () => setFuturoNoChat(false),
            onRemarcar: () => {
              setSubstituiId(confirmado.agendamentoId);
              setHorario(null);
              setConfirmado(null);
              setFuturoNoChat(false);
            },
            onCancelar: () =>
              cancelar.mutate(undefined, { onSuccess: () => setFuturoNoChat(false) }),
            cancelando: cancelar.isPending,
          }
        : null;
    return (
      <AgendamentoChat
        futuro={futuro}
        linkSobre={linkSobre}
        data={data}
        selecao={selecao}
        nome={nome}
        telefone={telefone}
        setNome={setNome}
        setTelefone={setTelefone}
        confirmar={() => {
          if (!servico || !escolhido || nome.trim().length < 2 || digitosTel.length < 10) return;
          setErro(null);
          setConflito(null);
          criar.mutate(undefined);
        }}
        conflito={conflito}
        alterarConflito={() => {
          if (!conflito) return;
          setSubstituiId(conflito.agendamentoId);
          setConflito(null);
          criar.mutate(conflito.agendamentoId);
        }}
        enviando={criar.isPending}
        erro={erro}
      />
    );
  }

  return (
    <main
      className="agendamento-marca mx-auto min-h-screen w-full max-w-[520px] px-5 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-10"
      style={agendamentoStyle(data.pagina)}
    >
      <FontesDaMarca config={data.pagina} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Agendar horário</p>
        {data.pagina.experiencia === "direta" ? (
          <a href={linkSobre} className="text-xs text-mute underline-offset-4 hover:underline">
            Conhecer {termos(data.tenant.segmento).comArtigo}
          </a>
        ) : null}
      </div>
      <h1 className="mt-1 text-2xl font-bold text-paper">{data.tenant.nome}</h1>
      <StatusFuncionamento horarios={data.horarios} fuso={fuso} />
      {substituiId ? (
        <p
          className="mt-3 rounded-xl border border-line px-4 py-3 text-sm text-paper"
          role="status"
        >
          Escolha o novo horário. O anterior só é liberado quando o novo for confirmado.
        </p>
      ) : null}
      <p className="mt-1 text-sm text-mute">
        {saudacao ? `Olá, ${saudacao}. ` : ""}Sem cadastro e sem senha: escolha o horário e pronto.
      </p>

      <Bloco titulo="Serviço">
        <div className="grid gap-2">
          {data.servicos.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServicoId(s.id);
                setHorario(null);
              }}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                servicoId === s.id ? "border-gold bg-ink2" : "border-line bg-ink2/60"
              }`}
            >
              <Scissors size={16} className="text-gold" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-paper">{s.nome}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-mute">
                  <Clock3 size={12} />
                  {s.duracao_min} min
                </span>
              </span>
              <span className="text-sm font-semibold text-paper">{brl(s.preco_centavos)}</span>
            </button>
          ))}
        </div>
      </Bloco>

      {servicoId && aptos.length ? (
        <Bloco titulo="Profissional">
          <div className="flex flex-wrap gap-2">
            {[{ id: "qualquer", nome: "Qualquer profissional" }, ...aptos].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProfId(p.id);
                  setHorario(null);
                }}
                className={`flex min-h-12 items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                  profId === p.id ? "border-gold text-paper" : "border-line text-mute"
                }`}
              >
                <UserRound size={14} aria-hidden />
                {p.nome}
              </button>
            ))}
          </div>
        </Bloco>
      ) : null}

      {servicoId ? (
        <Bloco titulo="Data">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {dias.map((d) => {
              const info = porDia.get(d);
              const fechado = Boolean(info?.fechado);
              const lotado = !fechado && (info?.opcoes.length ?? 0) === 0;
              const { rotulo, numero } = rotuloDoDia(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={fechado}
                  aria-label={
                    fechado
                      ? `${rotulo} ${numero}, fechado`
                      : lotado
                        ? `${rotulo} ${numero}, lotado`
                        : `${rotulo} ${numero}`
                  }
                  onClick={() => {
                    setDia(d);
                    setHorario(null);
                  }}
                  className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${
                    fechado
                      ? "cursor-not-allowed border-line text-mute2 opacity-50"
                      : dia === d
                        ? "border-gold bg-ink2 text-paper"
                        : "border-line text-mute"
                  }`}
                >
                  <span className="text-xs uppercase">{rotulo}</span>
                  <span className="text-lg font-semibold">{numero}</span>
                  {fechado ? <span className="text-xs leading-none">Fechado</span> : null}
                  {lotado ? <span className="text-xs leading-none">Lotado</span> : null}
                </button>
              );
            })}
          </div>
        </Bloco>
      ) : null}

      {servicoId && agenda ? (
        <Bloco titulo="Horário">
          {agenda.fechado ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-mute2">
              O negócio está fechado neste dia. Escolha outra data.
            </p>
          ) : agenda.opcoes.length ? (
            <div className="grid grid-cols-4 gap-2">
              {agenda.opcoes.map((o) => (
                <button
                  key={o.iso}
                  type="button"
                  onClick={() => {
                    setHorario(o.iso);
                    setConflito(null);
                  }}
                  className={`h-12 rounded-lg border text-sm font-semibold ${
                    horario === o.iso
                      ? "border-gold bg-gold/15 text-paper"
                      : "border-line text-mute"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}
          {servicoId && dia && !agenda.fechado ? (
            <HorariosOcupados
              ocupados={ocupadosDoDia}
              dia={dia}
              servicoId={servicoId}
              slug={data.tenant.slug}
              listaDeEspera={Boolean(data.tenant.usaListaDeEspera)}
            />
          ) : null}
          {agenda.fechado || agenda.opcoes.length ? null : (
            <div className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-mute2">
              <p>Dia lotado. Veja os próximos dias com vaga:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dias
                  .filter(
                    (d) =>
                      d !== dia && (porDia.get(d)?.opcoes.length ?? 0) > 0 && (!dia || d > dia),
                  )
                  .slice(0, 3)
                  .map((d) => {
                    const { rotulo, numero } = rotuloDoDia(d);
                    return (
                      <Button key={d} variant="outline" className="h-12" onClick={() => setDia(d)}>
                        {rotulo} {numero}
                      </Button>
                    );
                  })}
              </div>
              {data.tenant.usaListaDeEspera ? (
                <Button asChild variant="ghost" className="mt-3 h-12 w-full">
                  <a
                    href={`/app/espera?b=${encodeURIComponent(data.tenant.slug)}${servicoId ? `&servico=${servicoId}` : ""}${dia ? `&dia=${dia}` : ""}`}
                  >
                    Agenda cheia? Entrar na lista de espera
                  </a>
                </Button>
              ) : null}
            </div>
          )}
        </Bloco>
      ) : null}

      {escolhido ? (
        <Bloco titulo="Seus dados">
          <div className="grid gap-3">
            <CampoDeFormulario
              rotulo="WhatsApp (com DDD)"
              obrigatorio
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              onBlur={async () => {
                setTocouTelefone(true);
                if (digitosTel.length < 10) return;
                try {
                  // O nome só vem do próprio aparelho de quem já agendou aqui; o servidor não revela.
                  const bruto = localStorage.getItem(`cortai-cliente-publico:${slug}`);
                  const local = bruto
                    ? (JSON.parse(bruto) as { telefone: string; nome: string })
                    : null;
                  if (local && local.telefone === digitosTel && local.nome) {
                    const primeiro = local.nome.split(" ")[0] ?? local.nome;
                    setSaudacao(primeiro);
                    if (!nome.trim()) setNome(local.nome);
                  }
                } catch {
                  /* identificação é um extra: nunca bloqueia o agendamento */
                }
              }}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              erro={tocouTelefone ? erroTelefone : null}
            />
            <CampoDeFormulario
              rotulo="Nome"
              obrigatorio
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() => setTocouNome(true)}
              autoComplete="name"
              enterKeyHint="done"
              erro={tocouNome ? erroNome : null}
            />
          </div>
        </Bloco>
      ) : null}

      {conflito ? (
        <div className="mt-4 rounded-xl border border-brick/40 px-4 py-3" role="alert">
          <p className="text-sm text-paper">Você já tem um horário às {conflito.hora} nesse dia.</p>
          <Button
            variant="outline"
            className="mt-3 h-12 w-full"
            disabled={criar.isPending}
            onClick={() => {
              setSubstituiId(conflito.agendamentoId);
              setConflito(null);
              criar.mutate(conflito.agendamentoId);
            }}
          >
            Alterar esse horário
          </Button>
        </div>
      ) : null}

      {erro ? (
        <p className="mt-4 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}

      <div className="agendamento-marca-barra fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto max-w-[520px]">
          {servico && escolhido ? (
            <p className="mb-2 truncate text-xs text-mute">
              {servico.nome} · {dataLocal(escolhido.iso, fuso)} às {escolhido.label} ·{" "}
              {brl(servico.preco_centavos)}
            </p>
          ) : null}
          <Button
            className="h-12 w-full font-bold"
            disabled={Boolean(falta) || criar.isPending}
            onClick={() => {
              setErro(null);
              setConflito(null);
              criar.mutate(undefined);
            }}
          >
            {criar.isPending
              ? "Confirmando…"
              : substituiId
                ? "Confirmar novo horário"
                : "Agendar horário"}
          </Button>
          {falta && !criar.isPending ? (
            <p className="mt-2 text-center text-xs text-mute">{falta}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
