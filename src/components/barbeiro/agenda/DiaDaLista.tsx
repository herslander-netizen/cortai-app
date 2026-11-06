/**
 * Um dia da lista da Agenda: cabeçalho, "N na espera" (lista de espera) e os horários com o marcador da hora atual em
 * hoje (dono, 06/11/2026). Separado do `ListaPeriodo` para cada arquivo ficar abaixo de 300 linhas.
 */
import { Fragment } from "react";
import { CalendarX } from "lucide-react";

import type { AgendaItem } from "@/lib/barbeiro.functions";
import type { termos } from "@/lib/segmentos";

import { EsperaNaOnda } from "./EsperaNaLista";
import { HorarioDaLista, OndaDaLista } from "./HorarioDaLista";
import { agruparPorHorario, posicaoDoAgora } from "./lista-horarios";
import { hora } from "./tempo";

export function DiaDaLista({
  dia,
  itens,
  titulo,
  resumo,
  ehHoje,
  primeiro,
  fuso,
  agora,
  comBusca,
  segmento,
  discreto,
  mostrarProfissional,
  selecionado,
  naEspera,
  onEspera,
  ofertas,
  onAbrir,
}: {
  dia: string;
  itens: AgendaItem[];
  titulo: { curto: string; abreviado: string; semana: string };
  resumo: string;
  ehHoje: boolean;
  /** Primeiro dia da lista: os cartões entram em cascata. */
  primeiro: boolean;
  fuso: string;
  agora: number;
  comBusca: boolean;
  segmento: Parameters<typeof termos>[0];
  discreto: boolean;
  mostrarProfissional: boolean;
  selecionado: string | null;
  naEspera: number;
  onEspera: () => void;
  ofertas: Readonly<Record<string, { cliente: string; expiraEm: string }>> | undefined;
  onAbrir: (item: AgendaItem) => void;
}) {
  return (
    <section className="agenda-lista-dia" aria-label={`${titulo.curto} ${titulo.semana}`}>
      <header className="agenda-lista-dia-titulo" data-hoje-dia={ehHoje || undefined}>
        <h3>
          <strong>{titulo.abreviado}</strong>
          <span>{titulo.semana}</span>
          {ehHoje ? <span data-hoje>Hoje</span> : null}
        </h3>
        <span className="agenda-lista-dia-resumo">{resumo}</span>
      </header>
      {(() => {
        return naEspera > 0 && !comBusca ? (
          <EsperaNaOnda total={naEspera} onAbrir={onEspera} />
        ) : null;
      })()}
      {itens.length === 0 ? (
        <div className="agenda-lista-linha">
          <span aria-hidden />
          <p className="agenda-lista-vazio">
            <CalendarX aria-hidden />
            Nada marcado
          </p>
        </div>
      ) : null}
      {(() => {
        // Atendimentos do mesmo horário juntos, ligados por um trilho fino (dono, 06/11).
        const horarios = agruparPorHorario(itens, (inicio) => hora(inicio, fuso));
        const posAgora = ehHoje && !comBusca ? posicaoDoAgora(horarios, new Date(agora)) : -1;
        const marcadorAgora = (
          <OndaDaLista
            key="agora"
            rotulo={hora(new Date(agora).toISOString(), fuso)}
            rotuloAcessivel={`Agora, ${hora(new Date(agora).toISOString(), fuso)}`}
          />
        );
        let antes = 0;
        return horarios.map((grupo, h) => {
          const desde = antes;
          antes += grupo.itens.length;
          return (
            <Fragment key={grupo.inicio}>
              {h === posAgora ? marcadorAgora : null}
              <HorarioDaLista
                itens={grupo.itens}
                fuso={fuso}
                ehHoje={ehHoje}
                agora={agora}
                segmento={segmento}
                discreto={discreto}
                mostrarProfissional={mostrarProfissional}
                selecionado={selecionado}
                tituloCurto={titulo.curto}
                cascataDesde={primeiro ? desde : null}
                ofertas={ofertas}
                onAbrir={onAbrir}
              />
              {h === horarios.length - 1 && posAgora === horarios.length ? marcadorAgora : null}
            </Fragment>
          );
        });
      })()}
    </section>
  );
}
