import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Check,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  Plus,
  Scissors,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { Lightbulb, LightbulbOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTelaAcesa } from "@/hooks/useTelaAcesa";
import { salvarTelaAcesa, telaAcesaInicial } from "@/components/barbeiro/agenda/preferencias";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { resumoDoDia } from "@/lib/resumo-dia";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";
import { termos } from "@/lib/segmentos";
import { estaAtrasado, nomeDaAgenda } from "@/components/barbeiro/agenda/tempo";
import { AlertasFoco } from "@/components/barbeiro/agenda/AlertasFoco";
import { FichaFoco } from "@/components/barbeiro/agenda/FichaFoco";
import { alertasDeEmergencia } from "@/components/barbeiro/agenda/alertas-foco";
import { consumirAvisosDoFoco, definirModoFoco } from "@/lib/modo-foco";
import { avisosGuardados } from "@/lib/avisos";

type Props = {
  dia: string;
  hoje: boolean;
  fuso: string | undefined;
  itens: AgendaItem[];
  /** ID do profissional filtrado. */
  profissional: string | null;
  profissionais: { id: string; nome: string }[];
  online: boolean;
  ocupado: boolean;
  carregando: boolean;
  erro: string | null;
  onSair: () => void;
  onDia: (dia: string) => void;
  onProfissional: (id: string | null) => void;
  onChegou: (item: AgendaItem) => void;
  onComecar: (item: AgendaItem) => void;
  onTerminar: (item: AgendaItem) => void;
  onMaisOpcoes: (item: AgendaItem) => void;
  fila?: number;
  onChamarFila?: () => void;
  onAcoes: () => void;
  onNovoAtendimento?: () => void;
  onNovoAgendamento: () => void;
  onReceber: (item: AgendaItem) => void;
  pagamentosPendentes: Set<string>;
  onTentarNovamente: () => void;
  discreto?: boolean;
};

function somarDias(dia: string, passo: number) {
  const [ano, mes, data] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, data ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

function hora(iso: string, fuso?: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
}

function dataCurta(dia: string) {
  return new Date(`${dia}T12:00:00Z`)
    .toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    })
    .replace(/^./, (letra) => letra.toLocaleUpperCase("pt-BR"));
}

function minutosAte(iso: string, agora: number) {
  return Math.ceil((new Date(iso).getTime() - agora) / 60_000);
}

const FORA_DA_OPERACAO = new Set(["cancelado", "remarcado", "nao_compareceu"]);

type EstadoCockpit =
  | "sem_atendimento"
  | "chegou"
  | "atendimento"
  | "finalizando"
  | "finalizado"
  | "atrasado"
  | "encaixe";

function estadoDoCockpit(item: AgendaItem | undefined, agora: number): EstadoCockpit {
  if (!item) return "sem_atendimento";
  if (item.status === "na_cadeira") return "atendimento";
  if (item.status === "chegou") return "chegou";
  if (item.status === "finalizado") return "finalizado";
  if (item.encaixe) return "encaixe";
  if (estaAtrasado(item, agora)) return "atrasado";
  return "sem_atendimento";
}

const ROTULO_ESTADO: Record<EstadoCockpit, string> = {
  sem_atendimento: "Sem atendimento agora",
  chegou: "Cliente chegou",
  atendimento: "",
  finalizando: "Finalizando",
  finalizado: "Finalizado",
  atrasado: "Atendimento atrasado",
  encaixe: "Encaixe",
};

export function AgendaFocoMobile(props: Props) {
  const agora = useAgora();
  const segmento = useSegmentoDoPainel();
  const resumo = resumoDoDia(props.itens, agora);
  const operacionais = useMemo(
    () => props.itens.filter((item) => !FORA_DA_OPERACAO.has(item.status)),
    [props.itens],
  );
  const emAberto = operacionais.filter((item) => item.status !== "finalizado");
  const ativo = emAberto.find((item) => item.status === "na_cadeira");
  const chegou = emAberto.find((item) => item.status === "chegou");
  const atrasado = emAberto.find((item) => estaAtrasado(item, agora));
  const futuro = emAberto.find((item) => new Date(item.fim).getTime() >= agora);
  const ultimoFinalizado = [...operacionais]
    .filter((item) => item.status === "finalizado")
    .sort((a, b) => new Date(b.fim).getTime() - new Date(a.fim).getTime())[0];
  const principal = ativo ?? chegou ?? atrasado ?? futuro ?? ultimoFinalizado;
  const estado = estadoDoCockpit(principal, agora);
  const proximos = emAberto.filter((item) => item.id !== principal?.id).slice(0, 3);
  const decorrido = ativo
    ? Math.max(
        0,
        Math.floor((agora - new Date(ativo.startedAt ?? ativo.inicio).getTime()) / 60_000),
      )
    : 0;
  const ate = principal ? minutosAte(principal.inicio, agora) : null;
  const desabilitado = !props.online || props.ocupado;
  const proximo = proximos[0];
  const anteriores = useRef(props.itens);
  const [dispensados, setDispensados] = useState(() => new Set<string>());
  const alertas = alertasDeEmergencia({
    itens: props.itens,
    itensAnteriores: anteriores.current,
    agora,
    online: props.online,
    dispensados,
  });
  const idsMudanca = alertas
    .filter((alerta) => alerta.tipo === "proximo_mudou")
    .map((alerta) => alerta.id)
    .join("|");
  const vibrou = useRef(new Set<string>());
  useEffect(() => {
    for (const id of idsMudanca.split("|").filter(Boolean)) {
      if (vibrou.current.has(id)) continue;
      vibrou.current.add(id);
      navigator.vibrate?.(20);
    }
    anteriores.current = props.itens;
  }, [props.itens, idsMudanca]);
  useEffect(() => {
    definirModoFoco(true);
    return () => {
      definirModoFoco(false);
      const total = consumirAvisosDoFoco();
      if (total > 0) avisosGuardados(total);
    };
  }, []);

  const contexto = principal
    ? estado === "atendimento"
      ? `${decorrido} min em atendimento`
      : estado === "atrasado"
        ? `${Math.abs(ate ?? 0)} min de atraso`
        : ate !== null && ate > 0
          ? `Próximo em ${ate} min`
          : hora(principal.inicio, props.fuso)
    : "Nenhum atendimento em andamento";

  return (
    <section className="modo-foco mov-foco-entrada" aria-label="Modo Foco da agenda">
      <header className="modo-foco-topo">
        <Button variant="ghost" className="modo-foco-sair" onClick={props.onSair}>
          <ArrowLeft />
          Ver agenda completa
        </Button>
        <div className="modo-foco-topo-acoes">
          <LampadaDaTela />
        </div>
      </header>

      <AlertasFoco
        alertas={alertas}
        onDispensar={(id) => setDispensados((atuais) => new Set(atuais).add(id))}
      />

      <div className="modo-foco-corpo">
        <div className="modo-foco-data">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dia anterior"
            onClick={() => props.onDia(somarDias(props.dia, -1))}
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-0 text-center">
            <strong>{props.hoje ? "Hoje" : dataCurta(props.dia)}</strong>
            {props.hoje ? <span>{dataCurta(props.dia)}</span> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo dia"
            onClick={() => props.onDia(somarDias(props.dia, 1))}
          >
            <ChevronRight />
          </Button>
        </div>

        {props.profissionais.length > 1 ? (
          <div className="modo-foco-profissionais sem-barra" aria-label="Profissional">
            <Button
              variant="ghost"
              size="sm"
              className={props.profissional === null ? "agenda-chip-ativo" : ""}
              onClick={() => props.onProfissional(null)}
            >
              Todos
            </Button>
            {props.profissionais.map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                size="sm"
                className={props.profissional === p.id ? "agenda-chip-ativo" : ""}
                onClick={() => props.onProfissional(p.id)}
              >
                {p.nome}
              </Button>
            ))}
          </div>
        ) : null}

        <p className="modo-foco-resumo">
          {resumo.restantes}{" "}
          {resumo.restantes === 1 ? "atendimento restante" : "atendimentos restantes"}
        </p>

        {props.carregando ? (
          <div className="modo-foco-vazio" aria-label="Carregando agenda">
            <div className="w-full max-w-xl">
              <EsqueletoAgenda linhas={3} />
            </div>
          </div>
        ) : props.erro ? (
          <div className="modo-foco-vazio" role="alert">
            <strong>Não foi possível carregar a agenda</strong>
            <span>{props.erro}</span>
            <Button variant="outline" onClick={props.onTentarNovamente}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <main className="modo-foco-cockpit">
            <div
              key={`${principal?.id ?? "livre"}-${estado}`}
              className="modo-foco-estado mov-conteudo-entrada"
              aria-live="polite"
            >
              <p className={`modo-foco-rotulo modo-foco-rotulo-${estado}`}>
                {estado === "atendimento"
                  ? termos(segmento).statusAtendimento
                  : ROTULO_ESTADO[estado]}
              </p>
              <p className="modo-foco-contexto">{contexto}</p>

              {principal ? (
                <>
                  <div className="modo-foco-cliente">
                    <time dateTime={principal.inicio}>{hora(principal.inicio, props.fuso)}</time>
                    <div className="min-w-0">
                      <h1>{nomeDaAgenda(principal.cliente, Boolean(props.discreto))}</h1>
                      <p>
                        {principal.servico} · {principal.profissional} · {principal.duracaoMin} min
                      </p>
                      {principal.encaixe ? <span>Encaixe</span> : null}
                    </div>
                  </div>

                  <FichaFoco
                    clienteId={principal.clienteId}
                    cliente={principal.cliente}
                    preferencias={principal.preferencias ?? {}}
                    observacao={principal.ficha}
                    discreto={Boolean(props.discreto)}
                    finalizado={principal.status === "finalizado"}
                    onAbrir={() => props.onMaisOpcoes(principal)}
                  />

                  {estado === "atendimento" ? (
                    <div
                      className="modo-foco-cronometro"
                      role="timer"
                      aria-label={`${decorrido} minutos em atendimento`}
                    >
                      <span
                        style={{
                          transform: `scaleX(${Math.min(1, decorrido / Math.max(1, principal.duracaoMin))})`,
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="modo-foco-principal">
                    {principal.status === "agendado" ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onChegou(principal)}
                      >
                        <UserRoundPlus /> Cliente chegou
                      </Button>
                    ) : null}
                    {principal.status === "chegou" ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onComecar(principal)}
                      >
                        <Scissors /> Começar
                      </Button>
                    ) : null}
                    {principal.status === "na_cadeira" ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onTerminar(principal)}
                      >
                        <Check /> Finalizar e cobrar
                      </Button>
                    ) : null}
                    {principal.status === "finalizado" &&
                    props.pagamentosPendentes.has(principal.id) ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onReceber(principal)}
                      >
                        <HandCoins /> Receber
                      </Button>
                    ) : null}
                    {principal.status === "finalizado" &&
                    !props.pagamentosPendentes.has(principal.id) ? (
                      <Button size="lg" onClick={props.onNovoAgendamento}>
                        <CalendarPlus /> Novo agendamento
                      </Button>
                    ) : null}
                  </div>

                  <div className="modo-foco-secundarias">
                    <Button variant="ghost" onClick={() => props.onMaisOpcoes(principal)}>
                      <MoreHorizontal /> Cliente e outras ações
                    </Button>
                    {estado === "atrasado" ? (
                      <>
                        <Button variant="outline" onClick={() => props.onMaisOpcoes(principal)}>
                          <CalendarClock /> Remarcar
                        </Button>
                        <Button variant="ghost" onClick={() => props.onMaisOpcoes(principal)}>
                          <XCircle /> Cancelar
                        </Button>
                      </>
                    ) : null}
                    {principal.status === "finalizado" ? (
                      <Button variant="outline" onClick={props.onSair}>
                        Voltar para a agenda
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="modo-foco-sem-atendimento">
                  <Clock3 aria-hidden />
                  <strong>Agenda livre</strong>
                  <span>{dataCurta(props.dia)}</span>
                  {props.onNovoAtendimento ? (
                    <Button size="lg" onClick={props.onNovoAtendimento}>
                      <Plus /> Encaixar cliente
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            <aside className="modo-foco-sequencia" id="agenda-completa">
              <div className="modo-foco-sequencia-topo">
                <div>
                  <p>Próximos</p>
                  <span>Sequência do dia</span>
                </div>
                <Button variant="ghost" size="sm" onClick={props.onAcoes}>
                  <Plus /> Ações
                </Button>
              </div>
              {proximos.length ? (
                <ol>
                  {proximos.map((item) => (
                    <li key={item.id}>
                      <Button variant="ghost" onClick={() => props.onMaisOpcoes(item)}>
                        <time>{hora(item.inicio, props.fuso)}</time>
                        <span>
                          <strong>{nomeDaAgenda(item.cliente, Boolean(props.discreto))}</strong>
                          <small>{item.servico}</small>
                        </span>
                        <StatusBadge status={item.status} />
                      </Button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="modo-foco-sequencia-vazia">Nenhum outro atendimento neste dia.</p>
              )}
            </aside>
          </main>
        )}
      </div>
    </section>
  );
}

/** Lâmpada do Foco: mantém a tela acesa. Só aparece com suporte do aparelho. */
function LampadaDaTela() {
  const [suporte, setSuporte] = useState(false);
  const [ligada, setLigada] = useState(true);
  useEffect(() => {
    setSuporte(typeof navigator !== "undefined" && "wakeLock" in navigator);
    setLigada(telaAcesaInicial());
  }, []);
  useTelaAcesa(ligada);
  if (!suporte) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 text-mute"
      aria-label="Manter tela acesa"
      aria-pressed={ligada}
      onClick={() => {
        setLigada(!ligada);
        salvarTelaAcesa(!ligada);
      }}
    >
      {ligada ? <Lightbulb aria-hidden /> : <LightbulbOff aria-hidden />}
    </Button>
  );
}
