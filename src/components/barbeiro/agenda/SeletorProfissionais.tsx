import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";

type Profissional = { id: string; nome: string; avatarUrl?: string | null };

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function SeletorProfissionais({
  profissionais,
  itens,
  selecionado,
  onSelecionar,
}: {
  profissionais: Profissional[];
  itens: AgendaItem[];
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
}) {
  return (
    <div
      className="-mx-5 mt-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]"
      role="group"
      aria-label="Agenda da equipe"
    >
      <div className="flex w-max gap-2">
        <Button
          variant="ghost"
          aria-pressed={selecionado === null}
          className={`min-h-14 shrink-0 gap-2 rounded-full border px-3 ${
            selecionado === null ? "border-primary bg-primary/10 text-paper" : "border-line text-mute"
          }`}
          onClick={() => onSelecionar(null)}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink3">
            <UsersRound className="size-4" aria-hidden />
          </span>
          <span className="text-left">
            <strong className="block text-sm">Todos</strong>
            <small className="block text-xs font-medium">Equipe</small>
          </span>
        </Button>
        {profissionais.map((profissional) => {
          const emAtendimento = itens.some(
            (item) => item.profissionalId === profissional.id && item.status === "na_cadeira",
          );
          return (
            <Button
              key={profissional.id}
              variant="ghost"
              aria-pressed={selecionado === profissional.id}
              aria-label={`${profissional.nome}, ${emAtendimento ? "em atendimento" : "livre"}`}
              className={`min-h-14 shrink-0 gap-2 rounded-full border px-3 ${
                selecionado === profissional.id
                  ? "border-primary bg-primary/10 text-paper"
                  : "border-line text-mute"
              }`}
              onClick={() => onSelecionar(profissional.id)}
            >
              {profissional.avatarUrl ? (
                <img
                  src={profissional.avatarUrl}
                  alt=""
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink3 text-xs font-bold text-paper">
                  {iniciais(profissional.nome)}
                </span>
              )}
              <span className="max-w-36 min-w-0 text-left">
                <strong className="block truncate text-sm">{profissional.nome}</strong>
                <small
                  className={`block text-xs font-medium ${emAtendimento ? "text-status-active" : "text-sage"}`}
                >
                  {emAtendimento ? "Em atendimento" : "Livre"}
                </small>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}