import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";

type CampoPreferencia = "conversa" | "ar" | "bebida" | "musica" | "corte_habitual";
export type PerguntaDePreferencia = {
  campo: CampoPreferencia;
  texto: string;
  opcoes?: { valor: string; rotulo: string }[];
  tipo?: "texto";
  placeholder?: string;
};

const PERGUNTAS_DE_CONFORTO: PerguntaDePreferencia[] = [
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

function preferenciaDeServico(segmento: Segmento): PerguntaDePreferencia {
  switch (segmento) {
    case "barbearia":
      return {
        campo: "corte_habitual",
        texto: "Como costuma cortar?",
        tipo: "texto",
        placeholder: "Ex.: máquina, comprimento ou acabamento",
      };
    case "salao":
    case "cabeleireiro":
      return {
        campo: "corte_habitual",
        texto: "Que preferência de cabelo ou acabamento gostaria de anotar?",
        tipo: "texto",
        placeholder: "Ex.: comprimento, estilo ou acabamento",
      };
    case "esmalteria":
      return {
        campo: "corte_habitual",
        texto: "Qual cor ou estilo de unha você prefere?",
        tipo: "texto",
        placeholder: "Ex.: cor, formato ou estilo",
      };
    case "sobrancelha_cilios":
      return {
        campo: "corte_habitual",
        texto: "Qual estilo de sobrancelha ou cílios prefere?",
        tipo: "texto",
        placeholder: "Ex.: formato ou efeito",
      };
    case "estetica":
      return {
        campo: "corte_habitual",
        texto: "Qual tratamento ou objetivo gostaria de priorizar?",
        tipo: "texto",
        placeholder: "Conte o que gostaria de priorizar",
      };
    default:
      return {
        campo: "corte_habitual",
        texto: "Há alguma preferência importante para este atendimento?",
        tipo: "texto",
        placeholder: "Conte à equipe o que é importante",
      };
  }
}

/** Segmento ausente/desconhecido não recebe por engano perguntas de barbearia/beleza. */
export function perguntasParaSegmento(segmento?: unknown): PerguntaDePreferencia[] {
  const atual = segmentoParaApresentacao(segmento);
  if (atual === "outro") return [preferenciaDeServico(atual)];
  return [...PERGUNTAS_DE_CONFORTO, preferenciaDeServico(atual)];
}

/**
 * Etapa 2 em conversa: uma pergunta por vez, sempre pulável.
 * Grava pela mesma server function, token e validação do formulário.
 */
export function PreferenciasEmConversa({
  agendamentoId,
  token,
  slug,
  segmento,
}: {
  agendamentoId: string;
  token: string;
  slug: string;
  segmento?: Segmento | null;
}) {
  const perguntas = perguntasParaSegmento(segmento);
  const [visivel] = useState(() => deveMostrarPreferencias(slug));
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<PreferenciasCliente>({});
  const [respostaTexto, setRespostaTexto] = useState("");
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
    setRespostaTexto("");
    const seguinte = indice + 1;
    setIndice(seguinte);
    if (seguinte >= perguntas.length) {
      const temResposta = Object.values(proximas).some(
        (valor) => typeof valor === "string" && Boolean(valor.trim()),
      );
      if (temResposta) salvar.mutate(proximas);
      else lembrarPreferencias(slug);
    }
  }

  const pergunta = perguntas[indice];
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
                Pra deixar tudo do seu jeito ({indice + 1}/{perguntas.length})
              </p>
              <p className="mt-1 text-base font-semibold text-paper">{pergunta.texto}</p>
              {pergunta.tipo === "texto" ? (
                <div className="mt-3 grid gap-2">
                  <Input
                    className="min-h-12"
                    maxLength={60}
                    value={respostaTexto}
                    placeholder={pergunta.placeholder}
                    aria-label={pergunta.texto}
                    onChange={(e) => setRespostaTexto(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="min-h-12 rounded-full"
                    onClick={() => {
                      const texto = respostaTexto.trim();
                      avancar(
                        texto
                          ? { ...respostas, [pergunta.campo]: texto }
                          : respostas,
                      );
                    }}
                  >
                    Continuar
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-12 rounded-full"
                    onClick={() => avancar(respostas)}
                  >
                    Pular
                  </Button>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap">
                  {(pergunta.opcoes ?? []).map((o) => (
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
              )}
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
