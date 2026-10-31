import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  APPEARANCE_EVENT,
  aplicarIdentidade,
  aplicarModo,
  identidadeValida,
  modoSalvo,
  type Modo,
} from "@/lib/aparencia";

const MODOS: ReadonlyArray<{ id: Modo; nome: string; Icone: typeof Sun }> = [
  { id: "claro", nome: "Claro", Icone: Sun },
  { id: "escuro", nome: "Escuro", Icone: Moon },
  { id: "sistema", nome: "Seguir o aparelho", Icone: Monitor },
];

/**
 * Aparência no próprio menu lateral (dono, 31/10): uma linha no estilo dos cartões do menu, com os três modos em
 * ícones à direita — muda num toque, sem abrir nada. Saiu da gaveta de Ajustes. Mesmas funções do `ThemeToggle`.
 */
export function AparenciaDoMenu({ identidade }: { identidade?: string | undefined }) {
  const [modo, setModo] = useState<Modo>("escuro");

  useEffect(() => {
    const inicial = modoSalvo();
    setModo(inicial);
    aplicarIdentidade(identidadeValida(identidade));
    aplicarModo(inicial);
    // Outras telas (Conta, Perfil) também mudam o modo: acompanha.
    const acompanhar = (evento: Event) => {
      const novo = (evento as CustomEvent<{ modo?: Modo }>).detail?.modo;
      if (novo) setModo(novo);
    };
    window.addEventListener(APPEARANCE_EVENT, acompanhar);
    return () => window.removeEventListener(APPEARANCE_EVENT, acompanhar);
  }, [identidade]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const acompanharSistema = () => aplicarModo(modo);
    media.addEventListener("change", acompanharSistema);
    return () => media.removeEventListener("change", acompanharSistema);
  }, [modo]);

  return (
    <div className="mt-6 flex min-h-[64px] items-center gap-4 rounded-[28px] bg-drawer-card py-2 pl-5 pr-2">
      <Palette className="size-6 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      <span
        id="menu-aparencia"
        className="min-w-0 flex-1 truncate text-[17px] font-medium text-paper"
      >
        Aparência
      </span>
      <div role="radiogroup" aria-labelledby="menu-aparencia" className="flex shrink-0 gap-1">
        {MODOS.map(({ id, nome, Icone }) => {
          const marcado = modo === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={marcado}
              aria-label={nome}
              title={nome}
              onClick={() => {
                setModo(id);
                aplicarModo(id, true);
              }}
              className={`grid size-11 place-items-center rounded-full transition-[background-color,color,transform] duration-[var(--mola-toque-duracao)] ease-[var(--mola-toque)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                marcado
                  ? "bg-[var(--figaro-primary-container)] text-[var(--figaro-on-primary-container)]"
                  : "text-mute hover:text-paper"
              }`}
            >
              <Icone className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
