import { Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";

import { Screen } from "@/components/layout/Screen";
import { Aviso, type TomDeAviso } from "@/components/ui/aviso";
import { brl } from "@/lib/format";
import { slotsDoDia } from "@/lib/horarios";
import { getAgendaDia, getAgoraProximo, oferecerHorarioAFila, type AgendaDia } from "@/lib/barbeiro.functions";
import { repetirAgendamento } from "@/lib/crescimento.functions";
import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { prefereMenosMovimento } from "@/lib/motion";

// Formulários pesados só baixam quando a agenda já está na tela.
const AgendamentoManualLazy = lazy(() =>
  import("@/components/barbeiro/AgendamentoManual").then((m) => ({ default: m.AgendamentoManual })),
);
const FechamentoComanda = lazy(() =>
  import("@/components/financeiro/FechamentoComanda").then((m) => ({ default: m.FechamentoComanda })),
);

function AgendamentoManual(props: ComponentProps<typeof AgendamentoManualLazy>) {
  const discreto = props.gatilho === "discreto";
  return (
    <Suspense fallback={<div aria-hidden className={discreto ? "h-6" : "h-12 rounded-lg border border-line bg-ink2"} />}>
      <AgendamentoManualLazy {...props} />
    </Suspense>
  );
}

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Soma dias ao "AAAA-MM-DD" sem passar pelo fuso do navegador. */
function somarDias(dia: string, passo: number) {
  const [a, m, d] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

function corDaBorda(forma: string | null) {
  if (forma === "fiado") return "border-l-brick";
  return "border-l-gold";
}

export default function AgendaPage() {
  const busca = useSearch({ strict: false });
  const acao = busca["acao"] === "agendamento" || busca["acao"] === "atendimento" || busca["acao"] === "cliente"
    ? busca["acao"]
    : undefined;
  const oferecer = useServerFn(oferecerHorarioAFila);
  const repetir = useServerFn(repetirAgendamento);
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10));
  const [aviso, setAviso] = useState<{ tom: TomDeAviso; texto: string } | null>(null);
  const [fechando, setFechando] = useState<string | null>(null);

  const ehHoje = dia === new Date().toISOString().slice(0, 10);
  // Consulta enxuta: só quem está na cadeira e o próximo. Chega antes do dia inteiro.
  const { data: rapido } = useQuery({
    queryKey: ["agenda-agora-proximo"],
    queryFn: () => getAgoraProximo(),
    enabled: ehHoje,
    staleTime: 30_000,
  });
  const { data, isLoading, refetch } = useQuery<AgendaDia>({
    queryKey: ["agenda-dia", dia],
    queryFn: () => getAgendaDia({ data: { dia } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    // Horários livres e ocupados se atualizam sozinhos a cada minuto.
    refetchInterval: 60_000,
  });

  const { slots: lista, fechado, abre, fecha } = useMemo(
    () => slotsDoDia(dia, data?.horarios ?? null),
    [dia, data?.horarios],
  );
  const resumo = useMemo(() => {
    // Enquanto o dia inteiro não chega, "Agora" e "Próximo" vêm da consulta enxuta.
    if (!data) return { atual: rapido?.atual ?? null, proximo: rapido?.proximo ?? null, livres: 0 };
    const agora = Date.now();
    const itens = [...data.itens].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
    const atual = itens.find((item) => new Date(item.inicio).getTime() <= agora && new Date(item.fim).getTime() > agora) ?? null;
    const proximo = itens.find((item) => new Date(item.inicio).getTime() > agora) ?? null;
    const livres = lista.filter((slot) => {
      const instante = new Date(slot.iso).getTime();
      return instante >= agora && !itens.some((item) => instante >= new Date(item.inicio).getTime() && instante < new Date(item.fim).getTime());
    }).length;
    return { atual, proximo, livres };
  }, [data, rapido, lista]);

  // A agenda abre rolada até o próximo atendimento (ou até a abertura), nunca na madrugada.
  const jaRolou = useRef<string | null>(null);
  useEffect(() => {
    if (!data || fechado || lista.length === 0) return;
    if (jaRolou.current === dia) return;
    jaRolou.current = dia;

    const agora = Date.now();
    const proximo = (data.itens ?? [])
      .map((i) => new Date(i.inicio).getTime())
      .filter((t) => t >= agora)
      .sort((a, b) => a - b)[0];

    const alvo =
      lista.find((s) => (proximo ? new Date(s.iso).getTime() >= proximo : new Date(s.iso).getTime() >= agora)) ??
      lista[0];
    if (!alvo) return;

    const el = document.getElementById(`slot-${alvo.iso}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: prefereMenosMovimento() ? "auto" : "smooth" });
  }, [data, fechado, lista, dia]);


  return (
    <Screen title="Agenda de hoje" subtitle="Quem está atendendo, quem vem depois e onde ainda cabe alguém.">
      {data || rapido ? (
        <section className="mb-5 border-y border-line" aria-label="Situação da agenda">
          <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-line py-3">
            <span className="text-xs font-semibold uppercase text-mute2">Agora</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-paper">{resumo.atual?.cliente ?? "Nenhum atendimento em andamento"}</span>
              {resumo.atual ? <span className="block truncate text-xs text-mute">{resumo.atual.servico} · {resumo.atual.profissional}</span> : null}
            </span>
          </div>
          <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 py-3">
            <span className="text-xs font-semibold uppercase text-mute2">Próximo</span>
            <span className="min-w-0">
              <span className="block truncate text-sm text-paper">{resumo.proximo?.cliente ?? "Agenda livre"}</span>
              {resumo.proximo ? <span className="block truncate text-xs text-mute">{resumo.proximo.servico} · {resumo.proximo.profissional}</span> : null}
            </span>
            <span className="text-sm font-bold text-gold">{resumo.proximo ? new Date(resumo.proximo.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : `${resumo.livres} livres`}</span>
          </div>
        </section>
      ) : null}
      <nav className="mb-5 grid grid-cols-3 gap-2" aria-label="Atalhos da agenda">
        <Link to="/barbeiro/agendamentos" className="rounded-lg border border-line bg-ink2 px-3 py-3 text-xs text-paper">Confirmados</Link>
        <Link to="/barbeiro/profissionais" className="rounded-lg border border-line bg-ink2 px-3 py-3 text-xs text-paper">Profissionais</Link>
        <Link to="/barbeiro/fila" className="rounded-lg border border-line bg-ink2 px-3 py-3 text-xs text-paper">Fila de espera</Link>
      </nav>
      <div className="mb-5">
        <AgendamentoManual
          key={acao ?? "normal"}
          dia={dia}
          autoAbrir={Boolean(acao)}
          iniciarNovoCliente={acao === "cliente"}
          rotulo={acao === "atendimento" ? "Novo atendimento" : "Novo agendamento"}
          onCriado={() => {
            setAviso({ tom: "sucesso", texto: "Agendamento criado e já aparece na agenda." });
            void refetch();
          }}
        />
      </div>

      <label className="mb-2 block">
        <span className="text-xs text-mute2">Dia</span>
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"
        />
      </label>
      <div className="mb-6 grid grid-cols-3 gap-2" role="group" aria-label="Navegar pelos dias">
        <button type="button" className="btn-tertiary text-xs" onClick={() => setDia(somarDias(dia, -1))}>
          Anterior
        </button>
        <button type="button" className="btn-tertiary text-xs" onClick={() => setDia(hojeIso())}>
          Hoje
        </button>
        <button type="button" className="btn-tertiary text-xs" onClick={() => setDia(somarDias(dia, 1))}>
          Próximo
        </button>
      </div>

      {aviso ? (
        <Aviso tom={aviso.tom} className="mb-4">
          {aviso.texto}
        </Aviso>
      ) : null}
      {isLoading ? <EsqueletoAgenda linhas={5} /> : null}


      {fechado ? (
        <div className="rounded-lg border border-line bg-ink2 px-4 py-5">
          <p className="text-sm text-paper">Barbearia fechada neste dia</p>
          <p className="mt-1 text-xs text-mute2">
            Você pode mudar isso em Horários de funcionamento.
          </p>
        </div>
      ) : (
        <ul data-guia="agenda-lista">
          {lista.map((s) => {
            const t = new Date(s.iso).getTime();
            const itens = (data?.itens ?? []).filter((i) => {
              const ini = new Date(i.inicio).getTime();
              const fim = new Date(i.fim).getTime();
              return t >= ini && t < fim;
            });
            const naFila = (data?.fila ?? []).filter(
              (f) =>
                f.janelaInicio === null ||
                f.janelaFim === null ||
                (s.hora >= f.janelaInicio && s.hora < f.janelaFim),
            ).length;

            return (
              <li key={s.iso} id={`slot-${s.iso}`} className="flex items-stretch gap-3 py-1.5">
                <span className="w-12 shrink-0 pt-3 text-xs text-mute">{s.label}</span>

                {itens.length > 0 ? (
                  <div className="flex-1 space-y-2">
                    {itens.length > 1 ? (
                      <p className="text-[11px] text-mute2">
                        {itens.length} atendimentos neste horário
                      </p>
                    ) : null}
                    {itens.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-r-lg border-l-2 bg-ink2 px-4 py-3 ${corDaBorda(item.forma_pagamento)}`}
                      >
                        {item.clienteId ? (
                          <Link
                            to="/barbeiro/clientes/$id"
                            params={{ id: item.clienteId }}
                            className="text-sm font-medium text-gold underline underline-offset-2"
                          >
                            {item.cliente}
                          </Link>
                        ) : (
                          <p className="text-sm text-paper">{item.cliente}</p>
                        )}
                        <p className="mt-0.5 text-xs text-mute">
                          {item.servico} · {item.profissional}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${item.forma_pagamento === "fiado" ? "text-brick" : "text-mute2"}`}
                        >
                          {item.forma_pagamento === "credito"
                            ? "1 crédito"
                            : item.forma_pagamento === "fiado"
                              ? `Fiado · ${brl(item.valor_centavos)}`
                              : brl(item.valor_centavos)}
                        </p>
                        <button
                          type="button"
                          className="btn-primary mt-3 w-full text-xs"
                          onClick={() => setFechando(item.id)}
                        >
                          Finalizar e receber
                        </button>
                        <div data-guia="agenda-repetir" className="mt-2 flex flex-wrap gap-3">
                          <span className="text-[11px] text-mute2">Repetir:</span>
                          {(["semanal", "quinzenal", "mensal"] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              className="btn-tertiary text-[11px]"
                              onClick={async () => {
                                try {
                                  const r = await repetir({ data: { agendamentoId: item.id, periodicidade: p } });
                                  setAviso({
                                    tom: "info",
                                    texto: `Repetido para ${new Date(r.inicio).toLocaleDateString("pt-BR")}.`,
                                  });
                                  void refetch();
                                } catch (e) {
                                  setAviso({
                                    tom: "acao",
                                    texto: e instanceof Error ? e.message : "Não foi possível repetir.",
                                  });
                                }
                              }}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div data-guia="agenda-vazio" className="flex-1 rounded-r-lg border border-dashed border-line border-l-2 bg-ink px-4 py-3">
                    <p className="text-sm text-mute">Horário livre</p>
                    <p className="mt-0.5 text-xs text-mute2">
                      {naFila > 0
                        ? `${naFila} ${naFila === 1 ? "pessoa" : "pessoas"} na fila para esta janela`
                        : "Ninguém na fila para esta janela"}
                    </p>
                    {naFila > 0 ? (
                      <button
                        type="button"
                        className="btn-tertiary mt-2 text-xs"
                        onClick={async () => {
                          const r = await oferecer({ data: { inicioIso: s.iso } });
                          setAviso(
                            r.avisado
                              ? { tom: "atencao", texto: `${r.avisado} foi avisado do horário das ${s.label}. Quem responder primeiro fica com a vaga.` }
                              : { tom: "info", texto: "Ninguém na fila para esta janela." },
                          );
                        }}
                      >
                        Oferecer à fila
                      </button>
                    ) : null}
                    <div className="mt-2">
                      <AgendamentoManual
                        dia={dia}
                        horaInicial={s.label}
                        gatilho="discreto"
                        onCriado={() => {
                          setAviso({ tom: "sucesso", texto: `Cliente marcado às ${s.label}.` });
                          void refetch();
                        }}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs text-mute2">
        {fechado ? "Dia fechado no horário de funcionamento." : `Aberto das ${abre} às ${fecha}.`} Linha verde:
        horário normal. Vermelha: fiado. Tracejado: horário livre.
      </p>

      {fechando ? (
        <FechamentoComanda
          agendamentoId={fechando}
          onFechar={() => setFechando(null)}
          onConcluido={() => {
            setFechando(null);
            setAviso({ tom: "sucesso", texto: "Atendimento fechado, pagamento registrado no caixa." });
            void refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}
