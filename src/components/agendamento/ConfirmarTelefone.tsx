import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { situacaoDaConfirmacaoDoTelefone } from "@/lib/agendamento-publico.functions";
import { textoDoCodigo } from "@/lib/verificacao-telefone";

export type PedidoDeConfirmacao = { verificacaoId: string; codigo: string; link: string };

/**
 * O WhatsApp informado já tem cadastro no negócio: a pessoa confirma que o número é dela
 * mandando o código para o WhatsApp do negócio. Assim que a mensagem chega, o horário
 * é concluído sozinho (`aoConfirmar`).
 */
export function ConfirmarTelefone({
  slug,
  telefone,
  pedido,
  aoConfirmar,
  aoGerarOutro,
  aoFechar,
}: {
  slug: string;
  telefone: string;
  pedido: PedidoDeConfirmacao | null;
  aoConfirmar: (verificacaoId: string) => void;
  aoGerarOutro: () => void;
  aoFechar: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["confirmacao-telefone", pedido?.verificacaoId],
    queryFn: () =>
      situacaoDaConfirmacaoDoTelefone({
        data: { slug, telefone, verificacaoId: pedido!.verificacaoId },
      }),
    enabled: !!pedido,
    refetchInterval: (q) => (q.state.data?.situacao === "pendente" || !q.state.data ? 3000 : false),
    refetchIntervalInBackground: true,
    retry: false,
  });
  const situacao = data?.situacao ?? "pendente";

  // Cada pedido conclui o horário uma vez só, mesmo com várias renderizações.
  const concluido = useRef<string | null>(null);
  useEffect(() => {
    if (!pedido || situacao !== "confirmado" || concluido.current === pedido.verificacaoId) return;
    concluido.current = pedido.verificacaoId;
    aoConfirmar(pedido.verificacaoId);
  }, [pedido, situacao, aoConfirmar]);

  return (
    <Sheet open={!!pedido} onOpenChange={(aberto) => (!aberto ? aoFechar() : undefined)}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-ink2 px-5 pb-8 pt-6">
        <SheetHeader className="text-left">
          <SheetTitle>Confirme seu WhatsApp</SheetTitle>
          <SheetDescription>
            Este número já tem cadastro aqui. Para usar o seu cadastro, envie o código abaixo para o
            WhatsApp do negócio. O horário é concluído assim que a mensagem chegar.
          </SheetDescription>
        </SheetHeader>

        {pedido ? (
          <div className="mt-5 space-y-4">
            <p
              className="rounded-2xl border border-line2 bg-ink px-4 py-3 text-center text-lg font-semibold tracking-[0.2em] text-paper"
              aria-label={`Código ${pedido.codigo.split("").join(" ")}`}
            >
              {textoDoCodigo(pedido.codigo)}
            </p>
            {situacao === "expirado" ? (
              <>
                <p className="text-sm text-brick">O código expirou. Gere outro para continuar.</p>
                <Button variant="primary" className="w-full" onClick={aoGerarOutro}>
                  Gerar outro código
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" className="w-full" asChild>
                  <a href={pedido.link} target="_blank" rel="noopener noreferrer">
                    Enviar código pelo WhatsApp
                  </a>
                </Button>
                <p className="text-center text-xs text-mute" aria-live="polite">
                  {situacao === "confirmado"
                    ? "Telefone confirmado. Concluindo seu horário…"
                    : "Aguardando o código chegar…"}
                </p>
              </>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
