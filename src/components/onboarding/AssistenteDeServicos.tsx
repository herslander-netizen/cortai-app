import { useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";
import type { ServicoSugerido } from "@/lib/ia/assistente";
import { interpretarServicos } from "@/lib/assistente.functions";
import { SEGMENTOS_CONFIG, segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";
import type { ServicoEditavel } from "./servicos.types";

export function AssistenteDeServicos({
  servicos,
  onChange,
  segmento,
}: {
  servicos: ServicoEditavel[];
  onChange: (servicos: ServicoEditavel[]) => void;
  segmento: Segmento;
}) {
  const interpretar = useServerFn(interpretarServicos);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [previa, setPrevia] = useState<ServicoSugerido[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const descricaoId = useId();
  const definicao = SEGMENTOS_CONFIG[segmentoParaApresentacao(segmento)];

  return (
    <section className="mt-6 rounded-xl border border-gold/40 bg-ink2 px-4 py-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-paper">
        <Sparkles size={16} className="text-gold" aria-hidden /> Quer que o Flow configure isso para
        você?
      </p>
      <label htmlFor={descricaoId} className="field-label mt-4">
        Descreva os serviços
      </label>
      <Textarea
        id={descricaoId}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder={definicao.exemploIA}
        className="min-h-24 resize-y"
      />
      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        disabled={pensando || texto.trim().length < 3}
        onClick={async () => {
          setPensando(true);
          setErro(null);
          setAviso(null);
          try {
            const resultado = await interpretar({ data: { texto } });
            if (!resultado.disponivel) setAviso(resultado.resposta);
            else if (resultado.servicos?.length) setPrevia(resultado.servicos);
            else setAviso(resultado.resposta);
          } catch (error) {
            setErro(error instanceof Error ? error.message : "Não consegui entender agora.");
          } finally {
            setPensando(false);
          }
        }}
      >
        {pensando ? "Interpretando…" : "Configurar com IA"}
      </Button>

      {previa ? (
        <div className="mt-4 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4 py-3">
          <p className="text-xs text-mute">Prévia — você ainda pode editar depois de adicionar:</p>
          <ul className="mt-2 space-y-1">
            {previa.map((servico, indice) => (
              <li key={`${servico.nome}-${indice}`} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-paper">{servico.nome}</span>
                <span className="shrink-0 text-xs text-mute">
                  {servico.duracaoMin} min · {brl(servico.precoCentavos)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3">
            <Button
              type="button"
              variant="primary"
              className="min-h-12 flex-1"
              onClick={() => {
                onChange([...servicos, ...previa.map((servico) => ({ ...servico }))]);
                setPrevia(null);
                setTexto("");
              }}
            >
              Adicionar à lista
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 text-sm"
              onClick={() => setPrevia(null)}
            >
              Descartar
            </Button>
          </div>
        </div>
      ) : null}

      {aviso ? (
        <p className="mt-3 text-sm text-mute" role="status">
          {aviso}
        </p>
      ) : null}
      {erro ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
