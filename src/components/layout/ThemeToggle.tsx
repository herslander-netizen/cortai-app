import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  APPEARANCE_EVENT,
  aplicarModo,
  modoSalvo,
  type Modo,
} from "@/lib/aparencia";

const MODOS: ReadonlyArray<{ id: Modo; nome: string; icon: typeof Sun }> = [
  { id: "claro", nome: "Claro", icon: Sun },
  { id: "escuro", nome: "Escuro", icon: Moon },
  { id: "sistema", nome: "Sistema", icon: Monitor },
];

export function ThemeToggle(_props?: {
  identidadeDaBarbearia?: string | undefined;
  tenantId?: string | undefined;
  podeAlterarIdentidade?: boolean | undefined;
}) {
  const [modo, setModo] = useState<Modo>("escuro");

  useEffect(() => {
    const modoInicial = modoSalvo();
    setModo(modoInicial);
    aplicarModo(modoInicial);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const acompanharSistema = () => aplicarModo(modo);
    media.addEventListener("change", acompanharSistema);
    return () => media.removeEventListener("change", acompanharSistema);
  }, [modo]);

  function alterarModo(novoModo: Modo) {
    setModo(novoModo);
    aplicarModo(novoModo, true);
  }

  return (
    <section className="py-5" aria-labelledby="aparencia-titulo">
      <div className="flex min-h-12 items-center gap-3">
        <Palette size={18} strokeWidth={1.75} className="shrink-0 text-mute" />
        <span className="min-w-0">
          <span id="aparencia-titulo" className="block text-sm font-semibold text-paper">
            Aparência
          </span>
          <span className="mt-0.5 block text-xs text-mute">
            Escolha como o Cortaí aparece neste aparelho
          </span>
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-mute">Modo</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Modo de cor">
          {MODOS.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                type="button"
                variant={modo === item.id ? "default" : "outline"}
                onClick={() => alterarModo(item.id)}
                aria-pressed={modo === item.id}
                className="h-12 min-w-0 px-2"
              >
                <Icon strokeWidth={1.75} />
                <span className="truncate">{item.nome}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ModeMenuItem() {
  const [modo, setModo] = useState<Modo>("escuro");

  useEffect(() => {
    setModo(modoSalvo());
    const atualizar = (event: Event) => {
      const detalhe = (event as CustomEvent<{ modo?: Modo }>).detail;
      if (detalhe?.modo) setModo(detalhe.modo);
    };
    window.addEventListener(APPEARANCE_EVENT, atualizar);
    return () => window.removeEventListener(APPEARANCE_EVENT, atualizar);
  }, []);

  const escuro =
    typeof window !== "undefined" && document.documentElement.classList.contains("dark");
  const Icon = escuro ? Sun : Moon;
  const proximo: Modo = escuro ? "claro" : "escuro";
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        setModo(proximo);
        aplicarModo(proximo, true);
      }}
      className="drawer-link w-full justify-start"
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <Icon strokeWidth={1.75} />
      <span>{escuro ? "Modo claro" : "Modo escuro"}</span>
      <span className="sr-only">Modo atual: {modo}</span>
    </Button>
  );
}
