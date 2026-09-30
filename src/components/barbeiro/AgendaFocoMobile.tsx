import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListOrdered,
  MoreHorizontal,
  Plus,
  Scissors,
  UserRoundCheck,
} from "lucide-react";
import { useMemo } from "react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { resumoDoDia } from "@/lib/resumo-dia";

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
  onTentarNovamente: () => void;
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

const TERMINAIS = new Set(["cancelado", "remarcado", "nao_compareceu", "finalizado"]);

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
  if (item.status === "agendado" && new Date(item.inicio).getTime() < agora) return "atrasado";
  return "sem_atendimento";
}

const ROTULO_ESTADO: Record<EstadoCockpit, string> = {
  sem_atendimento: "Sem atendimento agora",
  chegou: "Cliente chegou",
  atendimento: "Em atendimento",
  finalizando: "Finalizando",
  finalizado: "Finalizado",
  atrasado: "Atendimento atrasado",
  encaixe: "Encaixe",
};

export function AgendaFocoMobile(props: Props) {
  const agora = useAgora();
  const resumo = resumoDoDia(props.itens, agora);
  const operacionais = useMemo(
    () => props.itens.filter((item) => !TERMINAIS.has(item.status)),
    [props.itens],
  );
  const ativo = operacionais.find((item) => item.status === "na_cadeira");
  const chegou = operacionais.find((item) => item.status === "chegou");
  const atrasado = operacionais.find(
    (item) => item.status === "agendado" && new Date(item.inicio).getTime() < agora,
  );
  const futuro = operacionais.find((item) => new Date(item.fim).getTime() >= agora);
  const principal = ativo ?? chegou ?? atrasado ?? futuro;
  const estado = estadoDoCockpit(principal, agora);
  const proximos = operacionais.filter((item) => item.id !== principal?.id).slice(0, 3);
  const decorrido = ativo
    ? Math.max(
        0,
        Math.floor((agora - new Date(ativo.startedAt ?? ativo.inicio).getTime()) / 60_000),
      )
    : 0;
  const ate = principal ? minutosAte(principal.inicio, agora) : null;
  const desabilitado = !props.online || props.ocupado;

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
          Sair do Modo Foco
        </Button>
        <span className={props.online ? "modo-foco-ao-vivo" : "text-mute"}>
          {props.online ? "Ao vivo" : "Somente leitura"}
        </span>
      </header>

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
          {resumo.faturado ? ` · ${brl(resumo.faturado)}` : ""}
        </p>

        {props.carregando ? (
          <div className="modo-foco-vazio" aria-label="Carregando agenda">
            <div className="w-full max-w-xl"><EsqueletoAgenda linhas={3} /></div>
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
            <div key={`${principal?.id ?? "livre"}-${estado}`} className="modo-foco-estado mov-conteudo-entrada" aria-live="polite">
              <p className={`modo-foco-rotulo modo-foco-rotulo-${estado}`}>
                {ROTULO_ESTADO[estado]}
              </p>
              <p className="modo-foco-contexto">{contexto}</p>

              {principal ? (
                <>
                  <div className="modo-foco-cliente">
                    <time dateTime={principal.inicio}>{hora(principal.inicio, props.fuso)}</time>
                    <div className="min-w-0">
                      <h1>{principal.cliente}</h1>
                      <p>
                        {principal.servico} · {principal.duracaoMin} min
                      </p>
                      {principal.encaixe ? <span>Encaixe</span> : null}
                    </div>
                  </div>

                  {principal.ficha ? (
                    <button
                      type="button"
                      className="modo-foco-observacao"
                      onClick={() => props.onMaisOpcoes(principal)}
                    >
                      <strong>Observação</strong>
                      <span>{principal.ficha}</span>
                    </button>
                  ) : null}

                  {estado === "atendimento" ? (
                    <div
                      className="modo-foco-cronometro"
                      role="timer"
                      aria-label={`${decorrido} minutos em atendimento`}
                    >
                      <span style={{ transform: `scaleX(${Math.min(1, decorrido / Math.max(1, principal.duracaoMin))})` }} />
                    </div>
                  ) : null}

                  <div className="modo-foco-principal">
                    {principal.status === "agendado" ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onChegou(principal)}
                      >
                        <UserRoundCheck /> Cliente chegou
                      </Button>
                    ) : null}
                    {principal.status === "chegou" ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onComecar(principal)}
                      >
                        <Scissors /> Iniciar atendimento
                      </Button>
                    ) : null}
                    {principal.status === "na_cadeira" ? (
                      <Button
                        size="lg"
                        disabled={desabilitado}
                        onClick={() => props.onTerminar(principal)}
                      >
                        <Check /> Finalizar atendimento
                      </Button>
                    ) : null}
                  </div>

                  <div className="modo-foco-secundarias">
                    <Button variant="ghost" onClick={() => props.onMaisOpcoes(principal)}>
                      <MoreHorizontal /> Cliente e outras ações
                    </Button>
                    {principal.status === "na_cadeira" ? (
                      <Button variant="ghost" onClick={() => props.onTerminar(principal)}>
                        Abrir comanda
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
                      <Plus /> Adicionar atendimento
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
                      <button type="button" onClick={() => props.onMaisOpcoes(item)}>
                        <time>{hora(item.inicio, props.fuso)}</time>
                        <span>
                          <strong>{item.cliente}</strong>
                          <small>{item.servico}</small>
                        </span>
                        <StatusBadge status={item.status} />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="modo-foco-sequencia-vazia">Nenhum outro atendimento neste dia.</p>
              )}
              {props.fila && props.onChamarFila ? (
                <Button variant="outline" disabled={desabilitado} onClick={props.onChamarFila}>
                  <ListOrdered /> Chamar fila ({props.fila})
                </Button>
              ) : null}
            </aside>
          </main>
        )}
      </div>
    </section>
  );
}
