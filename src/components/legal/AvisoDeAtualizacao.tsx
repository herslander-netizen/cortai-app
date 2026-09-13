import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";

import { DOCUMENTOS_DE_ACEITE, VERSAO_DO_ACEITE } from "@/lib/legal/documentos";
import { meusAceites, registrarAceite } from "@/lib/legal/aceite.functions";

/**
 * Aviso não bloqueante de nova versão dos termos.
 * Nunca impede o uso do app: é uma faixa fina, dispensável, acima da navegação.
 */
export function AvisoDeAtualizacao() {
  const [fechado, setFechado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["aceites-legais"],
    queryFn: () => meusAceites(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!data || fechado || salvando) return null;
  const pendente = DOCUMENTOS_DE_ACEITE.some((doc) => {
    const registro = data[doc];
    return !registro || !registro.aceito || registro.versao !== VERSAO_DO_ACEITE;
  });
  if (!pendente) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 px-4">
      <div className="mx-auto grid max-w-[520px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-line2 bg-ink2/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-paper">Atualizamos nossos termos</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mute">
            Dê uma olhada nos{" "}
            <Link to="/legal/$documento" params={{ documento: "termos-de-uso" }} className="underline">
              Termos de Uso
            </Link>{" "}
            e na{" "}
            <Link to="/legal/$documento" params={{ documento: "privacidade" }} className="underline">
              Política de Privacidade
            </Link>
            .
          </p>
          <button
            type="button"
            className="mt-2 h-8 rounded-lg bg-gold px-3 text-[11px] font-bold text-ink"
            onClick={async () => {
              setSalvando(true);
              try {
                for (const doc of DOCUMENTOS_DE_ACEITE) {
                  await registrarAceite({
                    data: { documento: doc, versao: VERSAO_DO_ACEITE, aceito: true, origem: "novo-aceite" },
                  });
                }
                await refetch();
              } finally {
                setSalvando(false);
                setFechado(true);
              }
            }}
          >
            Li e concordo
          </button>
        </div>
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => setFechado(true)}
          className="self-start rounded-md p-1 text-mute2 transition-colors hover:text-paper"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
