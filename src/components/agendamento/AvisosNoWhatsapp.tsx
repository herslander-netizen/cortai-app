import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  pedirAvisosNoWhatsapp,
  situacaoDaConfirmacaoDoTelefone,
} from "@/lib/agendamento-publico.functions";
import { textoDoCodigo } from "@/lib/verificacao-telefone";

/**
 * Número novo: nada sai pelo WhatsApp até a pessoa confirmar que o número é dela.
 * Aqui ela ativa os avisos mandando o código para o WhatsApp do negócio; ao chegar,
 * a confirmação deste horário é enviada por lá.
 */
export function AvisosNoWhatsapp({
  slug,
  telefone,
  estado,
}: {
  slug: string;
  telefone: string;
  estado: "ativos" | "confirmar" | "sem_whatsapp" | undefined;
}) {
  const pedir = useMutation({
    mutationFn: () => pedirAvisosNoWhatsapp({ data: { slug, telefone } }),
  });
  const pedido = pedir.data ?? null;
  const { data } = useQuery({
    queryKey: ["avisos-whatsapp", pedido?.verificacaoId],
    queryFn: () =>
      situacaoDaConfirmacaoDoTelefone({
        data: { slug, telefone, verificacaoId: pedido!.verificacaoId },
      }),
    enabled: !!pedido,
    refetchInterval: (q) => (q.state.data?.situacao === "pendente" || !q.state.data ? 3000 : false),
    retry: false,
  });
  if (estado !== "confirmar") return null;
  const situacao = data?.situacao ?? "pendente";

  return (
    <section className="rounded-2xl border border-line2 bg-ink2 px-4 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-paper">
        <MessageCircle size={16} aria-hidden /> Receber avisos no WhatsApp
      </h3>
      {situacao === "confirmado" ? (
        <p className="mt-2 text-sm text-sage" aria-live="polite">
          Pronto: a confirmação e os lembretes chegam no seu WhatsApp.
        </p>
      ) : !pedido ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-mute">
            Para receber a confirmação e os lembretes, envie um código para o WhatsApp do negócio.
            Assim só você recebe mensagens deste número.
          </p>
          {pedir.isSuccess && !pedir.data ? (
            <p className="mt-2 text-xs text-mute">
              O WhatsApp do negócio não está disponível agora. Seu horário continua marcado.
            </p>
          ) : (
            <Button
              variant="outline"
              className="mt-3 w-full"
              disabled={pedir.isPending}
              onClick={() => pedir.mutate()}
            >
              {pedir.isPending ? "Gerando código…" : "Ativar avisos no WhatsApp"}
            </Button>
          )}
          {pedir.error ? (
            <p className="mt-2 text-xs text-brick">{(pedir.error as Error).message}</p>
          ) : null}
        </>
      ) : situacao === "expirado" ? (
        <>
          <p className="mt-2 text-xs text-brick">O código expirou.</p>
          <Button variant="outline" className="mt-3 w-full" onClick={() => pedir.mutate()}>
            Gerar outro código
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 rounded-xl border border-line2 bg-ink px-4 py-2.5 text-center font-semibold tracking-[0.2em] text-paper">
            {textoDoCodigo(pedido.codigo)}
          </p>
          <Button variant="primary" className="mt-3 w-full" asChild>
            <a href={pedido.link} target="_blank" rel="noopener noreferrer">
              Enviar código pelo WhatsApp
            </a>
          </Button>
          <p className="mt-2 text-center text-xs text-mute" aria-live="polite">
            Aguardando o código chegar…
          </p>
        </>
      )}
    </section>
  );
}
