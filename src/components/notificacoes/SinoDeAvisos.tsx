import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getSessao } from "@/lib/sessao.functions";
import {
  agrupar,
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  type Notificacao,
} from "@/lib/notificacoes";
import { mostrarAviso } from "@/lib/avisos-do-navegador";
import { molaFolha, transicaoBase, transicaoRapida } from "@/lib/motion";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { Button } from "@/components/ui/button";
import { ConvitesNoSino } from "@/components/notificacoes/ConvitesNoSino";
import { guardarAvisoDoFoco, modoFocoAtivo } from "@/lib/modo-foco";
import { useMediaQuery } from "@/hooks/use-mobile";
import { TelaDeAvisos } from "@/components/notificacoes/TelaDeAvisos";
import {
  chaveVisto,
  contarNaoVistos,
  criarControleDeToque,
  gravarVisto,
  lerVisto,
  rotuloDoSino,
} from "@/lib/sino-avisos";

function quando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function SinoDeAvisos() {
  const [aberto, setAberto] = useState(false);
  const [toque, setToque] = useState(0);
  const [ultimoVistoEm, setUltimoVistoEm] = useState<number | null>(null);
  const tituloOriginal = useRef<string | null>(null);
  const menosMovimento = useMenosMovimento();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const montado = useRef(false);
  const celular = useMediaQuery("(max-width: 767px)");
  const [naoLidasAoAbrir, setNaoLidasAoAbrir] = useState<ReadonlySet<string>>(new Set());

  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
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

  // "Visto" por negócio + usuário. Primeiro acesso: tudo que já existe conta como visto.
  const chave = tenantId && sessao?.userId ? chaveVisto(tenantId, sessao.userId) : null;
  useEffect(() => {
    if (!chave) return;
    const gravado = lerVisto(chave);
    if (gravado != null) setUltimoVistoEm(gravado);
    else {
      const agora = Date.now();
      gravarVisto(chave, agora);
      setUltimoVistoEm(agora);
    }
  }, [chave]);

  // Toque único: só por INSERT em tempo real; rajada = uma animação.
  const controleToque = useRef(criarControleDeToque());
  const toquePendente = useRef(false);
  const estadoRef = useRef({ aberto, menosMovimento });
  estadoRef.current = { aberto, menosMovimento };
  const tocarRef = useRef<() => void>(() => {});
  tocarRef.current = () => {
    const abaOculta = typeof document !== "undefined" && document.hidden;
    if (abaOculta) {
      toquePendente.current = true;
      return;
    }
    if (
      controleToque.current.pedir({
        centralAberta: estadoRef.current.aberto,
        menosMovimento: estadoRef.current.menosMovimento,
        abaOculta: false,
      })
    ) {
      setToque((t) => t + 1);
    }
  };
  useEffect(() => {
    const visivel = () => {
      if (!document.hidden && toquePendente.current) {
        toquePendente.current = false;
        tocarRef.current();
      }
    };
    document.addEventListener("visibilitychange", visivel);
    return () => document.removeEventListener("visibilitychange", visivel);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const canal = supabase
      .channel(`avisos-${tenantId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
          const novo = payload.new as Partial<Notificacao> | undefined;
          if (modoFocoAtivo()) {
            guardarAvisoDoFoco();
            return;
          }
          if (novo?.titulo) mostrarAviso(novo.titulo, novo.corpo ?? null, novo.link ?? null);
          tocarRef.current();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tenantId, queryClient]);

  const fecharRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && fecharRef.current();
    window.addEventListener("keydown", fechar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fechar);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  useEffect(() => {
    const abrir = () => abrirCentralRef.current();
    window.addEventListener("cortai:abrir-avisos", abrir);
    return () => window.removeEventListener("cortai:abrir-avisos", abrir);
  }, []);

  // Celular: tela cheia com entrada no histórico (voltar do Android fecha e volta ao mesmo ponto).
  useEffect(() => {
    if (!aberto || !celular) return;
    const voltar = () => setAberto(false);
    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, [aberto, celular]);

  const abrirCentralRef = useRef<() => void>(() => {});
  abrirCentralRef.current = () => {
    if (aberto) return;
    setNaoLidasAoAbrir(new Set((avisos ?? []).filter((a) => !a.lida_em).map((a) => a.id)));
    if (chave) {
      const agora = Date.now();
      gravarVisto(chave, agora);
      setUltimoVistoEm(agora);
    }
    if (celular) window.history.pushState({ ...window.history.state, avisos: true }, "");
    setAberto(true);
  };
  function fecharCentral() {
    if (celular && window.history.state?.avisos) window.history.back();
    else setAberto(false);
  }
  fecharRef.current = fecharCentral;

  const lista = avisos ?? [];
  const naoLidas = lista.filter((a) => !a.lida_em).length;
  const naoVistos = contarNaoVistos(lista, ultimoVistoEm);

  // Título da aba e badge do app instalado seguem a mesma contagem do sino.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (tituloOriginal.current == null)
      tituloOriginal.current = document.title.replace(/^\(\d+\+?\) /, "");
    const base = tituloOriginal.current;
    document.title = naoVistos > 0 ? `(${naoVistos > 9 ? "9+" : naoVistos}) ${base}` : base;
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      if (naoVistos > 0) void nav.setAppBadge?.(naoVistos)?.catch(() => {});
      else void nav.clearAppBadge?.()?.catch(() => {});
    } catch {
      /* sem suporte */
    }
  }, [naoVistos]);
  useEffect(
    () => () => {
      if (tituloOriginal.current != null) document.title = tituloOriginal.current;
    },
    [],
  );

  if (!tenantId) return null;

  async function abrirAviso(aviso: Notificacao) {
    fecharCentral();
    if (!aviso.lida_em) {
      try {
        await marcarComoLida(aviso.id);
        void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
      } catch {
        /* silencioso: navegar é mais importante que marcar */
      }
    }
    if (aviso.link?.startsWith("https://wa.me/")) {
      window.open(aviso.link, "_blank", "noopener,noreferrer");
    } else if (aviso.link) void navigate({ to: aviso.link as never });
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
            <Button
              variant="text"
              type="button"
              className="h-12 px-2 text-xs text-gold"
              onClick={async () => {
                await marcarTodasComoLidas(tenantId!);
                void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
              }}
            >
              Marcar todas como lidas
            </Button>
          ) : null}
          <Button
            variant="icon"
            size="icon"
            type="button"
            aria-label="Fechar avisos"
            onClick={() => setAberto(false)}
            className="h-12 w-12 text-mute"
          >
            <X size={17} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConvitesNoSino />
        {lista.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-mute">Tudo em dia por aqui.</p>
        ) : (
          agrupar(lista).map((grupo) => (
            <section key={grupo.rotulo}>
              <p className="px-5 pb-1 pt-4 text-xs uppercase tracking-wide text-mute2">
                {grupo.rotulo}
              </p>
              <ul>
                {grupo.itens.map((aviso) => (
                  <li key={aviso.id} className="border-b border-line">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => void abrirAviso(aviso)}
                      className="grid h-auto min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 whitespace-normal rounded-none px-5 py-3 text-left transition-transform duration-[120ms] active:scale-[0.99] active:bg-ink3"
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
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );

  // Figaro: aceso enquanto houver não lidas (`unreadNotificationsCount > 0`).
  const forte = naoLidas > 0;
  const animar = toque > 0 && !menosMovimento;
  // Figaro (apk/2 §1.1): sem não lidas, `icon_bell` na cor dos ícones; com não lidas, `icon_bell_on` em tertiary
  // (#B61055 claro / #FFA6BF escuro), sem número no sino. Do nosso, fica só o balanço ao chegar aviso (dono, 30/10).
  const cor = "var(--figaro-tertiary, var(--sino-atencao))";
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => abrirCentralRef.current()}
        aria-label={rotuloDoSino(naoLidas, naoVistos)}
        className={`sino-de-avisos relative h-12 w-12 shrink-0 overflow-visible rounded-full border-0 bg-[var(--figaro-surface-container-highest,var(--ink3))] ${
          // Sem não lidas, a cor dos ícones do Figaro; o calendário ao lado usa a mesma (dono, 30/10).
          forte ? "" : "text-[var(--figaro-on-surface,var(--paper))]"
        }`}
        style={forte ? { color: cor } : undefined}
      >
        <motion.span
          key={`sino-${toque}`}
          className="relative inline-flex"
          initial={false}
          animate={animar ? { rotate: [0, -12, 9, -5, 2, 0] } : { rotate: 0 }}
          transition={animar ? { duration: 0.6, ease: "easeInOut" } : transicaoRapida}
          style={{ transformOrigin: "top center" }}
        >
          {/* Figaro: `icon_bell` sem não lidas e `icon_bell_on` (sino tocando) com não lidas, em tertiary. */}
          {forte ? (
            <BellRing size={27} strokeWidth={1.6} className="fill-current" aria-hidden />
          ) : (
            <Bell size={27} strokeWidth={1.6} aria-hidden />
          )}
        </motion.span>
      </Button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {aberto && celular ? (
                <TelaDeAvisos
                  key="tela"
                  lista={lista}
                  naoLidasAoAbrir={naoLidasAoAbrir}
                  onVoltar={fecharCentral}
                  onAbrir={(a) => void abrirAviso(a)}
                  onMarcarTodas={async () => {
                    await marcarTodasComoLidas(tenantId!);
                    void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
                  }}
                />
              ) : aberto ? (
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
