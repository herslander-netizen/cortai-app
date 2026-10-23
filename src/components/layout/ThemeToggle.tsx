import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import {
  APPEARANCE_EVENT,
  aplicarIdentidade,
  aplicarModo,
  identidadeValida,
  modoSalvo,
  type Identidade,
  type Modo,
} from "@/lib/aparencia";
import { salvarIdentidadeApp } from "@/lib/sessao.functions";

const OPCOES_DE_IDENTIDADE: ReadonlyArray<{ id: Identidade; nome: string; descricao: string }> = [
  { id: "moderno", nome: "Padrão", descricao: "Azul com rosa em destaque" },
  { id: "rose", nome: "Rosé", descricao: "Rosa em destaque, azul nos detalhes" },
  { id: "indigo", nome: "Índigo", descricao: "Índigo monocromático" },
  { id: "copper", nome: "Cobre", descricao: "Laranja com cinzas quentes, preto e branco" },
  { id: "classico", nome: "Clássico", descricao: "Dourado monocromático" },
];

const MODOS: ReadonlyArray<{ id: Modo; nome: string; icon: typeof Sun }> = [
  { id: "claro", nome: "Claro", icon: Sun },
  { id: "escuro", nome: "Escuro", icon: Moon },
  { id: "sistema", nome: "Sistema", icon: Monitor },
];

export function ThemeToggle({
  identidadeDaBarbearia,
  tenantId,
  podeAlterarIdentidade = false,
}: {
  identidadeDaBarbearia?: string | undefined;
  tenantId?: string | undefined;
  podeAlterarIdentidade?: boolean | undefined;
}) {
  const queryClient = useQueryClient();
  const salvarIdentidade = useServerFn(salvarIdentidadeApp);
  const [modo, setModo] = useState<Modo>("escuro");
  const [identidade, setIdentidade] = useState<Identidade>(() =>
    identidadeValida(identidadeDaBarbearia),
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const modoInicial = modoSalvo();
    const identidadeInicial = identidadeValida(identidadeDaBarbearia);
    setModo(modoInicial);
    setIdentidade(identidadeInicial);
    aplicarIdentidade(identidadeInicial);
    aplicarModo(modoInicial);
  }, [identidadeDaBarbearia]);

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

  async function alterarIdentidade(novaIdentidade: Identidade) {
    if (!tenantId) return;
    const anterior = identidade;
    setIdentidade(novaIdentidade);
    aplicarIdentidade(novaIdentidade);
    setSalvando(true);
    try {
      await salvarIdentidade({ data: { identidade: novaIdentidade, tenantId } });
      await queryClient.invalidateQueries({ queryKey: ["sessao"] });
    } catch (error) {
      setIdentidade(anterior);
      aplicarIdentidade(anterior);
      aviso.erro(
        error instanceof Error ? error.message : "Não foi possível salvar a identidade agora.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="border-b border-line py-5" aria-labelledby="aparencia-titulo">
      <div className="flex min-h-12 items-center gap-3">
        <Palette size={18} strokeWidth={1.75} className="shrink-0 text-mute" />
        <span className="min-w-0">
          <span id="aparencia-titulo" className="block text-sm font-semibold text-paper">
            Aparência
          </span>
          <span className="mt-0.5 block text-xs text-mute">
            {podeAlterarIdentidade
              ? "Identidade do negócio e modo deste aparelho"
              : "Modo deste aparelho"}
          </span>
        </span>
      </div>

      {podeAlterarIdentidade && tenantId ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-mute">Identidade</p>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
            role="group"
            aria-label="Identidade visual"
          >
            {OPCOES_DE_IDENTIDADE.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => void alterarIdentidade(item.id)}
                aria-pressed={identidade === item.id}
                className="identity-choice h-12 justify-start px-3"
                data-identity-choice={item.id}
              >
                <span className="identity-swatch" aria-hidden />
                <span className="min-w-0 text-left">
                  <span className="block truncate">{item.nome}</span>
                  <span className="block truncate text-[10px] font-normal text-mute">
                    {item.descricao}
                  </span>
                </span>
                {identidade === item.id ? <Check className="ml-auto" strokeWidth={1.75} /> : null}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

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
