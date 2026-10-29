import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CircleCheck, CircleMinus, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getEquipeDoDia } from "@/lib/barbeiro.functions";

import { FotoDoProfissional } from "./FotoDoProfissional";

type Profissional = { id: string; nome: string; avatarUrl?: string | null };

/**
 * Trocar a agenda na tela, como no Figaro (`AgendaTeamMemberFilterTrigger` + `...FilterSheet`):
 * a foto do profissional na barra de baixo abre a folha "Agenda", com o expediente de hoje de
 * cada pessoa e "Ver minha agenda". O Flow mantém "Toda a equipe" (o Figaro não tinha).
 */
export function FiltroDaAgenda({
  profissionais,
  selecionado,
  meuId,
  hoje,
  onSelecionar,
}: {
  profissionais: Profissional[];
  selecionado: string | null;
  meuId: string | null;
  hoje: string;
  onSelecionar: (id: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  // Com a folha aberta, o "+" da Agenda sai da frente (ele fica acima das folhas).
  useEffect(() => {
    if (!aberto) return;
    document.documentElement.setAttribute("data-filtro-agenda", "");
    return () => document.documentElement.removeAttribute("data-filtro-agenda");
  }, [aberto]);
  const ler = useServerFn(getEquipeDoDia);
  const equipe = useQuery({
    queryKey: ["equipe-do-dia", hoje],
    queryFn: () => ler({ data: { dia: hoje } }),
    enabled: aberto,
    staleTime: 5 * 60_000,
  });
  const atual = profissionais.find((p) => p.id === selecionado) ?? null;
  const escolher = (id: string | null) => {
    onSelecionar(id);
    setAberto(false);
  };
  const expedienteDe = (id: string) => equipe.data?.find((p) => p.id === id)?.expediente ?? null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="agenda-filtro-gatilho"
        aria-label={`Trocar agenda (${atual ? atual.nome : "toda a equipe"})`}
        onClick={() => setAberto(true)}
      >
        {atual ? (
          <FotoDoProfissional
            nome={atual.nome}
            url={atual.avatarUrl}
            className="agenda-filtro-avatar"
          />
        ) : (
          <span className="agenda-filtro-avatar" aria-hidden>
            <UsersRound className="size-5" />
          </span>
        )}
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] border-0 bg-ink px-4 pb-6 pt-3"
        >
          <SheetTitle className="mt-4 text-lg font-bold text-paper">Agenda</SheetTitle>
          <SheetDescription className="mb-4 text-sm text-mute">
            Escolha qual agenda você deseja visualizar.
          </SheetDescription>
          <ul className="agenda-cliente-grupo">
            <li>
              <Button
                type="button"
                variant="ghost"
                aria-pressed={selecionado === null}
                className="agenda-cliente-linha"
                onClick={() => escolher(null)}
              >
                <span className="agenda-reagendar-avatar is-grande" aria-hidden>
                  <UsersRound className="size-5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">Toda a equipe</span>
                {selecionado === null ? <Check aria-hidden className="size-5" /> : null}
              </Button>
            </li>
            {profissionais.map((p) => {
              const expediente = expedienteDe(p.id);
              return (
                <li key={p.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-pressed={selecionado === p.id}
                    className="agenda-cliente-linha"
                    onClick={() => escolher(p.id)}
                  >
                    <FotoDoProfissional
                      nome={p.nome}
                      url={p.avatarUrl}
                      className="agenda-reagendar-avatar is-grande"
                    />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate">{p.nome}</span>
                      {expediente ? (
                        <span
                          className={`agenda-reagendar-expediente ${expediente.trabalha ? "is-trabalha" : ""}`}
                        >
                          {expediente.trabalha ? (
                            <>
                              <CircleCheck aria-hidden className="size-3.5" />
                              Hoje · {expediente.abre} - {expediente.fecha}.
                            </>
                          ) : (
                            <>
                              <CircleMinus aria-hidden className="size-3.5" />
                              Não disponível hoje.
                            </>
                          )}
                        </span>
                      ) : null}
                    </span>
                    {selecionado === p.id ? <Check aria-hidden className="size-5" /> : null}
                  </Button>
                </li>
              );
            })}
          </ul>
          {meuId && meuId !== selecionado ? (
            <Button
              type="button"
              variant="ghost"
              className="agenda-ficha-trocar mt-4 w-full justify-center"
              onClick={() => escolher(meuId)}
            >
              Ver minha agenda
            </Button>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
