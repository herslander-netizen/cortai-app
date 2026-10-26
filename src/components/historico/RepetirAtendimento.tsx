import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Repeat2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { aviso } from "@/lib/avisos";
import { criarSerieAgendamentos } from "@/lib/recorrencias.functions";
import type { PeriodicidadeAgendamento } from "@/lib/recorrencia-agendamento";

const QUANTIDADES = [1, 2, 4, 6, 8, 12, 24, 51] as const;

export function RepetirAtendimento({ agendamentoId }: { agendamentoId: string }) {
  const queryClient = useQueryClient();
  const criarSerie = useServerFn(criarSerieAgendamentos);
  const [aberto, setAberto] = useState(false);
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeAgendamento>("semanal");
  const [quantidade, setQuantidade] = useState("4");
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    setSalvando(true);
    try {
      const resultado = await criarSerie({
        data: { agendamentoId, periodicidade, quantidade: Number(quantidade) },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["historico-atendimentos"] }),
        queryClient.invalidateQueries({ queryKey: ["agenda"] }),
      ]);
      setAberto(false);
      aviso.ok(`Série criada com ${resultado.totalOcorrencias} atendimentos, contando o original.`);
    } catch (erro) {
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível criar a série.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => setAberto(true)}
      >
        <Repeat2 aria-hidden size={16} />
        Repetir atendimento
      </Button>
      <Sheet open={aberto} onOpenChange={(valor) => (!salvando ? setAberto(valor) : undefined)}>
        <SheetContent side="bottom" className="space-y-5">
          <SheetHeader>
            <SheetTitle>Repetir atendimento</SheetTitle>
            <SheetDescription>
              Cria os próximos horários usando o mesmo cliente, profissional e serviço. O atendimento
              atual será a primeira ocorrência da série.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-paper">Frequência</p>
            <OpcoesConectadas
              rotulo="Frequência da série"
              valor={periodicidade}
              opcoes={[
                { valor: "semanal", texto: "Semanal" },
                { valor: "quinzenal", texto: "15 dias" },
                { valor: "mensal", texto: "Mensal" },
              ]}
              onChange={setPeriodicidade}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-sm text-mute">
            Quantos novos horários criar?
            <select
              className="field-control"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              disabled={salvando}
            >
              {QUANTIDADES.map((item) => (
                <option key={item} value={item}>
                  {item} {item === 1 ? "novo horário" : "novos horários"}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-mute">
            Todos os horários serão validados antes de confirmar. Se qualquer data estiver ocupada
            ou fora das regras do negócio, a série inteira não será criada.
          </p>
          <SheetFooter>
            <Button variant="default" className="w-full" disabled={salvando} onClick={() => void confirmar()}>
              {salvando ? "Verificando horários…" : `Criar ${quantidade} novos horários`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
