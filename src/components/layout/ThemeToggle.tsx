import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const MODE_KEY = "cortai-modo";
const LEGACY_MODE_KEY = "cortai-tema";
const IDENTITY_KEY = "cortai-identidade";

type Modo = "claro" | "escuro" | "sistema";
type Identidade = "moderno" | "blue" | "indigo" | "copper" | "classico";

const IDENTIDADES: ReadonlyArray<{ id: Identidade; nome: string }> = [
  { id: "moderno", nome: "Moderno" },
  { id: "blue", nome: "Blue" },
  { id: "indigo", nome: "Indigo" },
  { id: "copper", nome: "Copper" },
  { id: "classico", nome: "Clássico" },
];

const MODOS: ReadonlyArray<{ id: Modo; nome: string; icon: typeof Sun }> = [
  { id: "claro", nome: "Claro", icon: Sun },
  { id: "escuro", nome: "Escuro", icon: Moon },
  { id: "sistema", nome: "Sistema", icon: Monitor },
];

function aplicarAparencia(modo: Modo, identidade: Identidade) {
  const claro = modo === "claro" || (modo === "sistema" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("light", claro);
  document.documentElement.classList.toggle("dark", !claro);
  document.documentElement.dataset["identidade"] = identidade;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = claro ? "#F4F5F2" : identidade === "classico" ? "#111110" : "#1E2221";
}

export function ThemeToggle() {
  const [modo, setModo] = useState<Modo>("sistema");
  const [identidade, setIdentidade] = useState<Identidade>("moderno");

  useEffect(() => {
    const legado = window.localStorage.getItem(LEGACY_MODE_KEY);
    const modoSalvo = window.localStorage.getItem(MODE_KEY);
    const identidadeSalva = window.localStorage.getItem(IDENTITY_KEY);
    const modoInicial: Modo = modoSalvo === "claro" || modoSalvo === "escuro" || modoSalvo === "sistema"
      ? modoSalvo
      : legado === "claro" || legado === "escuro" ? legado : "sistema";
    const identidadeInicial = IDENTIDADES.some((item) => item.id === identidadeSalva)
      ? identidadeSalva as Identidade
      : "moderno";
    setModo(modoInicial);
    setIdentidade(identidadeInicial);
    aplicarAparencia(modoInicial, identidadeInicial);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const acompanharSistema = () => aplicarAparencia(modo, identidade);
    media.addEventListener("change", acompanharSistema);
    return () => media.removeEventListener("change", acompanharSistema);
  }, [modo, identidade]);

  function alterarModo(novoModo: Modo) {
    setModo(novoModo);
    window.localStorage.setItem(MODE_KEY, novoModo);
    aplicarAparencia(novoModo, identidade);
  }

  function alterarIdentidade(novaIdentidade: Identidade) {
    setIdentidade(novaIdentidade);
    window.localStorage.setItem(IDENTITY_KEY, novaIdentidade);
    aplicarAparencia(modo, novaIdentidade);
  }

  return (
    <section className="border-b border-line py-5" aria-labelledby="aparencia-titulo">
      <div className="flex min-h-12 items-center gap-3">
        <Palette size={18} strokeWidth={1.75} className="shrink-0 text-mute" />
        <span className="min-w-0">
          <span id="aparencia-titulo" className="block text-sm font-semibold text-paper">Aparência</span>
          <span className="mt-0.5 block text-xs text-mute">Identidade e modo são independentes</span>
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-mute">Identidade</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Identidade visual">
          {IDENTIDADES.map((item) => (
            <Button key={item.id} type="button" variant="outline" onClick={() => alterarIdentidade(item.id)} aria-pressed={identidade === item.id} className="identity-choice h-12 justify-start px-3" data-identity-choice={item.id}>
              <span className="identity-swatch" aria-hidden />
              <span className="truncate">{item.nome}</span>
              {identidade === item.id ? <Check className="ml-auto" strokeWidth={1.75} /> : null}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-mute">Modo</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Modo de cor">
          {MODOS.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.id} type="button" variant={modo === item.id ? "default" : "outline"} onClick={() => alterarModo(item.id)} aria-pressed={modo === item.id} className="h-12 min-w-0 px-2">
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