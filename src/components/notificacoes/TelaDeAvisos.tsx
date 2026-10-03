import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCheck } from "lucide-react";

import { agrupar, type Notificacao } from "@/lib/notificacoes";
import { ConvitesNoSino } from "@/components/notificacoes/ConvitesNoSino";
import { useMenosMovimento } from "@/hooks/useMovimento";

function quando(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Notificações em tela cheia no celular, com abas "Não lidas" e "Todas". */
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
  const [aba, setAba] = useState<"nao_lidas" | "todas">("nao_lidas");
  const menos = useMenosMovimento();
  const temNaoLidas = lista.some((a) => !a.lida_em);
  const visiveis =
    aba === "todas" ? lista : lista.filter((a) => !a.lida_em || naoLidasAoAbrir.has(a.id));

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-notificacoes"
      className="fixed inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)]"
      initial={menos ? { opacity: 0 } : { x: "100%" }}
      animate={menos ? { opacity: 1 } : { x: 0 }}
      exit={menos ? { opacity: 0 } : { x: "100%" }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
    >
      <div className="flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          aria-label="Voltar"
          onClick={onVoltar}
          className="grid size-12 place-items-center text-mute"
        >
          <ArrowLeft size={22} />
        </button>
        {temNaoLidas ? (
          <button
            type="button"
            aria-label="Marcar todas como lidas"
            onClick={onMarcarTodas}
            className="grid size-12 place-items-center text-mute"
          >
            <CheckCheck size={22} />
          </button>
        ) : null}
      </div>
      <h1 id="titulo-notificacoes" className="px-5 pb-4 text-3xl font-semibold text-paper">
        Notificações
      </h1>
      <div className="grid grid-cols-2 gap-2 px-5 pb-3" role="tablist">
        {(
          [
            ["nao_lidas", "Não lidas"],
            ["todas", "Todas"],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`min-h-12 rounded-full text-sm font-medium ${
              aba === id ? "bg-primary text-primary-foreground" : "bg-card text-paper"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <ConvitesNoSino />
        {visiveis.length === 0 ? (
          <div className="px-5 py-8 text-left">
            <p className="text-base font-semibold text-paper">
              {aba === "nao_lidas" ? "Tudo em dia!" : "Nada por aqui ainda"}
            </p>
            <p className="mt-1 text-sm text-mute">
              {aba === "nao_lidas"
                ? "Nenhuma notificação não lida. Volte mais tarde para atualizações sobre seus agendamentos."
                : "Avisos de agendamentos, confirmações e fila aparecem aqui."}
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
                    <button
                      type="button"
                      onClick={() => onAbrir(aviso)}
                      className="grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3 text-left active:bg-card"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${aviso.lida_em ? "bg-transparent" : "bg-gold"}`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm ${aviso.lida_em ? "text-mute" : "font-semibold text-paper"}`}
                        >
                          {aviso.titulo}
                        </span>
                        {aviso.corpo ? (
                          <span className="block truncate text-xs text-mute2">{aviso.corpo}</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-mute2">{quando(aviso.criado_em)}</span>
                    </button>
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
