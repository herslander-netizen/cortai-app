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
 * Faixa de desempenho logo abaixo do cartão Sua Página, como no Figaro (captura do dono, 26/10): 36 dp, texto 13.
 * Sem visitas nem agendamentos na semana: só "O desempenho aparecerá aqui". Com números, recolhível:
 * "Ver desempenho · últimos 7 dias"; aberta, as três métricas em cima e o rótulo embaixo.
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
    enabled: ativo,
  });
  if (isError) return null;
  const temNumeros = Boolean(data && (data.visitas > 0 || data.agendamentos > 0));
  const mostrar = aberta && temNumeros;
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
  const rotulo = (
    <>
      <TrendingUp className="size-[14px] shrink-0" aria-hidden />
      <span className="flex-1 truncate">
        {!temNumeros
          ? "O desempenho aparecerá aqui"
          : mostrar
            ? "Desempenho dos últimos 7 dias"
            : "Ver desempenho · últimos 7 dias"}
      </span>
    </>
  );
  const linha =
    "flex min-h-[31px] w-full items-center gap-1.5 px-3 text-left text-[13px] font-medium leading-[18px] text-mute";
  return (
    <div className="overflow-hidden rounded-b-[28px] rounded-t-[4px] bg-drawer-band">
      <div
        className={`grid transition-[grid-template-rows] duration-[var(--mola-tamanho-duracao)] ease-[var(--mola-tamanho)] motion-reduce:transition-none ${mostrar ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
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
      {temNumeros ? (
        <Button
          variant="ghost"
          onClick={alternar}
          aria-expanded={mostrar}
          className={`${linha} h-auto justify-start rounded-none whitespace-normal hover:bg-transparent`}
        >
          {rotulo}
          <ChevronDown
            className={`size-[14px] transition-transform duration-[var(--mola-padrao-duracao)] ease-[var(--mola-padrao)] motion-reduce:transition-none ${mostrar ? "rotate-180" : ""}`}
            aria-hidden
          />
        </Button>
      ) : (
        <p className={linha}>{rotulo}</p>
      )}
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
