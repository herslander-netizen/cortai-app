import { Download, Smartphone } from "lucide-react";
import { useState } from "react";

import { useInstalacaoApp } from "@/hooks/useInstalacaoApp";
import { PassosDeInstalacao } from "@/components/pwa/PassosDeInstalacao";

/**
 * Atalho discreto em listas de "Perfil"/"Mais" para quem dispensou o convite.
 * Só aparece quando a instalação realmente faz sentido neste navegador.
 */
export function AtalhoInstalar() {
  const instalacao = useInstalacaoApp();
  const [passos, setPassos] = useState(false);
  const [status, setStatus] = useState("");

  if (!instalacao.disponivel) return null;

  return (
    <li className="border-b border-line">
      <button
        type="button"
        onClick={async () => {
          if (instalacao.podeInstalarAgora) {
            const aceitou = await instalacao.instalar();
            setStatus(aceitou ? "Aplicativo instalado." : "");
            return;
          }
          setPassos((v) => !v);
        }}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left transition-colors active:bg-ink2"
      >
        <Smartphone size={18} className="text-mute" />
        <span className="min-w-0">
          <span className="block text-sm text-paper">Instalar aplicativo</span>
          <span className="mt-0.5 block truncate text-xs text-mute">Abra o Cortaí direto da tela de início</span>
        </span>
        <Download size={16} className="text-gold" />
      </button>
      {status ? (
        <p className="pb-4 text-xs text-sage" role="status">
          {status}
        </p>
      ) : null}
      {passos ? <PassosDeInstalacao sistema={instalacao.sistema} className="mb-4" /> : null}
    </li>
  );
}
