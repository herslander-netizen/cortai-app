import { ArrowLeft, Lightbulb, LightbulbOff } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { AlertasFoco } from "@/components/barbeiro/agenda/AlertasFoco";
import { CockpitFoco } from "@/components/barbeiro/agenda/CockpitFoco";
import { alertasDeEmergencia, type AlertaEmergencia } from "@/components/barbeiro/agenda/alertas-foco";
import { dadosDoCockpit } from "@/components/barbeiro/agenda/cockpit-foco";
import { FichaFocoVisual } from "@/components/barbeiro/agenda/FichaFoco";
import { salvarTelaAcesa, telaAcesaInicial } from "@/components/barbeiro/agenda/preferencias";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import { useTelaAcesa } from "@/hooks/useTelaAcesa";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { avisosGuardados } from "@/lib/avisos";
import { consumirAvisosDoFoco, definirModoFoco } from "@/lib/modo-foco";

type Props = {
  fuso: string | undefined;
  itens: AgendaItem[];
  profissional: string | null;
  profissionais: { id: string; nome: string }[];
  podeEscolherProfissional: boolean;
  online: boolean;
  ocupado: boolean;
  carregando: boolean;
  erro: string | null;
  onSair: () => void;
  onProfissional: (id: string) => void;
  onChegou: (item: AgendaItem) => void;
  onComecar: (item: AgendaItem) => void;
  onTerminar: (item: AgendaItem) => void;
  onFalta: (item: AgendaItem) => void;
  onMaisOpcoes: (item: AgendaItem) => void;
  fila?: number;
  onChamarFila?: () => void;
  onNovoAtendimento?: () => void;
  onReceber: (item: AgendaItem) => void;
  pagamentosPendentes: Set<string>;
  onTentarNovamente: () => void;
  discreto?: boolean;
};

function useAlertasPersistentes(props: Pick<Props, "itens" | "online" | "fuso">, agora: number) {
  const anteriores = useRef(props.itens);
  const [guardados, setGuardados] = useState<AlertaEmergencia[]>([]);
  const vibrou = useRef(new Set<string>());
  useEffect(() => {
    const detectados = alertasDeEmergencia({
      itens: props.itens,
      itensAnteriores: anteriores.current,
      agora,
      online: props.online,
      fuso: props.fuso,
    });
    setGuardados((atuais) => {
      const mapa = new Map(atuais.map((alerta) => [alerta.id, alerta]));
      if (props.online) mapa.delete("sem-internet");
      for (const alerta of detectados) mapa.set(alerta.id, alerta);
      return [...mapa.values()].slice(0, 2);
    });
    for (const alerta of detectados) {
      if (alerta.tipo === "sem_internet" || vibrou.current.has(alerta.id)) continue;
      vibrou.current.add(alerta.id);
      navigator.vibrate?.(20);
    }
    anteriores.current = props.itens;
  }, [props.itens, props.online, props.fuso, agora]);
  return {
    alertas: guardados,
    dispensar: (id: string) => setGuardados((atuais) => atuais.filter((alerta) => alerta.id !== id)),
  };
}

export function AgendaFocoMobile(props: Props) {
  const agora = useAgora();
  const dados = useMemo(
    () => dadosDoCockpit(props.itens, agora, props.fuso, props.pagamentosPendentes),
    [props.itens, props.pagamentosPendentes, props.fuso, agora],
  );
  const { alertas, dispensar } = useAlertasPersistentes(props, agora);
  const item = dados.principal;
  const nomeProfissional =
    props.profissionais.find((profissional) => profissional.id === props.profissional)?.nome ??
    item?.profissional ??
    "Profissional";
  useLayoutEffect(() => {
    definirModoFoco(true);
    return () => {
      definirModoFoco(false);
      const total = consumirAvisosDoFoco();
      if (total > 0) avisosGuardados(total);
    };
  }, []);

  const acaoPrincipal = () => {
    if (!item) return props.onNovoAtendimento?.();
    if (dados.estado === "chegou") return props.onComecar(item);
    if (dados.estado === "na_cadeira" || dados.estado === "passou_do_tempo") return props.onTerminar(item);
    if (dados.estado === "receber") return props.onReceber(item);
    return props.onChegou(item);
  };

  return (
    <section className="modo-foco mov-foco-entrada flex min-h-dvh flex-col pb-24" aria-label="Modo Foco da agenda">
      <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-line px-3 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" className="min-h-12 min-w-0 justify-self-start px-1 text-[15px]" onClick={props.onSair}><ArrowLeft /> Agenda</Button>
        <Relogio agora={agora} fuso={props.fuso} />
        <div className="justify-self-end"><LampadaDaTela /></div>
        <p className="col-span-3 truncate pb-2 text-center text-[15px] text-mute">{nomeProfissional} · {dados.concluidos} {dados.concluidos === 1 ? "concluído" : "concluídos"} · {dados.pelaFrente} pela frente</p>
      </header>

      {props.podeEscolherProfissional && props.profissionais.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-3 py-2" aria-label="Profissional">
          {props.profissionais.map((profissional) => (
            <Button key={profissional.id} variant="ghost" className="min-h-12 shrink-0 border border-line" aria-pressed={props.profissional === profissional.id} onClick={() => props.onProfissional(profissional.id)}>{profissional.nome}</Button>
          ))}
        </div>
      ) : null}
      <AlertasFoco alertas={alertas} onDispensar={dispensar} />

      {props.carregando && !props.itens.length ? (
        <div className="grid flex-1 place-content-center text-[15px] text-mute">Carregando agenda…</div>
      ) : props.erro && !props.itens.length ? (
        <div className="grid flex-1 place-content-center gap-3 text-center" role="alert"><strong>Não foi possível carregar a agenda</strong><span className="text-[15px] text-mute">{props.erro}</span><Button variant="outline" onClick={props.onTentarNovamente}>Tentar novamente</Button></div>
      ) : (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-3">
          <CockpitFoco
            dados={dados}
            agora={agora}
            fuso={props.fuso}
            discreto={Boolean(props.discreto)}
            fila={props.fila}
            onPrincipal={acaoPrincipal}
            onMais={() => item && props.onMaisOpcoes(item)}
            onFalta={() => item && props.onFalta(item)}
            onRemarcar={() => item && props.onMaisOpcoes(item)}
            onAvisar={(alvo) => {
              const texto = `Oi, ${alvo.cliente.split(" ")[0]}! Estou terminando um atendimento e devo atrasar uns 10 min. Já te chamo.`;
              const numero = alvo.telefone?.replace(/\D/g, "");
              if (numero) window.open(`https://wa.me/${numero.length <= 11 ? `55${numero}` : numero}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
            }}
            onChamarFila={props.onChamarFila}
            ficha={item ? <FichaFocoVisual preferencias={item.preferencias ?? {}} observacao={item.ficha} discreto={Boolean(props.discreto)} onAbrir={() => props.onMaisOpcoes(item)} /> : null}
          />
        </div>
      )}
    </section>
  );
}

function Relogio({ agora, fuso }: { agora: number; fuso?: string }) {
  return <time className="text-2xl font-extrabold tabular-nums text-paper">{new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso })}</time>;
}

function LampadaDaTela() {
  const [suporte, setSuporte] = useState(false);
  const [ligada, setLigada] = useState(true);
  useEffect(() => {
    setSuporte(typeof navigator !== "undefined" && "wakeLock" in navigator);
    setLigada(telaAcesaInicial());
  }, []);
  useTelaAcesa(ligada);
  if (!suporte) return null;
  return <Button variant="ghost" size="icon" className="size-12 text-mute" aria-label="Manter tela acesa" aria-pressed={ligada} onClick={() => { setLigada(!ligada); salvarTelaAcesa(!ligada); }}>{ligada ? <Lightbulb aria-hidden /> : <LightbulbOff aria-hidden />}</Button>;
}