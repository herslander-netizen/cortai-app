import { useEffect, useRef } from "react";

import { hojeNoFuso } from "@/lib/horarios";

import {
  contextoParaRestaurar,
  lerContextoAgenda,
  salvarContextoAgenda,
  type ContextoAgenda,
} from "./preferencias";

const rolagemTimeline = () => document.querySelector<HTMLElement>(".agenda-timeline-scroll");

/** Contexto guardado nesta aba, se ainda valer (mesmo dia no fuso do negócio, < 30 min, sem link de aviso). */
export function contextoInicialDaAgenda(temLinkDeAviso: boolean) {
  const c = lerContextoAgenda();
  return contextoParaRestaurar(c, { ms: Date.now(), hoje: hojeNoFuso(c?.fuso), temLinkDeAviso });
}

function rolarPara(janela: number, timeline: number) {
  window.scrollTo({ top: janela, behavior: "auto" });
  const area = rolagemTimeline();
  if (area) area.scrollTop = timeline;
}

/**
 * Guarda dia, visualização e rolagem na sessão da aba; restaura a rolagem uma vez
 * quando a Agenda fica pronta e devolve a posição ao sair do Modo Foco.
 */
export function useLugarDaAgenda(o: {
  dia: string;
  visualizacao: ContextoAgenda["visualizacao"];
  fuso: string;
  foco: boolean;
  pronto: boolean;
  restaurado: ContextoAgenda | null;
}) {
  const rolagem = useRef({ janela: 0, timeline: 0 });
  const dados = useRef(o);
  dados.current = o;

  useEffect(() => {
    if (o.foco) return;
    let quadro = 0;
    const guardar = () => {
      const d = dados.current;
      salvarContextoAgenda({
        dia: d.dia,
        visualizacao: d.visualizacao,
        rolagemJanela: rolagem.current.janela,
        rolagemTimeline: rolagem.current.timeline,
        hoje: hojeNoFuso(d.fuso),
        salvoEm: Date.now(),
        fuso: d.fuso,
      });
    };
    const aoRolar = () => {
      if (quadro) return;
      quadro = window.requestAnimationFrame(() => {
        quadro = 0;
        rolagem.current = { janela: window.scrollY, timeline: rolagemTimeline()?.scrollTop ?? 0 };
        guardar();
      });
    };
    guardar();
    window.addEventListener("scroll", aoRolar, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar, { capture: true });
      if (quadro) window.cancelAnimationFrame(quadro);
    };
  }, [o.dia, o.visualizacao, o.fuso, o.foco]);

  // Restaura a rolagem guardada uma única vez, depois do posicionamento automático.
  const restaurou = useRef(false);
  useEffect(() => {
    if (restaurou.current || !o.pronto || o.foco || !o.restaurado) return;
    restaurou.current = true;
    const { rolagemJanela, rolagemTimeline: t } = o.restaurado;
    rolagem.current = { janela: rolagemJanela, timeline: t };
    const id = window.setTimeout(() => rolarPara(rolagemJanela, t), 80);
    return () => window.clearTimeout(id);
  }, [o.pronto, o.foco, o.restaurado]);

  // Ao sair do Modo Foco, volta à mesma posição de antes.
  const focoAntes = useRef(o.foco);
  useEffect(() => {
    const saiu = focoAntes.current && !o.foco;
    focoAntes.current = o.foco;
    if (!saiu) return;
    const { janela, timeline } = rolagem.current;
    const id = window.setTimeout(() => rolarPara(janela, timeline), 80);
    return () => window.clearTimeout(id);
  }, [o.foco]);
}
