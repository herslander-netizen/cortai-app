import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useConsentimento } from "@/lib/consentimento";
import { useModoFoco } from "@/lib/modo-foco";
import { instrucaoDeInstalacao, marcarConviteDeInstalacao, useInstalacao } from "@/lib/pwa";

/**
 * Convite discreto para instalar o Flow, mostrado dentro do app depois do login.
 * Nunca bloqueia a tela, respeita o "Agora não" e some quando o app já está instalado.
 */
export function ConviteDeInstalacao({ posicao = "base" }: { posicao?: "base" | "topo" }) {
  const foco = useModoFoco();
  // Um aviso por vez: espera o banner de cookies ser respondido.
  const { pronto: cookiesProntos, consentimento } = useConsentimento();
  const {
    pronto,
    plataforma,
    instalado,
    dispensado,
    emIframe,
    podeInstalarAgora,
    instalar,
    dispensar,
  } = useInstalacao();
  const [passouTempo, setPassouTempo] = useState(false);
  const [verComoNoIphone, setVerComoNoIphone] = useState(false);
  const podeOrientar = plataforma === "ios" || plataforma === "android";
  const visivel =
    !foco &&
    cookiesProntos &&
    Boolean(consentimento) &&
    pronto &&
    passouTempo &&
    !instalado &&
    !dispensado &&
    !emIframe &&
    (podeInstalarAgora || podeOrientar);

  useEffect(() => {
    marcarConviteDeInstalacao(visivel);
    return () => marcarConviteDeInstalacao(false);
  }, [visivel]);

  useEffect(() => {
    const t = window.setTimeout(() => setPassouTempo(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!visivel) return null;
  const lugar =
    posicao === "topo"
      ? "top-[calc(76px+env(safe-area-inset-top))]"
      : "bottom-[calc(88px+env(safe-area-inset-bottom))]";

  return (
    <div className={`pointer-events-none fixed inset-x-0 ${lugar} z-40 flex justify-center px-4`}>
      <div
        role="dialog"
        aria-label="Instalar o Flow"
        className="pointer-events-auto w-full max-w-[420px] rounded-2xl border border-line bg-ink3 p-4 shadow-[var(--elevacao-8)]"
      >
        <div className="flex items-start gap-3">
          <img
            src="/icone-flow-v2-192.png"
            alt=""
            width={40}
            height={40}
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-xl border border-line"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-paper">📲 Instale o Flow</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Tenha acesso mais rápido ao seu sistema.
            </p>
          </div>
          <Button
            variant="icon"
            size="icon"
            type="button"
            onClick={dispensar}
            aria-label="Fechar convite"
            className="-mr-2 -mt-2 h-12 w-12 shrink-0 rounded-full text-mute"
          >
            <X size={15} />
          </Button>
        </div>

        {verComoNoIphone ? (
          <p className="mt-3 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-3 py-3 text-xs leading-relaxed text-mute">
            {instrucaoDeInstalacao(plataforma)}
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="primary"
            type="button"
            onClick={() => {
              if (podeInstalarAgora) void instalar();
              else setVerComoNoIphone(true);
            }}
            className="h-12 min-w-0 flex-1 rounded-lg px-3 text-xs"
          >
            <Download size={14} />
            {podeInstalarAgora ? "Instalar" : "Como instalar"}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={dispensar}
            className="h-12 rounded-lg px-4 text-xs"
          >
            Agora não
          </Button>
        </div>
      </div>
    </div>
  );
}
