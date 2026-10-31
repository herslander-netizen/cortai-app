import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Clock3, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { SeletorDeHorario } from "@/components/ui/seletor-de-horario";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { aviso } from "@/lib/avisos";
import { hojeNoFuso } from "@/lib/horarios";
import { horarioEspecialValido } from "@/lib/horarios-especiais";
import {
  listarHorariosEspeciaisDoDia,
  removerHorarioEspecial,
  salvarHorarioEspecial,
} from "@/lib/horarios-especiais.functions";

import { dataEditorial } from "./tempo";

type HorarioEspecial = {
  id: string;
  dia: string;
  profissionalId: string | null;
  abre: string;
  fecha: string;
};

/** Ajusta a janela de funcionamento em uma data, para o negócio ou um profissional. */
export function HorarioEspecialSheet({
  aberto,
  onAberto,
  dia,
  fuso,
  profissionais,
}: {
  aberto: boolean;
  onAberto: (valor: boolean) => void;
  dia: string;
  fuso: string;
  profissionais: { id: string; nome: string }[];
}) {
  const qc = useQueryClient();
  const listarFn = useServerFn(listarHorariosEspeciaisDoDia);
  const salvarFn = useServerFn(salvarHorarioEspecial);
  const removerFn = useServerFn(removerHorarioEspecial);
  const hoje = hojeNoFuso(fuso);
  const diaInicial = dia < hoje ? hoje : dia;
  const [diaEscolhido, setDiaEscolhido] = useState(diaInicial);
  const [profissionalId, setProfissionalId] = useState("");
  const [abre, setAbre] = useState("08:00");
  const [fecha, setFecha] = useState("20:00");
  const [relogio, setRelogio] = useState<"abre" | "fecha" | null>(null);
  const [confirmar, dialogoDeConfirmacao] = useConfirmar();
  const chave = ["horarios-especiais", diaEscolhido] as const;
  const lista = useQuery({
    queryKey: chave,
    queryFn: () => listarFn({ data: { dia: diaEscolhido } }),
    enabled: aberto,
  });

  useEffect(() => {
    if (!aberto) return;
    setDiaEscolhido(dia < hoje ? hoje : dia);
    setProfissionalId("");
    setAbre("08:00");
    setFecha("20:00");
    setRelogio(null);
  }, [aberto, dia]);

  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: ["horarios-especiais"] });
    void qc.invalidateQueries({ queryKey: ["agenda-dia"] });
    void qc.invalidateQueries({ queryKey: ["agenda-periodo"] });
  };

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          dia: diaEscolhido,
          profissionalId: profissionalId || null,
          abre,
          fecha,
        },
      }),
    onSuccess: () => {
      atualizar();
      aviso.ok("Horário especial salvo para esta data.");
    },
    onError: (erro) =>
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível salvar."),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: () => {
      atualizar();
      aviso.ok("Horário especial removido.");
    },
    onError: (erro) =>
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível remover."),
  });

  const nomeDoAlvo = (id: string | null) =>
    id ? (profissionais.find((p) => p.id === id)?.nome ?? "Profissional") : "Negócio todo";
  // Mesma regra do servidor (antes um `\\d` na expressão recusava qualquer horário e travava o botão).
  const valido = horarioEspecialValido(abre, fecha);
  const ocupado = salvar.isPending || remover.isPending;

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-base text-paper">Horário especial</SheetTitle>
          <SheetDescription className="text-sm text-mute">
            Altere a abertura e o fechamento somente nesta data. A agenda semanal continua igual.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <label className="block text-sm text-mute">
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4" aria-hidden /> Data
            </span>
            <input
              type="date"
              value={diaEscolhido}
              min={hoje}
              onChange={(e) => setDiaEscolhido(e.target.value)}
              className="field-control mt-1 min-h-12 w-full"
              aria-label="Data do horário especial"
            />
          </label>

          <label className="block text-sm text-mute">
            Aplicar a
            <select
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
              className="field-control mt-1 min-h-12 w-full"
            >
              <option value="">Negócio todo</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { qual: "abre", rotulo: "Abrir às", valor: abre },
                { qual: "fecha", rotulo: "Fechar às", valor: fecha },
              ] as const
            ).map(({ qual, rotulo, valor }) => (
              <div key={qual} className="min-w-0 text-sm text-mute">
                {rotulo}
                <button
                  type="button"
                  onClick={() => setRelogio(qual)}
                  className="field-control mt-1 flex min-h-12 w-full items-center justify-center gap-2 text-lg font-semibold tabular-nums text-paper"
                  aria-label={`${rotulo}: ${valor}`}
                >
                  <Clock3 className="size-4" aria-hidden /> {valor}
                </button>
              </div>
            ))}
          </div>

          <SeletorDeHorario
            aberto={relogio !== null}
            titulo={relogio === "fecha" ? "Fechar às" : "Abrir às"}
            valor={relogio === "fecha" ? fecha : abre}
            onAberto={(v) => !v && setRelogio(null)}
            onEscolher={(v) => (relogio === "fecha" ? setFecha(v) : setAbre(v))}
          />

          <p className="rounded-xl bg-ink3 px-3 py-3 text-sm text-mute">
            {profissionalId
              ? "Este profissional terá uma janela própria nesta data. A escala semanal dele não será usada neste dia."
              : "A janela do negócio será ajustada nesta data. Profissionais que não acompanham a extensão continuam respeitando seus próprios horários."}
          </p>

          {!valido ? (
            <p className="text-sm text-brick" role="alert">
              O fechamento precisa ser depois da abertura, no mesmo dia.
            </p>
          ) : null}

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-0"
              disabled={ocupado}
              onClick={() => onAberto(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-w-0"
              disabled={!valido || diaEscolhido < hoje || ocupado}
              onClick={() => salvar.mutate()}
            >
              {salvar.isPending ? "Salvando…" : "Salvar horário"}
            </Button>
          </div>
        </div>

        {lista.isLoading ? (
          <p className="mt-5 text-sm text-mute">Carregando ajustes…</p>
        ) : lista.data?.length ? (
          <section className="mt-6" aria-label="Horários especiais cadastrados">
            <h3 className="text-sm font-semibold text-paper">Ajustes desta data</h3>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {lista.data.map((item: HorarioEspecial) => (
                <li key={item.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular-nums text-paper">
                      {item.abre} – {item.fecha}
                    </p>
                    <p className="truncate text-xs text-mute">{nomeDoAlvo(item.profissionalId)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 shrink-0"
                    disabled={ocupado}
                    onClick={async () => {
                      const ok = await confirmar({
                        titulo: "Remover este horário especial?",
                        descricao: `${nomeDoAlvo(item.profissionalId)} volta ao horário da semana nesta data. Atendimentos já marcados continuam. Esta ação não pode ser desfeita: se mudar de ideia, será preciso criar o horário especial de novo.`,
                        confirmar: "Remover",
                        cancelar: "Cancelar",
                      });
                      if (ok) remover.mutate(item.id);
                    }}
                    aria-label={`Remover horário especial de ${nomeDoAlvo(item.profissionalId)}`}
                  >
                    <Trash2 aria-hidden /> Remover
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-5 text-center text-sm text-mute">
            Nenhum horário especial em {dataEditorial(diaEscolhido)}.
          </p>
        )}
        {dialogoDeConfirmacao}
      </SheetContent>
    </Sheet>
  );
}
