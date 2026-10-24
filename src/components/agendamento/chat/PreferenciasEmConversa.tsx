import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  deveMostrarPreferencias,
  lembrarPreferencias,
} from "@/components/agendamento/lembrete-preferencias";
import { salvarPreferenciasDoAgendamento } from "@/lib/agendamento-publico.functions";
import {
  ROTULOS_PREFERENCIAS,
  validarPreferenciasCliente,
  type PreferenciasCliente,
} from "@/lib/preferencias-cliente";

type Pergunta = {
  campo: "conversa" | "ar" | "bebida" | "musica";
  texto: string;
  opcoes: { valor: string; rotulo: string }[];
};

const PERGUNTAS: Pergunta[] = [
  {
    campo: "conversa",
    texto: "Gosta de conversar durante o atendimento?",
    opcoes: [
      { valor: "papo", rotulo: "Conversar" },
      { valor: "silencio", rotulo: "Ficar na minha" },
      { valor: "tanto_faz", rotulo: "Tanto faz" },
    ],
  },
  {
    campo: "ar",
    texto: "E o ar-condicionado?",
    opcoes: Object.entries(ROTULOS_PREFERENCIAS.ar).map(([valor, rotulo]) => ({ valor, rotulo })),
  },
  {
    campo: "bebida",
    texto: "Aceita algo pra beber?",
    opcoes: Object.entries(ROTULOS_PREFERENCIAS.bebida).map(([valor, rotulo]) => ({
      valor,
      rotulo,
    })),
  },
  {
    campo: "musica",
    texto: "Que tipo de música curte?",
    opcoes: ["Pop", "Rock", "Sertanejo", "Funk", "MPB"].map((m) => ({ valor: m, rotulo: m })),
  },
];

/**
 * Etapa 2 em conversa: uma pergunta por vez, sempre pulável.
 * Grava pela mesma server function, token e validação do formulário.
 */
export function PreferenciasEmConversa({
  agendamentoId,
  token,
  slug,
}: {
  agendamentoId: string;
  token: string;
  slug: string;
}) {
  const [visivel] = useState(() => deveMostrarPreferencias(slug));
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<PreferenciasCliente>({});
  const salvar = useMutation({
    mutationFn: (preferencias: PreferenciasCliente) =>
      salvarPreferenciasDoAgendamento({
        data: { agendamentoId, token, preferencias: validarPreferenciasCliente(preferencias) },
      }),
    onSuccess: () => lembrarPreferencias(slug),
  });

  if (!visivel) return null;

  function avancar(proximas: PreferenciasCliente) {
    setRespostas(proximas);
    const seguinte = indice + 1;
    setIndice(seguinte);
    if (seguinte >= PERGUNTAS.length) {
      if (Object.keys(proximas).length) salvar.mutate(proximas);
      else lembrarPreferencias(slug);
    }
  }

  const pergunta = PERGUNTAS[indice];
  return (
    <Collapsible open={aberto} onOpenChange={setAberto} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="min-h-12 w-full justify-between whitespace-normal px-1 text-left text-sm font-semibold">
          Personalizar meu atendimento (opcional)
          <ChevronDown className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} aria-hidden />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <section className="surface min-w-0 px-3 py-3 sm:px-4 sm:py-4" aria-live="polite">
      {pergunta ? (
        <>
          <p className="text-xs font-semibold text-mute">
            Pra deixar tudo do seu jeito ({indice + 1}/{PERGUNTAS.length})
          </p>
          <p className="mt-1 text-base font-semibold text-paper">{pergunta.texto}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap">
            {pergunta.opcoes.map((o) => (
              <Button
                key={o.valor}
                variant="outline"
                className="min-h-12 h-auto whitespace-normal rounded-full px-4 py-2"
                onClick={() => avancar({ ...respostas, [pergunta.campo]: o.valor })}
              >
                {o.rotulo}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-12 rounded-full px-4"
              onClick={() => avancar(respostas)}
            >
              Pular
            </Button>
          </div>
        </>
      ) : (
        <p className="text-base font-semibold text-paper" role="status">
          {salvar.isError
            ? "Não consegui anotar agora. Seu horário continua confirmado."
            : salvar.isPending
              ? "Anotando…"
              : "Anotado! Até lá."}
        </p>
      )}
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
