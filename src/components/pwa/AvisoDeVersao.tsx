import { useEffect, useState } from "react";

import {
  buscarVersaoPublicada,
  situacaoDaVersao,
  URL_DE_ATUALIZACAO,
  type SituacaoDaVersao,
} from "@/lib/versao";
import { useModoFoco } from "@/lib/modo-foco";
import { EVENTO_ABRIR_NOVIDADES } from "@/components/sistema/NovidadesDaVersao";

const CHAVE_ADIADO = "cortai:versao-adiada";

/**
 * Aviso de nova versão.
 * - Abaixo da versão mínima: modal que não fecha, com "Atualizar agora".
 * - Só recomendada: faixa discreta com "Atualizar" e "Agora não".
 * Nada aparece quando o aplicativo está em dia.
 */
export function AvisoDeVersao() {
  const foco = useModoFoco();
  const [situacao, setSituacao] = useState<SituacaoDaVersao>("em_dia");
  const [destino, setDestino] = useState(URL_DE_ATUALIZACAO);
  const [adiado, setAdiado] = useState(true);

  useEffect(() => {
    let vivo = true;
    const verificar = async () => {
      const info = await buscarVersaoPublicada();
      if (!vivo || !info) return;
      const estado = situacaoDaVersao(info);
      setSituacao(estado);
      setDestino(info.url);
      if (estado === "recomendada") {
        setAdiado(sessionStorage.getItem(CHAVE_ADIADO) === info.atual);
      } else {
        setAdiado(false);
      }
    };
    void verificar();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void verificar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  function atualizar() {
    window.location.replace(destino);
  }

  if (situacao === "obrigatoria") {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-nova-versao"
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        style={{ background: "rgba(11,11,11,.82)", backdropFilter: "blur(6px)" }}
      >
        <div className="w-full max-w-sm rounded-2xl border border-line2 bg-ink2 p-6 text-center">
          <h2 id="titulo-nova-versao" className="text-base text-paper">
            Nova versão disponível
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Uma nova versão do Cortaí está disponível. Atualize o aplicativo para continuar usando
            todos os recursos.
          </p>
          <button
            type="button"
            onClick={atualizar}
            className="mt-5 w-full rounded-lg bg-gold px-4 py-3 text-sm font-medium text-ink"
          >
            Atualizar agora
          </button>
        </div>
      </div>
    );
  }

  if (foco) return null;

  if (situacao !== "recomendada" || adiado) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-line2 bg-ink2 px-4 py-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_NOVIDADES))}
          className="min-w-0 flex-1 text-left text-xs text-paper underline-offset-2 hover:underline"
        >
          Cortaí 3.0 disponível
        </button>
        <button
          type="button"
          onClick={atualizar}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink"
        >
          Atualizar
        </button>
        <button
          type="button"
          onClick={() => {
            void buscarVersaoPublicada().then((info) => {
              if (info) sessionStorage.setItem(CHAVE_ADIADO, info.atual);
            });
            setAdiado(true);
          }}
          className="rounded-lg border border-line2 px-3 py-1.5 text-xs text-mute"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
