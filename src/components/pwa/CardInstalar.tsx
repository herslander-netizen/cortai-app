import { Download } from "lucide-react";
import { useState } from "react";

import { PassosDeInstalacao } from "@/components/pwa/PassosDeInstalacao";
import { useInstalacaoApp } from "@/hooks/useInstalacaoApp";

/**
 * Card discreto de instalação para telas públicas.
 * Some por completo quando o navegador não oferece caminho de instalação.
 */
export function CardInstalar({ className = "" }: { className?: string }) {
  const instalacao = useInstalacaoApp();
  const [passos, setPassos] = useState(false);

  if (!instalacao.disponivel) return null;

  return (
    <aside className={`rounded-xl border border-line2 bg-ink2 p-4 ${className}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <img
          src="/icone-cortai-192.png"
          alt=""
          width={36}
          height={36}
          loading="lazy"
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-paper">Tenha o Cortaí sempre à mão</p>
          <p className="mt-0.5 text-xs leading-relaxed text-mute">
            Instale o aplicativo e abra direto da tela de início.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          if (instalacao.podeInstalarAgora) {
            await instalacao.instalar();
            return;
          }
          setPassos((v) => !v);
        }}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 text-xs font-bold text-ink transition-opacity hover:opacity-90 active:opacity-80"
      >
        <Download size={14} aria-hidden />
        {instalacao.podeInstalarAgora ? "Instalar aplicativo" : "Como instalar"}
      </button>
      {passos ? <PassosDeInstalacao sistema={instalacao.sistema} className="mt-3" /> : null}
    </aside>
  );
}
