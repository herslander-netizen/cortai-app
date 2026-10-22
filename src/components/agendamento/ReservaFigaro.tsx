import { ChevronDown, ChevronLeft, ChevronRight, Check, Clock3, UserRound, X } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { mascaraTelefone } from "@/lib/previa";
import {
  dataPorExtenso,
  horaFinal,
  horariosComProfissionais,
  mesEAno,
  rotuloDosProfissionais,
} from "@/lib/reserva-figaro";
import type { useSelecaoAgendamento } from "./useSelecaoAgendamento";

type Selecao = ReturnType<typeof useSelecaoAgendamento>;

type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
  categoria?: string | null;
};
type Profissional = { id: string; nome: string };

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function diaDaSemana(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return {
    sigla: SEMANA[new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, d ?? 1)).getUTCDay()] ?? "",
    numero: d ?? 0,
  };
}

export type PropsDaReserva = {
  nomeDoNegocio: string;
  servicos: Servico[];
  profissionais: Profissional[];
  horarios: Parameters<typeof horariosComProfissionais>[0]["horarios"];
  ocupados: Parameters<typeof horariosComProfissionais>[0]["ocupados"];
  regras: { antecedenciaMin: number; intervaloEntreMin: number };
  passoMin: number;
  fuso: string;
  selecao: Selecao;
  /** Profissional escolhido para o horário (Figaro deixa trocar na própria linha). */
  profissionalId: string | null;
  setProfissionalId: (id: string | null) => void;
  nome: string;
  setNome: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  erroNome: string | null;
  erroTelefone: string | null;
  enviando: boolean;
  erro: string | null;
  conflito: { agendamentoId: string; hora: string } | null;
  alterarConflito: () => void;
  confirmar: () => void;
  substituindo: boolean;
  voltarParaPagina: () => void;
  classeDoTema?: string | undefined;
  extra?: ReactNode;
};

/**
 * Reserva no padrão do Figaro (`landing_peek_booking` do APK): lista de serviços com "Agendar"; depois a
 * folha com faixa de dias, horários com o profissional livre ("Lucas +2"), escolha do profissional na
 * própria linha e barra "Continuar"; e a tela "Seus Dados". A confirmação verde fica em
 * `ReservaConfirmada`. Usa o mesmo motor e as mesmas regras do agendamento de sempre.
 */
export function ReservaFigaro(p: PropsDaReserva) {
  const { selecao } = p;
  const [passo, setPasso] = useState<"horario" | "dados">("horario");
  const [tocouTelefone, setTocouTelefone] = useState(false);
  const [tocouNome, setTocouNome] = useState(false);
  const faixa = useRef<HTMLDivElement>(null);
  const servico = selecao.servico;
  const dia = selecao.dia ?? selecao.dias[0] ?? null;

  const lista = useMemo(
    () =>
      servico && dia
        ? horariosComProfissionais({
            dia,
            servico,
            profissionais: p.profissionais,
            horarios: p.horarios,
            fuso: p.fuso,
            ocupados: p.ocupados,
            regras: p.regras,
            passoMin: p.passoMin,
          })
        : { fechado: false, horarios: [] },
    [servico, dia, p.profissionais, p.horarios, p.fuso, p.ocupados, p.regras, p.passoMin],
  );
  const escolhido = lista.horarios.find((h) => h.iso === selecao.inicio) ?? null;
  const profEscolhido =
    escolhido?.profissionais.find((x) => x.id === p.profissionalId) ??
    escolhido?.profissionais[0] ??
    null;

  const moverFaixa = (direcao: -1 | 1) =>
    faixa.current?.scrollBy({
      left: direcao * Math.max(180, faixa.current.clientWidth * 0.8),
      behavior: "smooth",
    });

  // ---- 1. Serviços ----
  if (!servico) {
    return (
      <main className="fr" data-tema={p.classeDoTema}>
        <header className="fr-topo">
          <button type="button" aria-label="Voltar" onClick={p.voltarParaPagina}>
            <ChevronLeft size={26} aria-hidden />
          </button>
          <strong>{p.nomeDoNegocio}</strong>
        </header>
        <section className="fr-servicos">
          <h1>Serviços</h1>
          <ul>
            {p.servicos.map((s) => (
              <li key={s.id}>
                <div>
                  <h2>{s.nome}</h2>
                  <p>
                    {brl(s.preco_centavos)}
                    <span>
                      <Clock3 size={14} aria-hidden /> {s.duracao_min} min
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  className="fr-agendar"
                  onClick={() => selecao.setServicoId(s.id)}
                >
                  Agendar
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  // ---- 3. Seus dados ----
  if (passo === "dados" && escolhido && profEscolhido) {
    return (
      <main className="fr fr-folha" data-tema={p.classeDoTema}>
        <header className="fr-cabecalho">
          <button type="button" aria-label="Voltar" onClick={() => setPasso("horario")}>
            <ChevronLeft size={24} aria-hidden />
          </button>
          <h1>Seus Dados</h1>
          <button type="button" aria-label="Fechar" onClick={() => selecao.setServicoId(null)}>
            <X size={24} aria-hidden />
          </button>
        </header>
        <div className="fr-dados">
          <label>
            <span>Número de Telefone</span>
            <span className="fr-telefone">
              <span className="fr-ddi">
                <span aria-hidden>🇧🇷</span> +55 <ChevronDown size={14} aria-hidden />
              </span>
              <input
                value={p.telefone}
                onChange={(e) => p.setTelefone(mascaraTelefone(e.target.value))}
                onBlur={() => setTocouTelefone(true)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99123-4567"
                aria-invalid={tocouTelefone && p.erroTelefone ? true : undefined}
              />
            </span>
            {tocouTelefone && p.erroTelefone ? <em role="alert">{p.erroTelefone}</em> : null}
          </label>
          <label>
            <span>Nome</span>
            <input
              className="fr-campo"
              value={p.nome}
              onChange={(e) => p.setNome(e.target.value)}
              onBlur={() => setTocouNome(true)}
              autoComplete="name"
              placeholder="Como devemos chamar você?"
              aria-invalid={tocouNome && p.erroNome ? true : undefined}
            />
            {tocouNome && p.erroNome ? <em role="alert">{p.erroNome}</em> : null}
          </label>
          <p className="fr-aviso">
            Se o número já tiver cadastro, enviamos um código no WhatsApp para confirmar.
          </p>
          {p.conflito ? (
            <div className="fr-alerta" role="alert">
              <p>Você já tem um horário às {p.conflito.hora} nesse dia.</p>
              <button type="button" disabled={p.enviando} onClick={p.alterarConflito}>
                Alterar esse horário
              </button>
            </div>
          ) : null}
          {p.erro ? (
            <p className="fr-erro" role="alert">
              {p.erro}
            </p>
          ) : null}
          {p.extra}
        </div>
        <footer className="fr-barra">
          <div>
            <strong>
              {dataPorExtenso(dia ?? "")} · {escolhido.label}
            </strong>{" "}
            <span>às {horaFinal(escolhido.label, servico.duracao_min)}</span>
            <small>com {profEscolhido.nome}</small>
          </div>
          <Button className="fr-continuar" loading={p.enviando} onClick={p.confirmar}>
            {p.substituindo ? "Confirmar novo horário" : "Confirmar"}
          </Button>
        </footer>
      </main>
    );
  }

  // ---- 2. Dia e horário ----
  return (
    <main className="fr fr-folha" data-tema={p.classeDoTema}>
      <header className="fr-cabecalho">
        <button
          type="button"
          aria-label="Voltar aos serviços"
          onClick={() => selecao.setServicoId(null)}
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
        <h1>{servico.nome}</h1>
        <span />
      </header>
      <div className="fr-mes">
        <strong>
          {dia ? mesEAno(dia) : "Próximas datas"} <ChevronDown size={16} aria-hidden />
        </strong>
        <span>
          <button type="button" aria-label="Dias anteriores" onClick={() => moverFaixa(-1)}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" aria-label="Próximos dias" onClick={() => moverFaixa(1)}>
            <ChevronRight size={20} aria-hidden />
          </button>
        </span>
      </div>
      <div className="fr-dias" ref={faixa}>
        {selecao.dias.map((d) => {
          const info = selecao.porDia.get(d);
          const fechado = Boolean(info?.fechado);
          const { sigla, numero } = diaDaSemana(d);
          return (
            <button
              key={d}
              type="button"
              disabled={fechado}
              aria-pressed={dia === d}
              aria-label={`${sigla} ${numero}${fechado ? ", fechado" : ""}`}
              onClick={() => {
                selecao.setDia(d);
                p.setProfissionalId(null);
              }}
              className="fr-dia"
            >
              <b>{numero}</b>
              <small>{sigla}</small>
            </button>
          );
        })}
      </div>
      <ul className="fr-horarios" aria-label="Horários disponíveis">
        {lista.fechado ? (
          <li className="fr-vazio">Fechado neste dia. Escolha outra data.</li>
        ) : null}
        {!lista.fechado && lista.horarios.length === 0 ? (
          <li className="fr-vazio">Sem horários neste dia. Escolha outra data.</li>
        ) : null}
        {lista.horarios.map((h) => {
          const aberto = h.iso === selecao.inicio;
          return (
            <li key={h.iso} data-aberto={aberto || undefined}>
              <button
                type="button"
                className="fr-linha"
                aria-expanded={aberto}
                onClick={() => {
                  selecao.setInicio(h.iso);
                  p.setProfissionalId(h.profissionais[0]?.id ?? null);
                }}
              >
                <strong>{h.label}</strong>
                <span>
                  <UserRound size={14} aria-hidden /> {rotuloDosProfissionais(h.profissionais)}
                </span>
              </button>
              {aberto ? (
                <ul className="fr-profissionais">
                  {h.profissionais.map((pr) => {
                    const marcado = (profEscolhido?.id ?? h.profissionais[0]?.id) === pr.id;
                    return (
                      <li key={pr.id} data-marcado={marcado || undefined}>
                        <span>
                          <UserRound size={14} aria-hidden /> {pr.nome}
                        </span>
                        {marcado ? (
                          <b className="fr-selecionado">
                            <Check size={14} aria-hidden /> Selecionado
                          </b>
                        ) : (
                          <button type="button" onClick={() => p.setProfissionalId(pr.id)}>
                            Selecionar
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {escolhido && profEscolhido ? (
        <footer className="fr-barra">
          <div>
            <strong>
              {dataPorExtenso(dia ?? "")} · {escolhido.label}
            </strong>{" "}
            <span>às {horaFinal(escolhido.label, servico.duracao_min)}</span>
            <small>com {profEscolhido.nome}</small>
          </div>
          <Button className="fr-continuar" onClick={() => setPasso("dados")}>
            Continuar
          </Button>
        </footer>
      ) : null}
    </main>
  );
}

/** Tela verde "Reserva confirmada" (final do `landing_peek_booking`). */
export function ReservaConfirmada({
  data,
  hora,
  horaFim,
  profissional,
}: {
  data: string;
  hora: string;
  horaFim: string;
  profissional: string;
}) {
  return (
    <main className="fr-ok" role="status" aria-live="polite">
      <svg viewBox="0 0 80 80" width="88" height="88" fill="none" aria-hidden>
        <circle cx="40" cy="40" r="37" stroke="currentColor" strokeWidth="3" />
        <path
          className="fr-ok-visto"
          d="M24 41l11 11 21-23"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h1>Reserva confirmada</h1>
      <p>
        {data} · {hora} às {horaFim}
      </p>
      <p>com {profissional}</p>
    </main>
  );
}
