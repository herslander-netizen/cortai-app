import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { GRUPOS_DE_FUNCIONALIDADES } from "@/lib/funcionalidades";

const LINKS_DA_PAGINA = [
  { href: "#como-funciona", texto: "Como funciona" },
  { href: "#funcionalidades", texto: "Funcionalidades" },
  { href: "#planos", texto: "Planos" },
  { href: "#perguntas", texto: "Dúvidas" },
] as const;

/** Navegação comercial da Home. Nunca leva ao login nem substitui os CTAs de WhatsApp do corpo. */
export function MenuDeFuncionalidades() {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !raiz.current?.contains(evento.target)) {
        setAberto(false);
      }
    };
    const fecharEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharEscape);
    };
  }, [aberto]);

  const fechar = () => setAberto(false);

  return (
    <nav ref={raiz} className="relative flex items-center gap-4" aria-label="Navegação da apresentação">
      <div className="hidden items-center gap-5 lg:flex">
        {LINKS_DA_PAGINA.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-[13px] font-semibold text-[var(--texto-suave)] transition-colors hover:text-white focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {link.texto}
          </a>
        ))}
      </div>
      <button
        type="button"
        aria-controls="menu-completo-flow"
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar menu de funcionalidades" : "Abrir menu de funcionalidades"}
        onClick={() => setAberto((atual) => !atual)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-white/35 px-3 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <span className="hidden text-[13px] font-semibold sm:inline">Todas as funções</span>
        {aberto ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>
      {aberto ? (
        <div
          id="menu-completo-flow"
          className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-[min(78dvh,670px)] w-[min(90vw,440px)] overflow-y-auto overscroll-contain rounded-[22px] border border-white/10 bg-[#1c1e2e] p-4 text-[#f4f5fb] shadow-[0_24px_65px_-20px_rgba(0,0,0,0.75)] sm:p-5"
        >
          <p className="text-[17px] font-bold">Explore o Flow.</p>
          <p className="mt-1 text-[12px] text-[#b0b5cc]">
            Navegue pelas demonstrações e confira as funcionalidades disponíveis.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {LINKS_DA_PAGINA.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={fechar}
                className="rounded-xl bg-white/10 px-3 py-3 text-center text-[13px] font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {link.texto}
              </a>
            ))}
          </div>
          <div className="mt-5 space-y-5">
            {GRUPOS_DE_FUNCIONALIDADES.map((grupo) => (
              <section key={grupo.titulo}>
                <h2 className="mb-2 border-b border-white/10 pb-2 text-[12px] font-bold uppercase tracking-[0.09em] text-[#b9c6ff]">
                  {grupo.titulo}
                </h2>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {grupo.itens.map((item) => (
                    <li key={item.chave}>
                      <a
                        href={`#recurso-${item.chave}`}
                        onClick={fechar}
                        className="flex min-h-10 items-center rounded-lg px-2 py-2 text-[13px] text-[#f4f5fb] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        {item.rotulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
