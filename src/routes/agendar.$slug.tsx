/**
 * Agendamento público do cliente — sem conta, sem senha, sem login.
 * Abriu → escolheu → informou nome e WhatsApp → confirmou.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarPlus, Check, Clock3, MessageCircle, Scissors, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { brl } from "@/lib/format";
import { normalizarFuso, slotsDoDia } from "@/lib/horarios";
import {
  agendarComoConvidado,
  cancelarComoConvidado,
  getAgendaPublica,
  reconhecerCliente,
  type AgendaPublica,
  type ConfirmacaoPublica,
} from "@/lib/agendamento-publico.functions";

export const Route = createFileRoute("/agendar/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Agendar horário — ${params.slug} | Cortaí` },
      { name: "description", content: "Escolha serviço, profissional e horário. Sem cadastro e sem senha." },
      { property: "og:title", content: `Agendar horário — ${params.slug}` },
      { property: "og:description", content: "Agende em menos de um minuto, só com nome e WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendamentoPublico,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function diaIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function proximosDias(qtd: number) {
  const hoje = new Date();
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    return { iso: diaIso(d), rotulo: DIAS[d.getDay()] ?? "", numero: d.getDate() };
  });
}

function horaLocal(iso: string, fuso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
}

function dataLocal(iso: string, fuso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: fuso });
}

function livre(
  profId: string,
  inicio: number,
  fim: number,
  ocupados: AgendaPublica["ocupados"],
) {
  return !ocupados.some(
    (o) =>
      o.profissional_id === profId &&
      new Date(o.inicio).getTime() < fim &&
      new Date(o.fim).getTime() > inicio,
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-mute">{titulo}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AgendamentoPublico() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["agenda-publica", slug],
    queryFn: () => getAgendaPublica({ data: { slug } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const dias = useMemo(() => proximosDias(14), []);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profId, setProfId] = useState<string>("qualquer");
  const [dia, setDia] = useState<string>(dias[0]?.iso ?? "");
  const [horario, setHorario] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saudacao, setSaudacao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<ConfirmacaoPublica | null>(null);
  const [cancelado, setCancelado] = useState(false);

  const fuso = normalizarFuso(data?.tenant.fuso);
  const servico = data?.servicos.find((s) => s.id === servicoId) ?? null;

  const agenda = useMemo(() => {
    if (!data || !servico || !dia) return null;
    const { fechado, slots } = slotsDoDia(dia, data.horarios, 30, fuso);
    if (fechado) return { fechado: true, opcoes: [] as { iso: string; label: string; profId: string }[] };
    const agora = Date.now();
    const candidatos = profId === "qualquer" ? data.profissionais.map((p) => p.id) : [profId];
    const opcoes = slots
      .map((slot) => {
        const inicio = new Date(slot.iso).getTime();
        const fim = inicio + servico.duracao_min * 60_000;
        if (inicio < agora) return null;
        const disponivel = candidatos.find((id) => livre(id, inicio, fim, data.ocupados));
        return disponivel ? { iso: slot.iso, label: slot.label, profId: disponivel } : null;
      })
      .filter((v): v is { iso: string; label: string; profId: string } => v !== null);
    return { fechado: false, opcoes };
  }, [data, servico, dia, profId]);

  const escolhido = agenda?.opcoes.find((o) => o.iso === horario) ?? null;

  const criar = useMutation({
    mutationFn: () =>
      agendarComoConvidado({
        data: {
          slug,
          servicoId: servicoId!,
          profissionalId: escolhido!.profId,
          inicio: escolhido!.iso,
          nome: nome.trim(),
          telefone,
        },
      }),
    onSuccess: (res) => {
      setErro(null);
      setConfirmado(res);
    },
    onError: (e: Error) => setErro(e.message),
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarComoConvidado({ data: { agendamentoId: confirmado!.agendamentoId, telefone } }),
    onSuccess: () => setCancelado(true),
    onError: (e: Error) => setErro(e.message),
  });

  if (isLoading) return <TelaDeCarregamento texto="Abrindo a agenda…" />;
  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-paper">Barbearia não encontrada</h1>
        <p className="mt-2 text-sm text-mute">Confira o link que você recebeu.</p>
      </main>
    );
  }

  if (confirmado) {
    const whatsapp = confirmado.whatsapp?.replace(/\D/g, "") || null;
    const texto = encodeURIComponent(
      `Olá! Agendei ${confirmado.servico} com ${confirmado.profissional} em ${dataLocal(confirmado.inicio, fuso)} às ${horaLocal(confirmado.inicio, fuso)}.`,
    );
    return (
      <main className="mx-auto min-h-screen w-full max-w-[520px] px-6 pb-16 pt-12">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Check size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-paper">
          {cancelado ? "Agendamento cancelado" : "Agendamento confirmado"}
        </h1>
        {!cancelado ? (
          <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-ink2">
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
        ) : (
          <p className="mt-4 text-sm text-mute">Se quiser, escolha outro horário abaixo.</p>
        )}

        {erro ? <p className="mt-4 text-sm text-brick" role="alert">{erro}</p> : null}

        {!cancelado ? (
          <div className="mt-6 grid gap-2">
            <Button asChild variant="outline" className="h-12">
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                  [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "BEGIN:VEVENT",
                    `SUMMARY:${confirmado.servico} — ${confirmado.barbearia}`,
                    `DTSTART:${confirmado.inicio.replace(/[-:]/g, "").split(".")[0]}Z`,
                    `DTEND:${confirmado.fim.replace(/[-:]/g, "").split(".")[0]}Z`,
                    "END:VEVENT",
                    "END:VCALENDAR",
                  ].join("\n"),
                )}`}
                download="agendamento.ics"
              >
                <CalendarPlus />Adicionar à agenda
              </a>
            </Button>
            {whatsapp ? (
              <Button asChild variant="outline" className="h-12">
                <a href={`https://wa.me/${whatsapp}?text=${texto}`} target="_blank" rel="noreferrer">
                  <MessageCircle />Enviar confirmação pelo WhatsApp
                </a>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-12"
              disabled={cancelar.isPending}
              onClick={() => {
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
          </div>
        ) : (
          <Button className="mt-6 h-12 w-full font-bold" onClick={() => { setConfirmado(null); setCancelado(false); setHorario(null); }}>
            Escolher outro horário
          </Button>
        )}

        <div className="mt-10 rounded-2xl border border-line p-5">
          <p className="text-sm font-semibold text-paper">Quer acompanhar seus agendamentos?</p>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Criar conta é opcional — seu horário já está marcado.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/visitante">Criar conta</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[520px] px-5 pb-32 pt-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Agendar horário</p>
      <h1 className="mt-1 text-2xl font-bold text-paper">{data.tenant.nome}</h1>
      <p className="mt-1 text-sm text-mute">
        {saudacao ? `Olá, ${saudacao} 👋 ` : ""}Sem cadastro e sem senha: escolha o horário e pronto.
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

      {servicoId && data.profissionais.length ? (
        <Bloco titulo="Profissional">
          <div className="flex flex-wrap gap-2">
            {[{ id: "qualquer", nome: "Qualquer profissional" }, ...data.profissionais].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProfId(p.id);
                  setHorario(null);
                }}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
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
            {dias.map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => {
                  setDia(d.iso);
                  setHorario(null);
                }}
                className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${
                  dia === d.iso ? "border-gold bg-ink2 text-paper" : "border-line text-mute"
                }`}
              >
                <span className="text-[11px] uppercase">{d.rotulo}</span>
                <span className="text-lg font-semibold">{d.numero}</span>
              </button>
            ))}
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
                  onClick={() => setHorario(o.iso)}
                  className={`h-11 rounded-lg border text-sm font-semibold ${
                    horario === o.iso ? "border-gold bg-gold/15 text-paper" : "border-line text-mute"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-mute2">
              Não há horários livres neste dia. Escolha outra data.
            </p>
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
                onChange={(e) => setTelefone(e.target.value)}
                onBlur={async () => {
                  const limpo = telefone.replace(/\D/g, "");
                  if (limpo.length < 10) return;
                  try {
                    const res = await reconhecerCliente({ data: { slug, telefone: limpo } });
                    if (res.nome) {
                      setSaudacao(res.nome);
                      if (!nome.trim()) setNome(res.nome);
                    }
                  } catch {
                    /* identificação é um extra: nunca bloqueia o agendamento */
                  }
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
              />
            </label>
            <label className="block text-xs font-medium text-mute">
              Nome
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                placeholder="Como quer ser chamado"
                className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
              />
            </label>
          </div>
        </Bloco>
      ) : null}

      {erro ? (
        <p className="mt-4 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-[520px]">
          {servico && escolhido ? (
            <p className="mb-2 truncate text-xs text-mute">
              {servico.nome} · {dataLocal(escolhido.iso, fuso)} às {escolhido.label} · {brl(servico.preco_centavos)}
            </p>
          ) : null}
          <Button
            className="h-12 w-full font-bold"
            disabled={!escolhido || nome.trim().length < 2 || telefone.replace(/\D/g, "").length < 10 || criar.isPending}
            onClick={() => {
              setErro(null);
              criar.mutate();
            }}
          >
            {criar.isPending ? "Confirmando…" : "Agendar horário"}
          </Button>
        </div>
      </div>
    </main>
  );
}
