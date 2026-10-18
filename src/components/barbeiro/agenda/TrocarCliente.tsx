import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  buscarClientesDaBarbearia,
  trocarClienteDoAgendamento,
  type AgendaItem,
} from "@/lib/barbeiro.functions";

export type ClienteEscolhido = { id: string; nome: string; telefone: string | null };

/**
 * "Trocar Cliente" da ficha, como no Figaro: folha de baixo com a busca de clientes do negócio
 * (os atendidos por último aparecem primeiro). O servidor confere se ainda pode trocar.
 */
export function TrocarCliente({
  item,
  aberto,
  bloqueado,
  onAberto,
  onTrocado,
}: {
  item: AgendaItem;
  aberto: boolean;
  bloqueado: boolean;
  onAberto: (aberto: boolean) => void;
  onTrocado: (cliente: ClienteEscolhido) => void;
}) {
  const buscar = useServerFn(buscarClientesDaBarbearia);
  const trocar = useServerFn(trocarClienteDoAgendamento);
  const queryClient = useQueryClient();
  const [termo, setTermo] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const espera = window.setTimeout(() => setTermoBusca(termo.trim()), 250);
    return () => window.clearTimeout(espera);
  }, [termo]);
  useEffect(() => {
    if (!aberto) return;
    setTermo("");
    setTermoBusca("");
    setErro(null);
  }, [aberto]);

  const clientes = useQuery({
    queryKey: ["clientes-busca", termoBusca],
    queryFn: () => buscar({ data: { termo: termoBusca } }),
    enabled: aberto,
    staleTime: 30_000,
  });

  async function escolher(cliente: ClienteEscolhido) {
    if (cliente.id === item.clienteId) {
      onAberto(false);
      return;
    }
    setErro(null);
    setSalvando(cliente.id);
    try {
      await trocar({ data: { agendamentoId: item.id, clienteId: cliente.id } });
      onTrocado(cliente);
      onAberto(false);
      void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
      void queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível trocar o cliente.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[85dvh] w-full max-w-[520px] flex-col rounded-t-[28px] border-0 bg-ink px-4 pb-6 pt-3"
      >
        <SheetTitle className="mt-4 text-base font-medium text-paper">Trocar Cliente</SheetTitle>
        <SheetDescription className="mb-3 text-sm text-mute">
          O horário, o serviço e o profissional continuam os mesmos.
        </SheetDescription>
        <label className="agenda-lista-busca mb-3">
          <Search aria-hidden className="size-4 shrink-0 text-mute" />
          <Input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            aria-label="Buscar cliente"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </label>
        {erro ? (
          <p className="mb-3 text-sm font-semibold text-brick" role="alert">
            {erro}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {clientes.isPending ? (
            <p className="py-6 text-center text-sm text-mute" role="status">
              Carregando clientes…
            </p>
          ) : clientes.isError ? (
            <p className="py-6 text-center text-sm text-mute" role="alert">
              Não deu para carregar os clientes.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => void clientes.refetch()}>
                Tentar de novo
              </Button>
            </p>
          ) : clientes.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-mute" role="status">
              {termoBusca ? `Nenhum cliente encontrado para “${termoBusca}”.` : "Nenhum cliente."}
            </p>
          ) : (
            <ul className="grid gap-2" aria-label="Clientes">
              {clientes.data.map((c) => {
                const atual = c.id === item.clienteId;
                return (
                  <li key={c.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-pressed={atual}
                      disabled={bloqueado || salvando !== null}
                      className={`agenda-reagendar-profissional ${atual ? "is-escolhido" : ""}`}
                      onClick={() =>
                        void escolher({ id: c.id, nome: c.nome, telefone: c.telefone ?? null })
                      }
                    >
                      <span className="agenda-reagendar-avatar" aria-hidden>
                        <UserRound className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate">{c.nome}</span>
                        {c.telefone ? (
                          <span className="block truncate text-xs font-normal text-mute">
                            {c.telefone}
                          </span>
                        ) : null}
                      </span>
                      {salvando === c.id ? (
                        <span className="text-xs text-mute">Salvando…</span>
                      ) : atual ? (
                        <Check aria-hidden className="size-5" />
                      ) : null}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
