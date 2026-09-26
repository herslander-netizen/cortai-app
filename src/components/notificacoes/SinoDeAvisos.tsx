import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getSessao } from "@/lib/sessao.functions";
import { agrupar, listarNotificacoes, marcarComoLida, marcarTodasComoLidas, type Notificacao } from "@/lib/notificacoes";
import { molaFolha, transicaoBase } from "@/lib/motion";
import { useMenosMovimento } from "@/hooks/useMovimento";

function quando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function SinoDeAvisos() {
  const [aberto, setAberto] = useState(false);
  const [pulsar, setPulsar] = useState(false);
  const menosMovimento = useMenosMovimento();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const montado = useRef(false);

  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300000 });
  const tenantId = sessao?.tenantId ?? null;

  const { data: avisos } = useQuery({
    queryKey: ["notificacoes", tenantId],
    queryFn: () => listarNotificacoes(tenantId!),
    enabled: !!tenantId,
    staleTime: 30000,
  });

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const canal = supabase
      .channel(`avisos-${tenantId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `tenant_id=eq.${tenantId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
          setPulsar(true);
          setTimeout(() => montado.current && setPulsar(false), 1200);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tenantId, queryClient]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fechar);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!tenantId) return null;

  const lista = avisos ?? [];
  const naoLidas = lista.filter((a) => !a.lida_em).length;

  async function abrirAviso(aviso: Notificacao) {
    setAberto(false);
    if (!aviso.lida_em) {
      try {
        await marcarComoLida(aviso.id);
        void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
      } catch {
        /* silencioso: navegar é mais importante que marcar */
      }
    }
    if (aviso.link) void navigate({ to: aviso.link as never });
  }

  const conteudo = (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-paper">Avisos</p>
          <p className="text-xs text-mute2">{naoLidas ? `${naoLidas} não lidos` : "tudo lido"}</p>
        </div>
        <div className="flex items-center gap-3">
          {naoLidas ? (
            <button
              type="button"
              className="text-xs text-gold"
              onClick={async () => {
                await marcarTodasComoLidas(tenantId!);
                void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
              }}
            >
              Marcar todas como lidas
            </button>
          ) : null}
          <button type="button" aria-label="Fechar avisos" onClick={() => setAberto(false)} className="text-mute">
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lista.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-mute">Tudo em dia por aqui.</p>
        ) : (
          agrupar(lista).map((grupo) => (
            <section key={grupo.rotulo}>
              <p className="px-5 pb-1 pt-4 text-xs uppercase tracking-wide text-mute2">{grupo.rotulo}</p>
              <ul>
                {grupo.itens.map((aviso) => (
                  <li key={aviso.id} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => void abrirAviso(aviso)}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3 text-left transition-transform duration-100 active:scale-[0.99] active:bg-ink3"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${aviso.lida_em ? "bg-transparent" : "bg-gold"}`}
                      />
                      <span className="min-w-0">
                        <span className={`block text-sm ${aviso.lida_em ? "text-mute" : "font-semibold text-paper"}`}>
                          {aviso.titulo}
                        </span>
                        {aviso.corpo ? <span className="block truncate text-xs text-mute2">{aviso.corpo}</span> : null}
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
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={naoLidas ? `Avisos, ${naoLidas} não lidos` : "Avisos"}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-mute transition-colors hover:border-gold hover:text-gold ${
          pulsar && !menosMovimento ? "animate-pulse border-gold text-gold" : ""
        }`}
      >
        <Bell size={17} strokeWidth={1.7} aria-hidden />
        {naoLidas ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-ink">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        ) : null}
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {aberto ? (
                <motion.div
                  className="fixed inset-0 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transicaoBase}
                >
                  <div className="absolute inset-0 bg-paper/45" onClick={() => setAberto(false)} />
                  <motion.div
                    role="dialog"
                    aria-label="Central de avisos"
                    drag={menosMovimento ? false : "y"}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.4 }}
                    onDragEnd={(_, info) => info.offset.y > 90 && setAberto(false)}
                    initial={menosMovimento ? { opacity: 0 } : { y: "100%" }}
                    animate={menosMovimento ? { opacity: 1 } : { y: 0 }}
                    exit={menosMovimento ? { opacity: 0 } : { y: "100%" }}
                    transition={molaFolha}
                    className="management-popover absolute inset-x-0 bottom-0 overflow-hidden rounded-t-2xl border border-line bg-ink2 md:inset-x-auto md:bottom-auto md:right-6 md:top-6 md:w-[380px] md:rounded-2xl"
                  >
                    <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
                    {conteudo}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
