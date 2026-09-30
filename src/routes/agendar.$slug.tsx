/**
 * Agendamento público do cliente — sem conta, sem senha, sem login.
 * Abriu → escolheu → informou nome e WhatsApp → confirmou.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarPlus,
  CalendarX,
  Check,
  Clock3,
  MessageCircle,
  Scissors,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { brl } from "@/lib/format";
import { normalizarFuso, semNenhumDiaAberto } from "@/lib/horarios";
import { useSelecaoAgendamento } from "@/components/agendamento/useSelecaoAgendamento";
import { gerarIcs, headDaBarbearia, mascaraTelefone } from "@/lib/previa";
import { CHAVE_VINCULO } from "@/lib/vinculo";
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
  loader: ({ params }) => getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null),
  head: ({ params, loaderData }) =>
    headDaBarbearia(params.slug, loaderData, `/agendar/${params.slug}`, "Agende seu horário"),
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
  const chaveSalva = `cortai-agendamento-publico:${slug}`;

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
      try {
        localStorage.setItem(
          chaveSalva,
          JSON.stringify({ confirmacao: res.confirmacao, telefone: digitosTel, nome: nome.trim() }),
        );
        localStorage.setItem(
          `cortai-cliente-publico:${slug}`,
          JSON.stringify({ telefone: digitosTel, nome: nome.trim() }),
        );
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

  if (isLoading) return <TelaDeCarregamento texto="Abrindo a agenda…" />;
  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-paper">Negócio não encontrado</h1>
        <p className="mt-2 text-sm text-mute">Confira o link que você recebeu.</p>
      </main>
    );
  }

  if (!data.profissionais.length || !data.servicos.length || semNenhumDiaAberto(data.horarios)) {
    const zap = data.tenant.whatsapp?.replace(/\D/g, "") || null;
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-paper">{data.tenant.nome}</h1>
        <p className="mt-2 text-sm text-mute">
          A agenda online ainda não está aberta. Fale direto com a barbearia para marcar.
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

  if (confirmado) {
    const whatsapp = confirmado.whatsapp?.replace(/\D/g, "") || null;
    const texto = encodeURIComponent(
      `Olá! Agendei ${confirmado.servico} com ${confirmado.profissional} em ${dataLocal(confirmado.inicio, fuso)} às ${horaLocal(confirmado.inicio, fuso)}.`,
    );
    const ativo = situacao === "confirmado";
    const titulo = {
      confirmado: "Agendamento confirmado",
      cancelado: "Agendamento cancelado",
      cancelado_pela_barbearia: "A barbearia cancelou este horário",
      remarcado: "A barbearia remarcou este horário",
      nao_compareceu: "Este horário foi marcado como falta",
    }[situacao];
    const ics = gerarIcs({
      id: confirmado.agendamentoId,
      inicio: confirmado.inicio,
      fim: confirmado.fim,
      titulo: `${confirmado.servico} — ${confirmado.barbearia}`,
      local: confirmado.endereco ?? confirmado.barbearia,
      descricao: `Com ${confirmado.profissional}. Agendado pelo Cortaí.`,
    });
    return (
      <main className="mx-auto min-h-screen w-full max-w-[520px] px-6 pb-16 pt-12">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full ${ativo ? "bg-gold/15 text-gold" : "bg-brick/15 text-brick"}`}
        >
          {ativo ? <Check size={28} aria-hidden /> : <CalendarX size={28} aria-hidden />}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-paper">{titulo}</h1>
        {situacao === "cancelado_pela_barbearia" || situacao === "remarcado" ? (
          <p className="mt-2 text-sm text-mute">
            Fale com a barbearia ou escolha outro horário abaixo.
          </p>
        ) : null}
        {ativo ? (
          <dl className="mt-6 divide-y divide-line surface">
            {[
              ["Cliente", confirmado.cliente],
              ["Serviço", `${confirmado.servico} · ${brl(confirmado.valor_centavos)}`],
              ["Profissional", confirmado.profissional],
              ["Data", dataLocal(confirmado.inicio, fuso)],
              ["Horário", horaLocal(confirmado.inicio, fuso)],
              ["Barbearia", confirmado.barbearia],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-mute2">{rotulo}</dt>
                <dd className="text-right text-sm font-semibold text-paper">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : situacao === "cancelado" ? (
          <p className="mt-4 text-sm text-mute">Se quiser, escolha outro horário.</p>
        ) : null}

        {ativo ? (
          <p className="mt-4 text-sm leading-relaxed text-mute">
            Guarde esta página: por ela você altera ou cancela quando quiser. Se a barbearia usa
            WhatsApp, você recebe a confirmação e o lembrete por lá — é só responder para confirmar
            a chegada.
          </p>
        ) : null}

        {erro ? (
          <p className="mt-4 text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}

        {ativo ? (
          <div className="mt-6 grid gap-2">
            <Button asChild variant="outline" className="h-12">
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
                download="agendamento.ics"
              >
                <CalendarPlus />
                Adicionar à agenda
              </a>
            </Button>
            {whatsapp ? (
              <Button asChild variant="outline" className="h-12">
                <a
                  href={`https://wa.me/${whatsapp}?text=${texto}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle />
                  Enviar confirmação pelo WhatsApp
                </a>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-12"
              disabled={cancelar.isPending}
              onClick={() => {
                setSubstituiId(confirmado.agendamentoId);
                setHorario(null);
                setConfirmado(null);
              }}
            >
              Alterar agendamento
            </Button>
            <Button
              variant="ghost"
              className="h-12 text-brick"
              disabled={cancelar.isPending}
              onClick={() => cancelar.mutate()}
            >
              {cancelar.isPending ? "Cancelando…" : "Cancelar agendamento"}
            </Button>
            <Button variant="ghost" className="h-12" onClick={novoAgendamento}>
              Fazer outro agendamento
            </Button>
          </div>
        ) : (
          <Button className="mt-6 h-12 w-full font-bold" onClick={novoAgendamento}>
            Escolher outro horário
          </Button>
        )}

        <div className="mt-10 rounded-2xl border border-line p-5">
          <p className="text-sm font-semibold text-paper">Ganhe pontos a cada corte</p>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Com uma conta gratuita você acumula fidelidade, recebe descontos da casa e vê seus
            horários. É opcional — seu horário já está marcado.
          </p>
          <Button asChild variant="outline" className="mt-3 h-12">
            <Link
              to="/visitante"
              search={{ b: slug }}
              onClick={() => {
                try {
                  localStorage.setItem(
                    CHAVE_VINCULO,
                    JSON.stringify({
                      agendamentoId: confirmado.agendamentoId,
                      telefone: digitosTel,
                    }),
                  );
                } catch {
                  /* opcional */
                }
              }}
            >
              Criar conta grátis
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[520px] px-5 pb-36 pt-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Agendar horário</p>
      <h1 className="mt-1 text-2xl font-bold text-paper">{data.tenant.nome}</h1>
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
                    fechado ? `${rotulo} ${numero}, fechado` : lotado ? `${rotulo} ${numero}, lotado` : `${rotulo} ${numero}`
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
                  {fechado ? <span className="text-[10px] leading-none">Fechado</span> : null}
                  {lotado ? <span className="text-[10px] leading-none">Lotado</span> : null}
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
              A barbearia está fechada neste dia. Escolha outra data.
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
          ) : (
            <div className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-mute2">
              <p>Dia lotado. Veja os próximos dias com vaga:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dias
                  .filter((d) => d !== dia && (porDia.get(d)?.opcoes.length ?? 0) > 0 && (!dia || d > dia))
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
                  <a href={`/f/${data.tenant.slug}`}>Entrar na lista de espera</a>
                </Button>
              ) : null}
            </div>
          )}
        </Bloco>
      ) : null}

      {escolhido ? (
        <Bloco titulo="Seus dados">
          <div className="grid gap-3">
            <label className="block text-xs font-medium text-mute">
              WhatsApp
              <input
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                onBlur={async () => {
                  setTocouTelefone(true);
                  if (digitosTel.length < 10) return;
                  try {
                    // O nome só vem do próprio aparelho de quem já agendou aqui; o servidor não revela.
                    const bruto = localStorage.getItem(`cortai-cliente-publico:${slug}`);
                    const local = bruto ? (JSON.parse(bruto) as { telefone: string; nome: string }) : null;
                    if (local && local.telefone === digitosTel && local.nome) {
                      const primeiro = local.nome.split(" ")[0] ?? local.nome;
                      setSaudacao(primeiro);
                      if (!nome.trim()) setNome(local.nome);
                    }
                  } catch {
                    /* identificação é um extra: nunca bloqueia o agendamento */
                  }
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                aria-invalid={tocouTelefone && Boolean(erroTelefone)}
                className={`mt-2 h-12 w-full rounded-lg border bg-ink2 px-4 text-sm text-paper outline-none ${
                  tocouTelefone && erroTelefone ? "border-brick" : "border-line2"
                }`}
              />
              {tocouTelefone && erroTelefone ? (
                <span className="mt-1 block text-xs text-brick">{erroTelefone}</span>
              ) : null}
            </label>
            <label className="block text-xs font-medium text-mute">
              Nome
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onBlur={() => setTocouNome(true)}
                autoComplete="name"
                placeholder="Como quer ser chamado"
                aria-invalid={tocouNome && Boolean(erroNome)}
                className={`mt-2 h-12 w-full rounded-lg border bg-ink2 px-4 text-sm text-paper outline-none ${
                  tocouNome && erroNome ? "border-brick" : "border-line2"
                }`}
              />
              {tocouNome && erroNome ? (
                <span className="mt-1 block text-xs text-brick">{erroNome}</span>
              ) : null}
            </label>
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink px-5 py-4">
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
