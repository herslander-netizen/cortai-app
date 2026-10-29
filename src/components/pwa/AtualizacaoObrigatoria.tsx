import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { aplicarAtualizacao, tentarFechar } from "@/lib/pwa/atualizacao-obrigatoria";

const ID = "cortai-atualizacao-obrigatoria";

/**
 * Popup bloqueante de atualização. Deixa o resto da página inerte, prende o
 * foco e ignora Esc, toque fora e gesto de voltar.
 */
export function AtualizacaoObrigatoria() {
  const [etapa, setEtapa] = useState<"popup" | "bloqueio">("popup");
  const [estado, setEstado] = useState<"parado" | "atualizando" | "erro">("parado");
  const caixa = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raiz = document.getElementById(ID);
    const irmaos = Array.from(document.body.children).filter(
      (el) => el !== raiz && !el.contains(raiz) && !el.hasAttribute("inert"),
    ) as HTMLElement[];
    // A camada fica dentro do app; inertizamos tudo que não a contém.
    const marcados: HTMLElement[] = [];
    const marcar = (el: Element | null) => {
      if (!el || !raiz) return;
      for (const filho of Array.from(el.children) as HTMLElement[]) {
        if (filho === raiz) continue;
        if (filho.contains(raiz)) marcar(filho);
        else if (!filho.hasAttribute("inert")) {
          filho.setAttribute("inert", "");
          marcados.push(filho);
        }
      }
    };
    for (const el of irmaos) {
      el.setAttribute("inert", "");
      marcados.push(el);
    }
    marcar(Array.from(document.body.children).find((el) => el.contains(raiz)) ?? null);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") ev.preventDefault();
      if (ev.key !== "Tab" || !caixa.current) return;
      const focaveis = caixa.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (focaveis.length === 0) return ev.preventDefault();
      const primeiro = focaveis[0]!;
      const ultimo = focaveis[focaveis.length - 1]!;
      if (ev.shiftKey && document.activeElement === primeiro) {
        ev.preventDefault();
        ultimo.focus();
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault();
        primeiro.focus();
      }
    };
    const voltar = () => window.history.pushState(null, "", window.location.href);
    window.history.pushState(null, "", window.location.href);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("popstate", voltar);
    return () => {
      marcados.forEach((el) => el.removeAttribute("inert"));
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", tecla, true);
      window.removeEventListener("popstate", voltar);
    };
  }, []);

  useEffect(() => {
    principal.current?.focus();
  }, [etapa]);

  async function atualizar() {
    setEstado("atualizando");
    try {
      await aplicarAtualizacao();
    } catch {
      setEstado("erro");
    }
  }

  async function cancelar() {
    if (await tentarFechar()) setEtapa("bloqueio");
  }

  const ocupado = estado === "atualizando";
  const bloqueio = etapa === "bloqueio";

  return (
    <div
      id={ID}
      className={`fixed inset-0 z-[200] flex items-center justify-center px-4 ${bloqueio ? "bg-ink" : "bg-ink/85 backdrop-blur-sm"}`}
    >
      <div
        ref={caixa}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-atualizacao"
        aria-describedby="texto-atualizacao"
        className="w-full max-w-sm rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] p-6 text-center"
      >
        <h2 id="titulo-atualizacao" className="text-base font-semibold text-paper">
          Atualização necessária
        </h2>
        <p id="texto-atualizacao" className="mt-2 text-sm leading-relaxed text-mute">
          {bloqueio
            ? "Feche o Flow e abra de novo para atualizar."
            : "Há uma nova versão do Flow com melhorias importantes. Atualize para continuar usando o aplicativo."}
        </p>
        {estado === "erro" && (
          <p role="alert" className="mt-3 text-sm text-brick">
            Não foi possível atualizar. Verifique a internet e tente de novo.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <Button
            ref={principal}
            variant="primary"
            className="min-h-12 w-full"
            disabled={ocupado}
            onClick={() => void atualizar()}
          >
            {ocupado ? "Atualizando…" : estado === "erro" ? "Tentar de novo" : "Atualizar agora"}
          </Button>
          {!bloqueio && (
            <Button
              variant="ghost"
              className="min-h-12 w-full"
              disabled={ocupado}
              onClick={() => void cancelar()}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
