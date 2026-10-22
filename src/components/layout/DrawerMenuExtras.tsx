import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, TrendingUp } from "lucide-react";

import { CartaoDeAvisoDoMenu } from "@/components/layout/CartaoDeAvisoDoMenu";
import { Button } from "@/components/ui/button";
import { Odometro } from "@/components/ui/Odometro";
import { PulsoDeNumero } from "@/components/ui/PulsoDeNumero";
import { getDesempenhoDaSemana } from "@/lib/desempenho-menu.functions";
import { TEXTO_INSTALAR_PRIMEIRO } from "@/lib/push/ativar";
import { marcarCartaoDeAvisosNoMenu, useConviteDeAvisos } from "@/lib/push/convite-avisos";

const CHAVE_FAIXA = "cortai-menu-desempenho-aberto";

/**
 * Faixa recolhível de desempenho, logo abaixo do cartão Sua Página. Fechada: uma linha
 * "Ver desempenho · últimos 7 dias". Aberta: as três métricas em cima e o rótulo embaixo.
 */
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
    <div className="overflow-hidden rounded-b-[28px] rounded-t-[10px] bg-drawer-band">
      <div
        className={`grid transition-[grid-template-rows] duration-[var(--mola-tamanho-duracao)] ease-[var(--mola-tamanho)] motion-reduce:transition-none ${aberta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-3 gap-2 px-3 pt-3" aria-busy={isLoading}>
            {blocos.map((b) => (
              <div key={b.rotulo} className="rounded-[20px] bg-drawer-card px-4 py-3 text-left">
                <p className="text-2xl font-semibold tabular-nums text-paper">
                  {b.valor === undefined ? (
                    <span className="text-mute">–</span>
                  ) : (
                    <PulsoDeNumero chave={String(b.valor)}>
                      <Odometro texto={String(b.valor)} />
                    </PulsoDeNumero>
                  )}
                </p>
                <p className="mt-1 text-xs text-mute">{b.rotulo}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={alternar}
        aria-expanded={aberta}
        className="min-h-12 w-full justify-start gap-2 whitespace-normal px-5 py-2 text-left text-sm font-normal text-mute hover:bg-transparent"
      >
        <TrendingUp className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">
          {aberta ? "Desempenho dos últimos 7 dias" : "Ver desempenho · últimos 7 dias"}
        </span>
        <ChevronDown
          className={`size-4 transition-transform duration-[var(--mola-padrao-duracao)] ease-[var(--mola-padrao)] motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`}
          aria-hidden
        />
      </Button>
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
    <CartaoDeAvisoDoMenu
      icone={Bell}
      titulo="Ative as notificações"
      texto={
        instalarPrimeiro
          ? TEXTO_INSTALAR_PRIMEIRO
          : "Não perca agendamentos novos e cancelamentos de última hora"
      }
    >
      {instalarPrimeiro ? null : (
        <Button className="h-10 rounded-full px-5 text-sm" onClick={() => void ativar()}>
          Ativar
        </Button>
      )}
      <Button
        variant="ghost"
        className="h-10 rounded-full px-3 text-sm text-mute"
        onClick={dispensar}
      >
        {instalarPrimeiro ? "Entendi" : "Agora não"}
      </Button>
    </CartaoDeAvisoDoMenu>
  );
}
