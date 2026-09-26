import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { APP_VERSION, VERSAO_ATUAL_INFO } from "@/lib/versao";

const CHAVE = "cortai-novidades-vistas";

/**
 * Apresentação curta das novidades de uma versão importante.
 * Aparece uma única vez por versão, só dentro das áreas logadas, e nunca
 * interrompe o funcionamento do app — dá para fechar a qualquer momento.
 */
export function NovidadesDaVersao() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);

  const areaLogada = caminho.startsWith("/barbeiro") || caminho.startsWith("/app") || caminho.startsWith("/admin");

  useEffect(() => {
    if (!areaLogada || VERSAO_ATUAL_INFO.tipo !== "major") return;
    try {
      if (localStorage.getItem(CHAVE) === APP_VERSION) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setAberto(true), 600);
    return () => window.clearTimeout(timer);
  }, [areaLogada]);

  function fechar() {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE, APP_VERSION);
    } catch {
      /* navegador sem armazenamento: só não registra a leitura */
    }
  }

  if (!aberto) return null;

  const destaques = [...VERSAO_ATUAL_INFO.funcionalidades, ...VERSAO_ATUAL_INFO.visual].slice(0, 5);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/80 p-4 sm:items-center">
      <div role="dialog" aria-label="Novidades do Cortaí" className="w-full max-w-md surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold">NOVIDADES</p>
            <h2 className="mt-2 text-2xl font-semibold text-paper">{VERSAO_ATUAL_INFO.titulo} chegou.</h2>
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar novidades" className="rounded-full p-2 text-mute hover:text-paper">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-mute">{VERSAO_ATUAL_INFO.descricao}</p>
        <ul className="mt-4 space-y-2">
          {destaques.map((linha) => (
            <li key={linha} className="text-sm leading-6 text-mute">
              • {linha}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={fechar}
          className="mt-6 h-11 w-full rounded-xl bg-gold text-sm font-semibold text-ink"
        >
          Explorar o Cortaí {APP_VERSION.split(".").slice(0, 2).join(".")}
        </button>
      </div>
    </div>
  );
}
