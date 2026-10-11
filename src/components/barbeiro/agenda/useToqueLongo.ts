import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

export const TEMPO_DO_TOQUE_LONGO_MS = 500;
/** Quanto o dedo pode andar antes de virar rolagem/arrasto em vez de "segurar". */
const TOLERANCIA_PX = 10;

/**
 * Gesto de segurar um botão. O toque curto continua sendo o clique de sempre; ao completar
 * o tempo, chama `aoSegurar` UMA vez e engole o clique que o navegador dispara ao soltar
 * (senão o "+" abriria o menu junto com a voz).
 *
 * Rolar a tela, soltar antes do tempo ou o navegador cancelar o toque desfazem o gesto.
 * Teclado e leitor de tela não usam isto: têm o item do menu como caminho equivalente.
 */
export function useToqueLongo(
  aoSegurar: (() => void) | undefined,
  { ativo = true, ms = TEMPO_DO_TOQUE_LONGO_MS }: { ativo?: boolean; ms?: number } = {},
) {
  const [segurando, setSegurando] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origem = useRef<{ x: number; y: number } | null>(null);
  const disparou = useRef(false);
  const liberar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(aoSegurar);
  callback.current = aoSegurar;
  const habilitado = ativo && Boolean(aoSegurar);

  const cancelar = useCallback(() => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
    origem.current = null;
    setSegurando(false);
  }, []);

  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
      if (liberar.current) clearTimeout(liberar.current);
    },
    [],
  );

  // Desligar no meio do gesto (ex.: o menu abriu) também o desfaz.
  useEffect(() => {
    if (!habilitado) cancelar();
  }, [habilitado, cancelar]);

  const aoPressionar = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!habilitado) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      disparou.current = false;
      if (liberar.current) clearTimeout(liberar.current);
      origem.current = { x: e.clientX, y: e.clientY };
      setSegurando(true);
      relogio.current = setTimeout(() => {
        relogio.current = null;
        origem.current = null;
        disparou.current = true;
        setSegurando(false);
        try {
          navigator.vibrate?.(25);
        } catch {
          /* sem vibração */
        }
        callback.current?.();
      }, ms);
    },
    [habilitado, ms],
  );

  const aoMover = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const o = origem.current;
      if (!o) return;
      if (Math.hypot(e.clientX - o.x, e.clientY - o.y) > TOLERANCIA_PX) cancelar();
    },
    [cancelar],
  );

  const aoSoltar = useCallback(() => {
    cancelar();
    // O clique do mesmo gesto chega logo depois de soltar; depois disso a trava some.
    if (disparou.current) {
      if (liberar.current) clearTimeout(liberar.current);
      liberar.current = setTimeout(() => {
        disparou.current = false;
      }, 400);
    }
  }, [cancelar]);

  const aoClicarCapturando = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!disparou.current) return;
    disparou.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const aoAbrirMenuDoSistema = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      // Segurar no celular abriria o menu de contexto/seleção do sistema.
      if (habilitado) e.preventDefault();
    },
    [habilitado],
  );

  return {
    segurando,
    propriedades: {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: aoSoltar,
      onPointerCancel: aoSoltar,
      onPointerLeave: aoSoltar,
      onClickCapture: aoClicarCapturando,
      onContextMenu: aoAbrirMenuDoSistema,
    },
  };
}
