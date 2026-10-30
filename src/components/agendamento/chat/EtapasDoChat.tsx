import { CalendarDays, Clock3, Image as ImageIcon, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgendaPublica } from "@/lib/agendamento-publico.functions";
import { diaPorExtenso, TEXTOS_CONVERSA, textoConfirmarDia } from "@/lib/conversa/respostas";
import { brl } from "@/lib/format";
import { Fala } from "./BolhasDaConversa";
import type { Selecao } from "./tipos";
import type { useConversaAgendamento } from "./useConversaAgendamento";

type Conversa = ReturnType<typeof useConversaAgendamento>;

function cascata(indice: number) {
  return indice < 6
    ? { className: "chat-slot", style: { animationDelay: `${indice * 30}ms` } }
    : { className: "", style: {} };
}

export function EtapaServico({ data, selecao }: { data: AgendaPublica; selecao: Selecao }) {
  // Sem nenhuma foto de serviço, o cartão fica compacto: um quadro cinza vazio ocupava metade da tela.
  const comFotos = data.servicos.some((s) => s.foto_url);
  return (
    <Fala>
      <p className="mb-3">{TEXTOS_CONVERSA.servico}</p>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.servicos.map((s, i) => (
          <Button
            key={s.id}
            type="button"
            variant="ghost"
            className={`chat-card-servico h-auto shrink-0 snap-start flex-col items-stretch p-0 text-left ${comFotos ? "w-40" : "w-44"} ${cascata(i).className}`}
            style={cascata(i).style}
            aria-pressed={selecao.servicoId === s.id}
            onClick={() => selecao.setServicoId(s.id)}
          >
            {comFotos ? (
              <span className="grid aspect-[4/5] w-full place-items-center overflow-hidden bg-ink3">
                {s.foto_url ? (
                  <img
                    src={s.foto_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-mute" aria-hidden />
                )}
              </span>
            ) : null}
            <span className="block w-full p-3">
              <strong className="block truncate text-sm font-extrabold text-paper">{s.nome}</strong>
              <span className="mt-1 flex items-center justify-between gap-2 text-xs text-mute">
                <span className="flex items-center gap-1">
                  <Clock3 size={12} aria-hidden />
                  {s.duracao_min} min
                </span>
                <span className="font-extrabold text-paper">{brl(s.preco_centavos)}</span>
              </span>
            </span>
          </Button>
        ))}
      </div>
    </Fala>
  );
}

export function EtapaProfissional({ selecao, conversa }: { selecao: Selecao; conversa: Conversa }) {
  return (
    <Fala>
      <p className="mb-3">{TEXTOS_CONVERSA.profissional}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-14 justify-start"
          onClick={() => conversa.escolherProfissional("qualquer")}
        >
          <UserRound />
          Não tenho preferência
        </Button>
        {selecao.aptos.map((p, i) => (
          <Button
            key={p.id}
            variant="outline"
            className={`h-14 justify-start ${cascata(i + 1).className}`}
            style={cascata(i + 1).style}
            onClick={() => conversa.escolherProfissional(p.id)}
          >
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-ink3" aria-hidden>
                {p.nome[0]}
              </span>
            )}
            {p.nome}
          </Button>
        ))}
      </div>
    </Fala>
  );
}

export function EtapaDia({ selecao, conversa }: { selecao: Selecao; conversa: Conversa }) {
  const { confirmarDia } = conversa;
  if (confirmarDia) {
    return (
      <Fala>
        <p className="mb-3">{textoConfirmarDia(confirmarDia.rotulo, confirmarDia.dia)}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-12 rounded-full px-4"
            disabled={!selecao.dias.includes(confirmarDia.dia)}
            onClick={() => {
              conversa.escolherDia(confirmarDia.dia);
              conversa.setConfirmarDia(null);
            }}
          >
            Sim
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-full px-4"
            onClick={() => conversa.setConfirmarDia(null)}
          >
            Outro dia
          </Button>
        </div>
      </Fala>
    );
  }
  const proximoDia = selecao.dias.find((d) => (selecao.porDia.get(d)?.opcoes.length ?? 0) > 0);
  const proximo = proximoDia ? selecao.porDia.get(proximoDia)?.opcoes[0] : undefined;
  return (
    <Fala>
      <p className="mb-3">{TEXTOS_CONVERSA.dia}</p>
      {proximoDia && proximo ? (
        <Button
          variant="outline"
          className="mb-3 h-12 rounded-full px-4"
          onClick={() => {
            conversa.escolherDia(proximoDia);
            selecao.setInicio(proximo.iso);
          }}
        >
          Próximo: {diaPorExtenso(proximoDia)} {proximo.label}
        </Button>
      ) : null}
      <div className="flex max-w-full snap-x gap-2 overflow-x-auto pb-2">
        {selecao.dias.map((d, i) => {
          const livre = (selecao.porDia.get(d)?.opcoes.length ?? 0) > 0;
          return (
            <Button
              key={d}
              variant="outline"
              className={`chat-date-option h-16 min-w-24 shrink-0 snap-start flex-col ${cascata(i).className}`}
              style={cascata(i).style}
              disabled={!livre}
              aria-label={`${diaPorExtenso(d)}${livre ? "" : ", lotado"}`}
              onClick={() => conversa.escolherDia(d)}
            >
              <CalendarDays size={15} aria-hidden />
              <span className="text-xs">{diaPorExtenso(d)}</span>
              {!livre ? <small className="text-xs">Lotado</small> : null}
            </Button>
          );
        })}
      </div>
    </Fala>
  );
}
