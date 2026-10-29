import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "@/hooks/use-mobile";

/**
 * Folha inferior (bottom sheet) da Flow IA: abre sobre a tela atual, sem trocar
 * de rota. Fecha por backdrop, ESC, botão X (no cabeçalho) e arraste para baixo.
 */
export function FolhaCortai({
  aoFechar,
  rotulo,
  cabecalho,
  children,
}: {
  aoFechar: () => void;
  rotulo: string;
  cabecalho: ReactNode;
  children: ReactNode;
}) {
  const [montado, setMontado] = useState(false);
  const [entrou, setEntrou] = useState(false);
  const [altura, setAltura] = useState(60); // vh
  const celular = useMediaQuery("(max-width: 767px)");
  const [arrasto, setArrasto] = useState(0); // px para baixo
  const painel = useRef<HTMLDivElement | null>(null);
  const inicio = useRef<number | null>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (celular) setAltura((atual) => Math.max(atual, 88));
  }, [celular]);

  useEffect(() => {
    setMontado(true);
    focoAnterior.current = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const body = document.body;
    const overflowAntes = body.style.overflow;
    body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => setEntrou(true));
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      cancelAnimationFrame(id);
      body.style.overflow = overflowAntes;
      window.scrollTo({ top: scrollY });
      focoAnterior.current?.focus?.();
    };
  }, [aoFechar]);

  useEffect(() => {
    if (entrou) painel.current?.focus();
  }, [entrou]);

  if (!montado) return null;

  function aoSoltar() {
    if (inicio.current === null) return;
    const delta = arrasto;
    inicio.current = null;
    setArrasto(0);
    if (delta > 110) aoFechar();
    else if (delta < -60) setAltura(92);
    else if (delta > 40 && altura === 92) setAltura(60);
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          background: "rgba(11,11,11,.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          opacity: entrou ? 1 : 0,
        }}
      />
      <section
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        tabIndex={-1}
        className="cortai-sheet relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl border border-line2 bg-ink2 outline-none"
        style={{
          height: `${celular ? Math.max(altura, 88) : altura}dvh`,
          maxHeight: "100dvh",
          transform: entrou ? `translateY(${Math.max(0, arrasto)}px)` : "translateY(100%)",
          transition:
            inicio.current === null
              ? "transform 220ms cubic-bezier(.22,1.2,.36,1), height 220ms ease"
              : "none",
        }}
      >
        <div
          className="shrink-0 cursor-grab touch-none pt-2 active:cursor-grabbing"
          onPointerDown={(e) => {
            inicio.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (inicio.current === null) return;
            setArrasto(e.clientY - inicio.current);
          }}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        >
          <span className="mx-auto block h-1 w-10 rounded-full bg-line2" aria-hidden />
          {cabecalho}
        </div>
        {/* O conteúdo controla a própria rolagem: cabeçalho fixo, mensagens
            rolando e campo de escrita sempre acessível. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
