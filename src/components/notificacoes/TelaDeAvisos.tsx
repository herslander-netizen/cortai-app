import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCheck } from "lucide-react";

import {
  agrupar,
  tipoDoFiltro,
  valoresEmReais,
  type FiltroDeAvisos,
  type Notificacao,
} from "@/lib/notificacoes";
import { ConvitesNoSino } from "@/components/notificacoes/ConvitesNoSino";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { Button } from "@/components/ui/button";

function quando(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Notificações em tela cheia no celular, com os filtros do Figaro: Todas, Não lidas, Agendamentos e Clientes. */
export function TelaDeAvisos({
  lista,
  naoLidasAoAbrir,
  onVoltar,
  onAbrir,
  onMarcarTodas,
}: {
  lista: Notificacao[];
  /** Ids não lidos no momento em que a tela abriu: continuam em "Não lidas" até sair. */
  naoLidasAoAbrir: ReadonlySet<string>;
  onVoltar: () => void;
  onAbrir: (aviso: Notificacao) => void;
  onMarcarTodas: () => void;
}) {
  const [aba, setAba] = useState<FiltroDeAvisos>("nao_lidas");
  const menos = useMenosMovimento();
  const temNaoLidas = lista.some((a) => !a.lida_em);
  const naoLidas = lista.filter((a) => !a.lida_em).length;
  const visiveis =
    aba === "todas"
      ? lista
      : aba === "nao_lidas"
        ? lista.filter((a) => !a.lida_em || naoLidasAoAbrir.has(a.id))
        : lista.filter((a) => tipoDoFiltro(a.tipo) === aba);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-notificacoes"
      // Acima das ações fixas da Agenda (z 60): o "+" e o "Agora" não podem ficar por cima das notificações.
      className="fixed inset-0 z-[70] flex flex-col bg-background pt-[env(safe-area-inset-top)]"
      initial={menos ? { opacity: 0 } : { x: "100%" }}
      animate={menos ? { opacity: 1 } : { x: 0 }}
      exit={menos ? { opacity: 0 } : { x: "100%" }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
    >
      <div className="flex items-center justify-between px-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          aria-label="Voltar"
          onClick={onVoltar}
          className="size-12 p-0 text-mute"
        >
          <ArrowLeft size={22} />
        </Button>
        {temNaoLidas ? (
          <Button
            type="button"
            variant="ghost"
            aria-label="Marcar todas como lidas"
            onClick={onMarcarTodas}
            className="size-12 p-0 text-mute"
          >
            <CheckCheck size={22} />
          </Button>
        ) : null}
      </div>
      <h1 id="titulo-notificacoes" className="px-5 pb-4 text-3xl font-semibold text-paper">
        Notificações
      </h1>
      <div
        className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none]"
        role="tablist"
        aria-label="Filtrar notificações"
      >
        {(
          [
            ["todas", "Todas"],
            ["nao_lidas", naoLidas ? `Não lidas · ${naoLidas}` : "Não lidas"],
            ["agendamentos", "Agendamentos"],
            ["clientes", "Clientes"],
          ] as const
        ).map(([id, rotulo]) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`h-auto min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium ${
              aba === id ? "bg-primary text-primary-foreground" : "bg-card text-paper"
            }`}
          >
            {rotulo}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <ConvitesNoSino />
        {visiveis.length === 0 ? (
          <div className="px-5 py-8 text-left">
            <p className="text-base font-semibold text-paper">
              {aba === "nao_lidas"
                ? "Tudo em dia!"
                : aba === "todas"
                  ? "Nenhuma notificação ainda"
                  : "Nada por aqui"}
            </p>
            <p className="mt-1 text-sm text-mute">
              {aba === "nao_lidas"
                ? "Nenhuma notificação não lida. Volte mais tarde para atualizações sobre seus agendamentos."
                : aba === "todas"
                  ? "Avisos de agendamentos, confirmações e fila aparecem aqui."
                  : aba === "agendamentos"
                    ? "Novos agendamentos, remarcações, cancelamentos e lembretes aparecem aqui."
                    : "Novos clientes e avaliações aparecem aqui."}
            </p>
          </div>
        ) : (
          agrupar(visiveis).map((grupo) => (
            <section key={grupo.rotulo}>
              <p className="px-5 pb-1 pt-4 text-xs uppercase tracking-wide text-mute2">
                {grupo.rotulo}
              </p>
              <ul>
                {grupo.itens.map((aviso) => (
                  <li key={aviso.id} className="border-b border-line">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onAbrir(aviso)}
                      className="h-auto min-h-14 w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 whitespace-normal px-5 py-3 text-left active:bg-card"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${aviso.lida_em ? "bg-transparent" : "bg-gold"}`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`line-clamp-2 break-words text-sm ${aviso.lida_em ? "text-mute" : "font-semibold text-paper"}`}
                        >
                          {aviso.titulo}
                        </span>
                        {aviso.corpo ? (
                          <span className="block truncate text-xs text-mute2">
                            {valoresEmReais(aviso.corpo)}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-mute2">
                        {quando(aviso.criado_em)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </motion.div>
  );
}
