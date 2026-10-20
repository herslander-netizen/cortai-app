import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  buscarClientesDaBarbearia,
  trocarClienteDoAgendamento,
  type AgendaItem,
} from "@/lib/barbeiro.functions";

import { agruparPorLetra } from "./ficha-regras";

export type ClienteEscolhido = { id: string; nome: string; telefone: string | null };

/**
 * "Trocar cliente" da ficha, como no Figaro (`ClientSelectorScreen`, APK lido em 18/10): tela
 * cheia "Selecionar cliente", busca, lista por letra com marcação e o botão de confirmar embaixo.
 * O servidor confere se ainda pode trocar e, se a equipe deixar ligado, manda a confirmação do
 * horário ao novo cliente pelo WhatsApp.
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
  const [escolhido, setEscolhido] = useState<ClienteEscolhido | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisar, setAvisar] = useState(true);

  useEffect(() => {
    const espera = window.setTimeout(() => setTermoBusca(termo.trim()), 250);
    return () => window.clearTimeout(espera);
  }, [termo]);
  useEffect(() => {
    if (!aberto) return;
    setTermo("");
    setTermoBusca("");
    setEscolhido(null);
    setErro(null);
    setAvisar(true);
  }, [aberto]);

  const clientes = useQuery({
    queryKey: ["clientes-lista", termoBusca],
    queryFn: () => buscar({ data: { termo: termoBusca, lista: true } }),
    enabled: aberto,
    staleTime: 30_000,
    placeholderData: (anterior) => anterior,
  });
  const grupos = useMemo(() => agruparPorLetra(clientes.data ?? []), [clientes.data]);

  async function confirmar() {
    const cliente = escolhido;
    if (!cliente) return;
    if (cliente.id === item.clienteId) {
      onAberto(false);
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const resultado = await trocar({
        data: { agendamentoId: item.id, clienteId: cliente.id, avisarCliente: avisar },
      });
      onTrocado(cliente);
      onAberto(false);
      if (avisar && !resultado.avisado)
        toast(`Cliente trocado para ${cliente.nome}. A confirmação pelo WhatsApp não saiu.`);
      else
        toast(
          resultado.avisado
            ? `Cliente trocado para ${cliente.nome}. Confirmação enviada pelo WhatsApp.`
            : `Cliente trocado para ${cliente.nome}.`,
        );
      void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
      void queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar o cliente.");
    } finally {
      setSalvando(false);
    }
  }

  const primeiroNome = escolhido?.nome.trim().split(/\s+/)[0] ?? "";

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="right"
        esconderX
        className="agenda-reagendar w-full max-w-none border-0 bg-ink p-0 sm:max-w-[520px]"
      >
        <div className="flex h-full flex-col">
          <header className="agenda-reagendar-topo">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Voltar para a ficha"
              onClick={() => onAberto(false)}
            >
              <ArrowLeft aria-hidden />
            </Button>
            <SheetTitle className="text-xl font-normal text-paper">Selecionar cliente</SheetTitle>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32">
            <SheetDescription className="mb-4 text-[15px] leading-6 text-mute">
              Escolha o cliente deste agendamento. O horário, o serviço e o profissional continuam
              os mesmos.
            </SheetDescription>
            <label className="agenda-lista-busca mb-3">
              <Search aria-hidden className="size-4 shrink-0 text-mute" />
              <Input
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar cliente"
                aria-label="Buscar cliente"
                className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </label>
            <div className="mb-3 flex min-h-12 items-center justify-between gap-4">
              <label htmlFor="avisar-novo-cliente" className="text-sm font-semibold text-paper">
                Avisar o novo cliente por WhatsApp
              </label>
              <Switch id="avisar-novo-cliente" checked={avisar} onCheckedChange={setAvisar} />
            </div>
            {erro ? (
              <p className="mb-3 text-sm font-semibold text-brick" role="alert">
                {erro}
              </p>
            ) : null}

            {clientes.isPending ? (
              <p className="py-6 text-center text-sm text-mute" role="status">
                Carregando clientes…
              </p>
            ) : clientes.isError ? (
              <p className="py-6 text-center text-sm text-mute" role="alert">
                Não deu para carregar os clientes.{" "}
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => void clientes.refetch()}
                >
                  Tentar de novo
                </Button>
              </p>
            ) : grupos.length === 0 ? (
              <p className="py-6 text-center text-sm text-mute" role="status">
                {termoBusca ? "Nenhum cliente encontrado." : "Nenhum cliente ainda."}
              </p>
            ) : (
              <div role="radiogroup" aria-label="Clientes">
                {grupos.map(({ letra, itens }) => (
                  <section key={letra} className="mb-3" aria-label={letra}>
                    <h3 className="agenda-cliente-letra">{letra}</h3>
                    <ul className="agenda-cliente-grupo">
                      {itens.map((c) => {
                        const marcado = escolhido ? escolhido.id === c.id : c.id === item.clienteId;
                        return (
                          <li key={c.id}>
                            <Button
                              type="button"
                              variant="ghost"
                              role="radio"
                              aria-checked={marcado}
                              disabled={salvando}
                              className="agenda-cliente-linha"
                              onClick={() =>
                                setEscolhido({
                                  id: c.id,
                                  nome: c.nome,
                                  telefone: c.telefone ?? null,
                                })
                              }
                            >
                              <span className="min-w-0 flex-1 truncate text-left">{c.nome}</span>
                              <span
                                className={`agenda-cliente-radio ${marcado ? "is-marcado" : ""}`}
                                aria-hidden
                              />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            size="lg"
            disabled={!escolhido || bloqueado || salvando}
            className="agenda-reagendar-salvar"
            onClick={() => void confirmar()}
          >
            <Check aria-hidden />
            <span className="agenda-reagendar-salvar-texto">
              {salvando
                ? "Salvando…"
                : escolhido
                  ? `Trocar · ${primeiroNome}`
                  : "Selecione um cliente"}
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
