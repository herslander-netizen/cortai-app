import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";

import { guiaDaRota, type Guia } from "@/lib/guia/tours";
import { supabase } from "@/integrations/supabase/client";

type Prefs = { ativo: boolean; concluidos: string[] };

const PADRAO: Prefs = { ativo: true, concluidos: [] };
const PREFIXO = "cortai:guia:v1:";

type Ctx = {
  prefs: Prefs;
  guiaDisponivel: Guia | undefined;
  emAndamento: boolean;
  abrirGuia: () => void;
  definirAtivo: (valor: boolean) => void;
  reiniciar: () => void;
};

const GuiaContext = createContext<Ctx | null>(null);

export function useGuia() {
  const ctx = useContext(GuiaContext);
  if (!ctx) throw new Error("useGuia precisa estar dentro de GuiaProvider");
  return ctx;
}

function ler(chave: string): Prefs {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return PADRAO;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      ativo: parsed.ativo !== false,
      concluidos: Array.isArray(parsed.concluidos) ? parsed.concluidos : [],
    };
  } catch {
    return PADRAO;
  }
}

export function GuiaProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [chave, setChave] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(PADRAO);
  const [guiaAtivo, setGuiaAtivo] = useState<Guia | null>(null);
  const [passo, setPasso] = useState(0);

  // chave por usuário (cai para visitante quando não há sessão)
  useEffect(() => {
    let vivo = true;
    const aplicar = (id: string | null) => {
      if (!vivo) return;
      const k = `${PREFIXO}${id ?? "visitante"}`;
      setChave(k);
      setPrefs(ler(k));
    };
    supabase.auth
      .getSession()
      .then(({ data }) => aplicar(data.session?.user?.id ?? null))
      .catch(() => aplicar(null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        aplicar(session?.user?.id ?? null);
      }
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const salvar = useCallback(
    (atualizar: (p: Prefs) => Prefs) => {
      setPrefs((atual) => {
        const proximo = atualizar(atual);
        if (chave) {
          try {
            localStorage.setItem(chave, JSON.stringify(proximo));
          } catch {
            /* armazenamento indisponível */
          }
        }
        return proximo;
      });
    },
    [chave],
  );

  const guiaDisponivel = useMemo(() => guiaDaRota(pathname), [pathname]);

  // fecha ao trocar de rota
  useEffect(() => {
    setGuiaAtivo(null);
    setPasso(0);
  }, [pathname]);

  // abertura automática na primeira vez
  const tentado = useRef<string | null>(null);
  useEffect(() => {
    if (!chave || !guiaDisponivel || !prefs.ativo) return;
    if (prefs.concluidos.includes(guiaDisponivel.id)) return;
    if (tentado.current === guiaDisponivel.id + pathname) return;
    let cancelado = false;
    let tentativas = 0;
    const id = window.setInterval(() => {
      tentativas += 1;
      const existe = guiaDisponivel.passos.some((p) =>
        document.querySelector(`[data-guia="${p.alvo}"]`),
      );
      if (existe && !cancelado) {
        tentado.current = guiaDisponivel.id + pathname;
        setPasso(0);
        setGuiaAtivo(guiaDisponivel);
        window.clearInterval(id);
      } else if (tentativas > 24) {
        window.clearInterval(id);
      }
    }, 250);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [chave, guiaDisponivel, prefs.ativo, prefs.concluidos, pathname]);

  const encerrar = useCallback(
    (marcarConcluido: boolean) => {
      const atual = guiaAtivo;
      setGuiaAtivo(null);
      setPasso(0);
      if (marcarConcluido && atual) {
        salvar((p) =>
          p.concluidos.includes(atual.id) ? p : { ...p, concluidos: [...p.concluidos, atual.id] },
        );
      }
    },
    [guiaAtivo, salvar],
  );

  const valor: Ctx = {
    prefs,
    guiaDisponivel,
    emAndamento: !!guiaAtivo,
    abrirGuia: () => {
      if (!guiaDisponivel) return;
      setPasso(0);
      setGuiaAtivo(guiaDisponivel);
    },
    definirAtivo: (v) => {
      if (!v) {
        setGuiaAtivo(null);
        setPasso(0);
      }
      salvar((p) => ({ ...p, ativo: v }));
    },
    reiniciar: () => {
      tentado.current = null;
      salvar((p) => ({ ...p, ativo: true, concluidos: [] }));
    },
  };

  return (
    <GuiaContext.Provider value={valor}>
      {children}
      {guiaAtivo ? (
        <GuiaOverlay
          guia={guiaAtivo}
          passo={passo}
          aoAvancar={() => {
            if (passo + 1 >= guiaAtivo.passos.length) encerrar(true);
            else setPasso(passo + 1);
          }}
          aoVoltar={() => setPasso(Math.max(0, passo - 1))}
          aoPular={() => encerrar(true)}
        />
      ) : null}
    </GuiaContext.Provider>
  );
}

type Caixa = { top: number; left: number; width: number; height: number };

function GuiaOverlay({
  guia,
  passo,
  aoAvancar,
  aoVoltar,
  aoPular,
}: {
  guia: Guia;
  passo: number;
  aoAvancar: () => void;
  aoVoltar: () => void;
  aoPular: () => void;
}) {
  const atual = guia.passos[passo]!;
  const [alvo, setAlvo] = useState<Caixa | null>(null);
  const [dicaAltura, setDicaAltura] = useState(180);
  const dicaRef = useRef<HTMLDivElement>(null);
  const proximoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let raf = 0;
    const medir = () => {
      const el = document.querySelector(`[data-guia="${atual.alvo}"]`) as HTMLElement | null;
      if (!el) {
        setAlvo(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setAlvo({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const el = document.querySelector(`[data-guia="${atual.alvo}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const loop = () => {
      medir();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    const parar = window.setTimeout(() => window.cancelAnimationFrame(raf), 900);
    window.addEventListener("resize", medir);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(parar);
      window.removeEventListener("resize", medir);
    };
  }, [atual.alvo]);

  useEffect(() => {
    proximoRef.current?.focus();
    if (dicaRef.current) setDicaAltura(dicaRef.current.offsetHeight);
  }, [passo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        aoPular();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        aoAvancar();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        aoVoltar();
      } else if (e.key === "Tab") {
        // mantém o foco dentro da dica
        const focaveis = dicaRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focaveis || focaveis.length === 0) return;
        const primeiro = focaveis[0]!;
        const ultimo = focaveis[focaveis.length - 1]!;
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aoAvancar, aoVoltar, aoPular]);

  const margemInferior = 112; // navegação inferior + respiro
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const largura = Math.min(360, vw - 32);

  let topoDica = vh - margemInferior - dicaAltura;
  let esquerdaDica = (vw - largura) / 2;
  if (alvo) {
    const abaixo = alvo.top + alvo.height + 14;
    const acima = alvo.top - dicaAltura - 14;
    topoDica = abaixo + dicaAltura < vh - margemInferior ? abaixo : Math.max(16, acima);
    if (topoDica + dicaAltura > vh - margemInferior) {
      topoDica = Math.max(16, vh - margemInferior - dicaAltura);
    }
    esquerdaDica = Math.min(
      Math.max(16, alvo.left + alvo.width / 2 - largura / 2),
      Math.max(16, vw - largura - 16),
    );
  }

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      {/* camada que bloqueia a interação com o resto da tela */}
      <button
        type="button"
        aria-label="Fechar dicas"
        onClick={aoPular}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/60 transition-opacity duration-300"
        style={alvo ? { backgroundColor: "transparent" } : undefined}
      />
      {alvo ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-1 ring-gold/60 transition-all duration-300 ease-out"
          style={{
            top: alvo.top - 6,
            left: alvo.left - 6,
            width: alvo.width + 12,
            height: alvo.height + 12,
            boxShadow: "0 0 0 9999px color-mix(in oklab, var(--ink) 74%, transparent)",
          }}
        />
      ) : null}

      <div
        ref={dicaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-titulo"
        aria-describedby="guia-texto"
        className="absolute rounded-xl border border-line bg-ink3 p-5 shadow-xl transition-all duration-300 ease-out"
        style={{ top: topoDica, left: esquerdaDica, width: largura }}
      >
        <p id="guia-titulo" className="flex items-center gap-2 text-sm font-bold text-paper">
          <Lightbulb size={15} className="shrink-0 text-gold" aria-hidden />
          {atual.titulo}
        </p>
        <p id="guia-texto" className="mt-2 text-sm leading-relaxed text-mute">
          {atual.texto}
        </p>
        <p className="mt-4 text-xs uppercase tracking-wider text-mute2">
          {passo + 1} de {guia.passos.length}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={aoPular}
            className="min-h-11 rounded-md px-2 text-xs text-mute transition-colors hover:text-paper"
          >
            Pular dicas
          </button>
          <button
            ref={proximoRef}
            type="button"
            onClick={aoAvancar}
            className="rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-ink transition-opacity hover:opacity-90"
          >
            {passo + 1 === guia.passos.length ? "Entendi" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
