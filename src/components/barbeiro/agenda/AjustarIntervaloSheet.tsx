import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock3 } from "lucide-react";

import { SeletorDeHorario } from "@/components/ui/seletor-de-horario";
import {
  AcaoDaFolha,
  CartaoDaFolha,
  FolhaPadrao,
  LinhaDaFolha,
  NotaDaFolha,
  SecaoDaFolha,
} from "@/components/ui/folha-padrao";
import { aviso } from "@/lib/avisos";
import { diaDaSemanaDoDia, hojeNoFuso } from "@/lib/horarios";
import type { AgendaDia } from "@/lib/barbeiro.functions";
import { salvarIntervaloAgendaDia } from "@/lib/intervalos-agenda.functions";

import { dataEditorial } from "./tempo";

type Intervalo = { inicio: string; fim: string };
type Horario = AgendaDia["horarios"][number];

function min(valor: string) {
  const [h = 0, m = 0] = valor.split(":").map(Number);
  return h * 60 + m;
}
function formatarMinutos(valor: number) {
  const m = (valor + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function AjustarIntervaloSheet({
  aberto,
  onAberto,
  dia,
  fuso,
  horarios,
  intervaloPersonalizado,
}: {
  aberto: boolean;
  onAberto: (valor: boolean) => void;
  dia: string;
  fuso: string;
  horarios: Horario[];
  intervaloPersonalizado: Intervalo | null;
}) {
  const qc = useQueryClient();
  const salvarFn = useServerFn(salvarIntervaloAgendaDia);
  const hoje = hojeNoFuso(fuso);
  const horario = horarios.find((h) => h.diaSemana === diaDaSemanaDoDia(dia) && !h.fechado);
  const semanal =
    horario?.intervaloInicio && horario?.intervaloFim
      ? { inicio: horario.intervaloInicio, fim: horario.intervaloFim }
      : null;
  const atual = intervaloPersonalizado ?? semanal;
  const [inicio, setInicio] = useState(atual?.inicio ?? "12:00");
  const [fim, setFim] = useState(atual?.fim ?? "13:00");
  const [relogio, setRelogio] = useState<"inicio" | "fim" | null>(null);

  useEffect(() => {
    if (!aberto) return;
    // Reabrir começa do zero: o ✓ do último salvamento não fica marcado nem trava o botão.
    gravar.reset();
    setInicio(atual?.inicio ?? "12:00");
    setFim(atual?.fim ?? "13:00");
    setRelogio(null);
  }, [
    aberto,
    dia,
    intervaloPersonalizado?.inicio,
    intervaloPersonalizado?.fim,
    semanal?.inicio,
    semanal?.fim,
  ]);

  const gravar = useMutation({
    mutationFn: () => salvarFn({ data: { dia, inicio, fim } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda-dia", dia] });
      void qc.invalidateQueries({ queryKey: ["agenda-periodo"] });
      aviso.ok("Intervalo atualizado somente para este dia.");
      window.setTimeout(() => onAberto(false), 700);
    },
    onError: (erro) =>
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível salvar o intervalo."),
  });

  const dentroDoExpediente = (() => {
    if (!horario) return false;
    const abre = min(horario.abre);
    let fecha = min(horario.fecha);
    let ini = min(inicio);
    let fimMin = min(fim);
    if (fecha <= abre) fecha += 1440;
    if (ini < abre) ini += 1440;
    if (fimMin < abre) fimMin += 1440;
    if (fimMin <= ini) fimMin += 1440;
    return ini >= abre && fimMin <= fecha && fimMin > ini;
  })();
  const duracao = (() => {
    let v = min(fim) - min(inicio);
    if (v <= 0) v += 1440;
    return v;
  })();
  const invalido = !horario || !dentroDoExpediente || !duracao || dia < hoje;
  const ocupado = gravar.isPending || gravar.isSuccess;

  // Modelo padrão de gaveta (ficha da Agenda; dono, 31/10). Um controle por função: cada horário muda pelo relógio,
  // a duração é só o resultado. Saíram os "−15/+15" de início e fim e o "Diminuir/Aumentar 15 min" da duração,
  // que repetiam o mesmo ajuste, e o "Cancelar" (fecha pela alça ou tocando fora).
  return (
    <>
      <FolhaPadrao
        aberto={aberto}
        onAberto={onAberto}
        titulo="Intervalo"
        descricao={`${dia === hoje ? "Hoje" : dataEditorial(dia)} · somente nesta data`}
        resumo={
          <p className="flex items-baseline gap-2 pt-1 text-sm font-semibold text-mute">
            <span className="font-mono font-medium tabular-nums text-paper">
              {inicio} · {fim}
            </span>
            <span>· {duracao} min</span>
          </p>
        }
        rodape={
          // Pílula de largura inteira com carregando → ✓ (700 ms) e só então fecha (padrão Figaro do botão de
          // salvar). "Restaurar semanal" saiu (dono, 31/10).
          <AcaoDaFolha
            type="button"
            className="w-full"
            loading={gravar.isPending}
            success={gravar.isSuccess}
            disabled={invalido || ocupado}
            onClick={() => gravar.mutate()}
          >
            <Check aria-hidden />
            Salvar intervalo
          </AcaoDaFolha>
        }
      >
        <SecaoDaFolha titulo="Horário" />
        <CartaoDaFolha>
          <LinhaDaFolha
            icone={<Clock3 />}
            rotulo="Início"
            valor={inicio}
            onClick={() => setRelogio("inicio")}
            rotuloAcessivel={`Escolher início do intervalo: ${inicio}`}
          />
          <LinhaDaFolha
            icone={<Clock3 />}
            rotulo="Fim"
            valor={fim}
            onClick={() => setRelogio("fim")}
            rotuloAcessivel={`Escolher fim do intervalo: ${fim}`}
          />
        </CartaoDaFolha>
        {!dentroDoExpediente ? (
          <NotaDaFolha tom="erro">
            Escolha um intervalo dentro do expediente, com o fim depois do início.
          </NotaDaFolha>
        ) : (
          <NotaDaFolha>
            Vale só para esta data. A agenda semanal continua igual
            {semanal ? ` (${semanal.inicio}–${semanal.fim})` : ""}.
          </NotaDaFolha>
        )}
      </FolhaPadrao>
      <SeletorDeHorario
        aberto={relogio !== null}
        titulo={relogio === "fim" ? "Fim do intervalo" : "Início do intervalo"}
        valor={relogio === "fim" ? fim : inicio}
        onAberto={(valor) => !valor && setRelogio(null)}
        onEscolher={(valor) => {
          if (relogio === "fim") setFim(valor);
          else setInicio(valor);
        }}
      />
    </>
  );
}
