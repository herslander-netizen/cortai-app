import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDesempenhoDaSemana } from "@/lib/desempenho-menu.functions";
import { TEXTO_INSTALAR_PRIMEIRO } from "@/lib/push/ativar";
import { marcarCartaoDeAvisosNoMenu, useConviteDeAvisos } from "@/lib/push/convite-avisos";

const CHAVE_FAIXA = "cortai-menu-desempenho-aberto";

/** Faixa recolhível "Desempenho dos últimos 7 dias" (dentro do bloco Sua Página). */
export function FaixaDesempenho({ tenantId, ativo }: { tenantId: string; ativo: boolean }) {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    try {
      setAberta(window.localStorage.getItem(CHAVE_FAIXA) === "sim");
    } catch {
      /* padrão: recolhida */
    }
  }, []);
  const { data, isError, isLoading } = useQuery({
    queryKey: ["desempenho-menu", tenantId],
    queryFn: () => getDesempenhoDaSemana({ data: { tenantId } }),
    staleTime: 60_000,
    retry: false,
    enabled: ativo && aberta,
  });
  if (isError) return null;
  function alternar() {
    setAberta((a) => {
      try {
        window.localStorage.setItem(CHAVE_FAIXA, a ? "nao" : "sim");
      } catch {
        /* opcional */
      }
      return !a;
    });
  }
  const blocos = [
    { rotulo: "Visitas", valor: data?.visitas },
    { rotulo: "Agend.", valor: data?.agendamentos },
    { rotulo: "Conversão", valor: data ? `${data.conversao}%` : undefined },
  ];
  return (
    <div className="bg-drawer-band">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberta}
        className="flex min-h-11 w-full items-center gap-2 px-5 py-2 text-left text-sm text-mute"
      >
        <TrendingUp className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Desempenho dos últimos 7 dias</span>
        <ChevronDown
          className={`size-4 transition-transform duration-[150ms] motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-[150ms] motion-reduce:transition-none ${aberta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-3 gap-2 px-4 pb-4" aria-busy={isLoading}>
            {blocos.map((b) => (
              <div key={b.rotulo} className="rounded-[20px] bg-drawer-card px-2 py-3 text-center">
                <p className="text-xl font-semibold tabular-nums text-paper">
                  {b.valor ?? <span className="text-mute">–</span>}
                </p>
                <p className="mt-0.5 text-xs text-mute">{b.rotulo}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cartão "Ative as notificações" — mesmas regras do convite flutuante. */
export function CartaoAvisosDoMenu({ tenantId }: { tenantId: string | null }) {
  const { elegivel, instalarPrimeiro, ativar, dispensar } = useConviteDeAvisos(tenantId);
  const visivel = elegivel && !!tenantId;
  useEffect(() => {
    marcarCartaoDeAvisosNoMenu(visivel);
    return () => marcarCartaoDeAvisosNoMenu(false);
  }, [visivel]);
  if (!visivel) return null;
  return (
    <div className="rounded-[28px] border border-drawer-borda bg-drawer-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-drawer-band text-primary">
          <Bell className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-paper">Ative as notificações</p>
          <p className="mt-1 text-sm leading-5 text-mute">
            {instalarPrimeiro
              ? TEXTO_INSTALAR_PRIMEIRO
              : "Não perca agendamentos novos e cancelamentos de última hora"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {instalarPrimeiro ? null : (
          <Button className="h-11 rounded-full px-6" onClick={() => void ativar()}>
            Ativar
          </Button>
        )}
        <Button variant="ghost" className="h-11 rounded-full px-4 text-mute" onClick={dispensar}>
          {instalarPrimeiro ? "Entendi" : "Agora não"}
        </Button>
      </div>
    </div>
  );
}
