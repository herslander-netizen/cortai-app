import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getHorariosParaRemarcar, type AgendaItem } from "@/lib/barbeiro.functions";
import { hojeNoFuso } from "@/lib/horarios";

import {
  gradeDoMes,
  LETRAS_SEMANA,
  mesDoDia,
  numeroDoDia,
  somarMeses,
  tituloDoMes,
} from "./calendario";
import type { PedidoRemarcar } from "./PainelAtendimento";
import { diaNoFuso, hora } from "./tempo";

type Modo = "disponibilidade" | "manual";

/**
 * Tela "Reagendar", como no Figaro (vídeo do dono, 18/10): calendário do mês, "Por
 * disponibilidade" (horários livres pelo motor único) ou "Manual" (qualquer horário), o
 * horário escolhido abre os detalhes com o profissional, e "Salvar" fica num botão flutuante
 * que encolhe enquanto a lista rola. A gravação passa pela mesma conferência da Agenda.
 */
export function TelaReagendar({
  item,
  aberto,
  fuso,
  profissionais,
  bloqueado,
  onVoltar,
  onVerificar,
  onRemarcar,
}: {
  item: AgendaItem;
  aberto: boolean;
  fuso: string;
  profissionais: { id: string; nome: string }[];
  bloqueado: boolean;
  onVoltar: () => void;
  onVerificar: (item: AgendaItem, pedido: PedidoRemarcar) => Promise<boolean>;
  onRemarcar: (item: AgendaItem, pedido: PedidoRemarcar) => Promise<void>;
}) {
  const hoje = hojeNoFuso(fuso);
  // Como no Figaro: o calendário abre no dia de hoje (o atendimento continua no horário dele até
  // salvar).
  const [dia, setDia] = useState(hoje);
  const [mes, setMes] = useState(() => mesDoDia(hoje));
  const [modo, setModo] = useState<Modo>("disponibilidade");
  const [profissionalId, setProfissionalId] = useState<string | null>(item.profissionalId ?? null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [manual, setManual] = useState(() => hora(item.inicio, fuso));
  const [escolhendoProfissional, setEscolhendoProfissional] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Ao reabrir, volta para hoje e para o profissional do próprio atendimento.
  useEffect(() => {
    if (!aberto) return;
    setDia(hoje);
    setMes(mesDoDia(hoje));
    setModo("disponibilidade");
    setProfissionalId(item.profissionalId ?? null);
    setEscolhido(null);
    setManual(hora(item.inicio, fuso));
    setErro(null);
  }, [aberto, item, fuso, hoje]);

  const ler = useServerFn(getHorariosParaRemarcar);
  const horarios = useQuery({
    queryKey: ["horarios-remarcar", item.id, dia, profissionalId],
    queryFn: () => ler({ data: { agendamentoId: item.id, dia, profissionalId } }),
    enabled: aberto && modo === "disponibilidade",
    staleTime: 15_000,
  });
  const duracaoMin = horarios.data?.duracaoMin ?? item.duracaoMin;
  const nomeDoProfissional =
    profissionais.find((p) => p.id === profissionalId)?.nome ?? item.profissional;

  // "Salvar" fica comprido parado e vira só o ✓ enquanto a lista rola.
  const [rolando, setRolando] = useState(false);
  const espera = useRef<number | null>(null);
  const aoRolar = () => {
    setRolando(true);
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => setRolando(false), 500);
  };
  useEffect(
    () => () => {
      if (espera.current !== null) window.clearTimeout(espera.current);
    },
    [],
  );

  const horaEscolhida = modo === "manual" ? manual : escolhido;
  const pronto = Boolean(horaEscolhida) && !bloqueado && !salvando;

  async function salvar() {
    if (!horaEscolhida) return;
    const pedido: PedidoRemarcar = { dia, hora: horaEscolhida, profissionalId };
    setErro(null);
    setSalvando(true);
    try {
      if (!(await onVerificar(item, pedido))) {
        setErro(`Esse horário está ocupado para ${nomeDoProfissional}. Escolha outro.`);
        return;
      }
      await onRemarcar(item, pedido);
      onVoltar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível remarcar.");
    } finally {
      setSalvando(false);
    }
  }

  const fimDe = (inicio: string) => {
    const [h = 0, m = 0] = inicio.split(":").map(Number);
    const total = h * 60 + m + duracaoMin;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const detalhes = (inicio: string) => (
    <div className="agenda-reagendar-detalhe">
      <div className="flex items-baseline justify-between gap-2">
        <strong className="truncate">{item.servico}</strong>
        <span className="shrink-0 tabular-nums text-mute">
          {inicio} – {fimDe(inicio)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-mute">Profissional</span>
        {profissionais.length > 1 ? (
          <Button
            type="button"
            variant="link"
            className="h-auto gap-1 p-0 font-semibold"
            onClick={() => setEscolhendoProfissional(true)}
          >
            {nomeDoProfissional} <ChevronDown aria-hidden className="size-4" />
          </Button>
        ) : (
          <span className="font-semibold">{nomeDoProfissional}</span>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && onVoltar()}>
      <SheetContent
        side="right"
        esconderX
        className="agenda-reagendar w-full max-w-none border-0 bg-ink p-0 sm:max-w-[520px]"
      >
        <div className="flex h-full flex-col">
          <header className="agenda-reagendar-topo">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Voltar para a ficha"
              onClick={onVoltar}
            >
              <ArrowLeft aria-hidden />
            </Button>
            <SheetTitle className="text-xl font-normal text-paper">Reagendar</SheetTitle>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28" onScroll={aoRolar}>
            <p className="mb-4 text-[15px] leading-6 text-mute">
              Escolha um dos horários disponíveis ou use o modo Manual para definir qualquer
              horário.
            </p>

            <section className="agenda-reagendar-cartao p-4" aria-label="Escolher o dia">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-paper">{tituloDoMes(mes)}</h3>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mês anterior"
                    disabled={mes <= mesDoDia(hoje)}
                    onClick={() => setMes((m) => somarMeses(m, -1))}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Próximo mês"
                    onClick={() => setMes((m) => somarMeses(m, 1))}
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
              </div>
              <div
                className="grid grid-cols-7 text-center text-xs font-medium text-mute"
                aria-hidden
              >
                {LETRAS_SEMANA.map((letra, i) => (
                  <span key={i} className="pb-2">
                    {letra}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {gradeDoMes(mes).map((d) =>
                  mesDoDia(d) === mes ? (
                    <Button
                      key={d}
                      type="button"
                      variant="ghost"
                      aria-pressed={d === dia}
                      aria-label={`Dia ${numeroDoDia(d)}${d === hoje ? ", hoje" : ""}`}
                      disabled={d < hoje}
                      className={`agenda-reagendar-dia ${d === dia ? "is-escolhido" : ""} ${d === hoje ? "is-hoje" : ""}`}
                      onClick={() => {
                        setDia(d);
                        setEscolhido(null);
                        setErro(null);
                      }}
                    >
                      {numeroDoDia(d)}
                    </Button>
                  ) : (
                    <span key={d} aria-hidden />
                  ),
                )}
              </div>
            </section>

            <div
              className="agenda-reagendar-modos"
              role="tablist"
              aria-label="Como escolher o horário"
            >
              {(
                [
                  ["disponibilidade", "Por disponibilidade"],
                  ["manual", "Manual"],
                ] as const
              ).map(([valor, rotulo]) => (
                <Button
                  key={valor}
                  type="button"
                  role="tab"
                  variant="ghost"
                  aria-selected={modo === valor}
                  className={modo === valor ? "is-ativo" : ""}
                  onClick={() => {
                    setModo(valor);
                    setErro(null);
                  }}
                >
                  {rotulo}
                </Button>
              ))}
            </div>

            {erro ? (
              <p className="mb-3 text-sm font-semibold text-brick" role="alert">
                {erro}
              </p>
            ) : null}

            {modo === "manual" ? (
              <div className="agenda-reagendar-cartao grid gap-3 p-4">
                <label className="text-sm font-semibold text-mute">
                  Horário
                  <input
                    type="time"
                    step={300}
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    className="agenda-campo"
                  />
                </label>
                {manual ? detalhes(manual) : null}
              </div>
            ) : horarios.isPending ? (
              <p className="py-6 text-center text-sm text-mute" role="status">
                Carregando horários…
              </p>
            ) : horarios.isError ? (
              <p className="py-6 text-center text-sm text-mute" role="alert">
                Não deu para carregar os horários.{" "}
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => void horarios.refetch()}
                >
                  Tentar de novo
                </Button>
              </p>
            ) : horarios.data.fechado || horarios.data.horarios.length === 0 ? (
              <p className="py-6 text-center text-sm text-mute" role="status">
                {horarios.data.fechado
                  ? "O negócio não abre neste dia."
                  : "Nenhum horário livre neste dia. Tente outro dia ou o modo Manual."}
              </p>
            ) : (
              <ul className="agenda-reagendar-horarios" aria-label="Horários disponíveis">
                {horarios.data.horarios.map((h) => (
                  <li key={h.iso}>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-pressed={escolhido === h.label}
                      className={`agenda-reagendar-horario ${escolhido === h.label ? "is-escolhido" : ""}`}
                      onClick={() => {
                        setEscolhido((atual) => (atual === h.label ? null : h.label));
                        setErro(null);
                      }}
                    >
                      {h.label}
                    </Button>
                    {escolhido === h.label ? detalhes(h.label) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            type="button"
            size="lg"
            aria-label="Salvar"
            disabled={!pronto}
            className={`agenda-reagendar-salvar ${rolando ? "is-compacto" : ""}`}
            onClick={() => void salvar()}
          >
            <Check aria-hidden />
            <span className="agenda-reagendar-salvar-texto">
              {salvando ? "Salvando…" : "Salvar"}
            </span>
          </Button>
        </div>

        <Sheet open={escolhendoProfissional} onOpenChange={setEscolhendoProfissional}>
          <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-ink px-4 pb-6 pt-3">
            <SheetTitle className="mb-3 mt-4 text-base font-medium text-paper">
              Profissional
            </SheetTitle>
            <ul className="grid gap-2">
              {profissionais.map((p) => (
                <li key={p.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-pressed={p.id === profissionalId}
                    className={`agenda-reagendar-profissional ${p.id === profissionalId ? "is-escolhido" : ""}`}
                    onClick={() => {
                      setProfissionalId(p.id);
                      setEscolhido(null);
                      setEscolhendoProfissional(false);
                    }}
                  >
                    <span className="agenda-reagendar-avatar" aria-hidden>
                      {p.nome.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{p.nome}</span>
                    {p.id === profissionalId ? <Check aria-hidden className="size-5" /> : null}
                  </Button>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}
