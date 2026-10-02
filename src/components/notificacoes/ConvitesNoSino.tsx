import { Bell, Download, X } from "lucide-react";
import { useState } from "react";

import { useAvisosDoAparelho } from "@/lib/avisos-do-navegador";
import { useInstalacao } from "@/lib/pwa";

const TEXTO_AVISOS = "Avise-me de novos agendamentos, pagamentos e cancelamentos.";

/**
 * Convites de instalar o app e ligar os avisos, fixos no topo da lista do sino.
 * Mesmas regras de quando aparecem e de dispensar; não contam no selo.
 */
export function ConvitesNoSino() {
  const inst = useInstalacao();
  const avisos = useAvisosDoAparelho();
  const [verComoNoIphone, setVerComoNoIphone] = useState(false);

  const mostraInstalar =
    inst.pronto &&
    !inst.instalado &&
    !inst.dispensado &&
    !inst.emIframe &&
    (inst.podeInstalarAgora || inst.plataforma === "ios");
  const mostraAvisos = avisos.pronto && !avisos.dispensado && avisos.estado === "perguntar";
  if (!mostraInstalar && !mostraAvisos) return null;

  return (
    <ul aria-label="Convites" className="border-b border-line">
      {mostraInstalar ? (
        <li className="flex items-start gap-3 px-5 py-3">
          <Download size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-paper">📲 Instale o Cortaí</p>
            <p className="text-xs text-mute2">Tenha acesso mais rápido ao seu sistema.</p>
            {verComoNoIphone ? (
              <p className="mt-2 text-xs leading-relaxed text-mute">
                No iPhone ou iPad, abra o Cortaí no Safari, toque em{" "}
                <span className="text-paper">Compartilhar</span> e depois em{" "}
                <span className="text-paper">Adicionar à Tela de Início</span>.
              </p>
            ) : null}
            <button
              type="button"
              className="mt-2 min-h-11 text-xs font-bold text-gold"
              onClick={() => {
                if (inst.podeInstalarAgora) void inst.instalar();
                else setVerComoNoIphone(true);
              }}
            >
              {inst.podeInstalarAgora ? "Instalar" : "Como instalar"}
            </button>
          </div>
          <button
            type="button"
            onClick={inst.dispensar}
            aria-label="Fechar convite"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-mute"
          >
            <X size={15} />
          </button>
        </li>
      ) : null}
      {mostraAvisos ? (
        <li className="flex items-start gap-3 px-5 py-3">
          <Bell size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-paper">Ativar avisos</p>
            <p className="text-xs text-mute2">{TEXTO_AVISOS}</p>
            <button
              type="button"
              className="mt-2 min-h-11 text-xs font-bold text-gold"
              onClick={() => {
                void avisos.pedir().then((ok) => {
                  if (!ok) avisos.dispensar();
                });
              }}
            >
              Ativar avisos
            </button>
          </div>
          <button
            type="button"
            onClick={avisos.dispensar}
            aria-label="Fechar convite de avisos"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-mute"
          >
            <X size={15} />
          </button>
        </li>
      ) : null}
    </ul>
  );
}
