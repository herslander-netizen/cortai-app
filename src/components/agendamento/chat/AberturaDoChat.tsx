import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { textoDeSempre, textoHorarioFuturo, textoRetomar } from "@/lib/conversa/respostas";
import { Fala } from "./BolhasDaConversa";
import { ChipsDeSugestao } from "./ChipsDeSugestao";
import type { HorarioFuturo } from "./tipos";

/** Primeira bolha para quem volta: horário futuro, rascunho ou "o de sempre". */
export function AberturaDoChat({
  tipo,
  futuro,
  primeiroNome,
  servicoNome,
  profissionalNome,
  diaRascunho,
  onDeSempre,
  onOutroServico,
  onOutroProfissional,
  onContinuar,
  onRecomecar,
  onNovo,
}: {
  tipo: "futuro" | "retomar" | "sempre";
  futuro: HorarioFuturo | null;
  primeiroNome?: string | undefined;
  servicoNome?: string | undefined;
  profissionalNome?: string | undefined;
  diaRascunho?: string | undefined;
  onDeSempre: () => void;
  onOutroServico: () => void;
  onOutroProfissional: () => void;
  onContinuar: () => void;
  onRecomecar: () => void;
  onNovo: () => void;
}) {
  if (tipo === "futuro" && futuro) {
    return (
      <Fala>
        <p>{textoHorarioFuturo(futuro.dia, futuro.hora)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" className="h-12 rounded-full px-4" onClick={futuro.onVer}>
            Ver
          </Button>
          <Button variant="outline" className="h-12 rounded-full px-4" onClick={futuro.onRemarcar}>
            Remarcar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-12 rounded-full px-4">
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar este horário?</AlertDialogTitle>
                <AlertDialogDescription>
                  {textoHorarioFuturo(futuro.dia, futuro.hora)} O horário fica livre para outra
                  pessoa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-12">Manter</AlertDialogCancel>
                <AlertDialogAction
                  className="min-h-12"
                  disabled={futuro.cancelando}
                  onClick={futuro.onCancelar}
                >
                  Cancelar horário
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="ghost" className="h-12 rounded-full px-4" onClick={onNovo}>
            Novo horário
          </Button>
        </div>
      </Fala>
    );
  }
  if (tipo === "retomar" && servicoNome) {
    return (
      <Fala>
        <p>{textoRetomar(servicoNome, diaRascunho)}</p>
        <div className="mt-3">
          <ChipsDeSugestao
            quebrar
            chips={[
              { rotulo: "Continuar", acao: onContinuar },
              { rotulo: "Recomeçar", acao: onRecomecar },
            ]}
          />
        </div>
      </Fala>
    );
  }
  if (tipo === "sempre" && servicoNome) {
    return (
      <Fala>
        <p>{textoDeSempre(primeiroNome, servicoNome, profissionalNome)}</p>
        <div className="mt-3">
          <ChipsDeSugestao
            quebrar
            chips={[
              { rotulo: "O de sempre", acao: onDeSempre },
              { rotulo: "Outro serviço", acao: onOutroServico },
              { rotulo: "Outro profissional", acao: onOutroProfissional },
            ]}
          />
        </div>
      </Fala>
    );
  }
  return null;
}
