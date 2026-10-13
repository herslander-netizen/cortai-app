import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { instrucaoDeInstalacao, useInstalacao } from "@/lib/pwa";

/**
 * Linha de Perfil/Configurações para instalar o Cortaí, com a instrução do dispositivo atual.
 */
export function InstalarCortai() {
  const { pronto, plataforma, instalado, podeInstalarAgora, instalar } = useInstalacao();
  const [verInstrucao, setVerInstrucao] = useState(false);

  if (!pronto) return null;

  if (instalado) {
    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-b border-line py-5">
        <CheckCircle2 size={18} className="text-gold" />
        <span className="text-sm text-paper">Cortaí já está instalado neste dispositivo</span>
      </div>
    );
  }

  const instrucao = instrucaoDeInstalacao(plataforma);

  return (
    <div className="border-b border-line py-2">
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          if (podeInstalarAgora) void instalar();
          else setVerInstrucao((v) => !v);
        }}
        className="grid h-auto min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-start gap-4 whitespace-normal rounded-none px-0 py-3 text-left"
      >
        <Smartphone size={18} className="text-mute" />
        <span className="min-w-0">
          <span className="block text-sm text-paper">Instalar Cortaí</span>
          <span className="mt-0.5 block text-xs text-mute">Acesso mais rápido ao seu sistema</span>
        </span>
        <Download size={16} className="text-mute2" />
      </Button>
      {verInstrucao && !podeInstalarAgora ? (
        <p className="mb-3 rounded-lg border border-line bg-ink px-3 py-3 text-xs leading-relaxed text-mute">
          {instrucao}
        </p>
      ) : null}
    </div>
  );
}
