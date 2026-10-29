import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useModoFoco } from "@/lib/modo-foco";
import {
  lerNovidadesVista,
  marcarNovidadesVista,
  NOVIDADES,
  TITULO_DAS_NOVIDADES,
  VERSAO_DAS_NOVIDADES,
} from "@/lib/novidades";

/** Abre a folha de novidades de qualquer lugar (ex.: aviso de versão). */
export const EVENTO_ABRIR_NOVIDADES = "cortai:abrir-novidades";

function instalacaoNova() {
  try {
    const ls = window.localStorage;
    return (
      ls.getItem("cortai-novidades-vistas") === null &&
      !Object.keys(ls).some((k) => k.startsWith("cortai:guia:v1:"))
    );
  } catch {
    return true;
  }
}

/** Folha "Novidades do Flow 3.0": uma vez por versão, nunca no Modo Foco nem sobre outra janela. */
export function NovidadesDaVersao() {
  const foco = useModoFoco();
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const areaLogada = ["/app", "/admin", "/barbeiro", "/painel"].some((p) => caminho.startsWith(p));

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_ABRIR_NOVIDADES, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_NOVIDADES, abrir);
  }, []);

  useEffect(() => {
    if (foco || !areaLogada) return;
    if (lerNovidadesVista() === VERSAO_DAS_NOVIDADES) return;
    if (instalacaoNova()) {
      marcarNovidadesVista();
      return;
    }
    const timer = window.setTimeout(() => {
      // Nunca por cima de um agendamento ou outra janela em andamento.
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return;
      setAberto(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [areaLogada, foco]);

  function fechar() {
    setAberto(false);
    marcarNovidadesVista();
  }

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto]);

  if (!aberto || foco) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/80 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novidades"
        className="w-full max-w-md rounded-[20px] border border-line bg-popover p-6"
      >
        <h2 id="titulo-novidades" className="text-xl font-semibold text-paper">
          {TITULO_DAS_NOVIDADES}
        </h2>
        <ul className="mt-4 space-y-2">
          {NOVIDADES.map((linha) => (
            <li key={linha} className="text-sm leading-6 text-mute">
              • {linha}
            </li>
          ))}
        </ul>
        <Button type="button" onClick={fechar} className="mt-6 min-h-12 w-full">
          Entendi
        </Button>
      </div>
    </div>
  );
}
