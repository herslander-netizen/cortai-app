import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { instrucaoDeInstalacao, useInstalacao } from "@/lib/pwa";

/**
 * Linha de Perfil/Configurações para instalar o Flow, com a instrução do dispositivo atual.
 */
export function InstalarCortai({ emGrupo = false }: { emGrupo?: boolean }) {
  const { pronto, plataforma, instalado, podeInstalarAgora, instalar } = useInstalacao();
  const [verInstrucao, setVerInstrucao] = useState(false);

  if (!pronto) return null;

  if (instalado) {
    return (
      <div className={emGrupo ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4" : "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-b border-line py-5"}>
        <CheckCircle2 size={18} className="text-[var(--figaro-primary,var(--primary))]" />
        <span className="text-sm text-paper">Flow já está instalado neste dispositivo</span>
      </div>
    );
  }

  const instrucao = instrucaoDeInstalacao(plataforma);

  return (
    <div className={emGrupo ? "overflow-hidden rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-2" : "border-b border-line py-2"}>
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          if (podeInstalarAgora) void instalar();
          else setVerInstrucao((v) => !v);
        }}
        className={`grid h-auto min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-start gap-4 whitespace-normal text-left ${emGrupo ? "rounded-[12px] px-2 py-2" : "rounded-none px-0 py-3"}`}
      >
        <Smartphone size={18} className="text-mute" />
        <span className="min-w-0">
          <span className="block text-sm text-paper">Instalar Flow</span>
          <span className="mt-0.5 block text-xs text-mute">Acesso mais rápido ao seu sistema</span>
        </span>
        <Download size={16} className="text-mute2" />
      </Button>
      {verInstrucao && !podeInstalarAgora ? (
        <p className="mb-3 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] px-3 py-3 text-sm leading-relaxed text-mute">
          {instrucao}
        </p>
      ) : null}
    </div>
  );
}
