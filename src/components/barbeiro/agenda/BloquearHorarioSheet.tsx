import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock3, Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SeletorDeHorario } from "@/components/ui/seletor-de-horario";
import { useConfirmar } from "@/components/ui/useConfirmar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AgendaDia } from "@/lib/barbeiro.functions";
import { criarBloqueio, listarBloqueiosDoDia, removerBloqueio } from "@/lib/bloqueios.functions";
import { aviso } from "@/lib/avisos";
import { hojeNoFuso } from "@/lib/horarios";

import { janelaPadrao, problemaDoBloqueio } from "./bloqueio-janela";
import { dataEditorial, minutosNoFuso } from "./tempo";

/** Folha de bloqueio: grava períodos fechados na data escolhida, para um profissional ou a equipe. */
export function BloquearHorarioSheet({
  aberto,
  onAberto,
  dia,
  horarios,
  profissionais = [],
  fuso,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  dia: string;
  horarios: AgendaDia["horarios"];
  profissionais?: { id: string; nome: string }[];
  fuso: string;
}) {
  const hoje = hojeNoFuso(fuso);
  const agoraMin = minutosNoFuso(Date.now(), fuso);
  const diaInicial = dia < hoje ? hoje : dia;
  const [diaEscolhido, setDiaEscolhido] = useState(diaInicial);
  const [de, setDe] = useState(() => janelaPadrao(diaInicial, hoje, agoraMin).de);
  const [ate, setAte] = useState(() => janelaPadrao(diaInicial, hoje, agoraMin).ate);
  const [prof, setProf] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [relogio, setRelogio] = useState<"inicio" | "fim" | null>(null);
  const [confirmar, dialogoDeConfirmacao] = useConfirmar();

  // Cada abertura começa no dia da Agenda (hoje, se for passado) com a janela padrão do Figaro.
  useEffect(() => {
    if (!aberto) return;
    const inicio = dia < hoje ? hoje : dia;
    const janela = janelaPadrao(inicio, hoje, minutosNoFuso(Date.now(), fuso));
    setDiaEscolhido(inicio);
    setDe(janela.de);
    setAte(janela.ate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reinicia ao abrir ou trocar o dia
  }, [aberto, dia]);

  const trocarDia = (novo: string) => {
    if (!novo) return;
    const janela = janelaPadrao(novo, hoje, agoraMin);
    setDiaEscolhido(novo);
    setDe(janela.de);
    setAte(janela.ate);
  };

  const dow = new Date(`${diaEscolhido}T12:00:00Z`).getUTCDay();
  const h = horarios.find((x) => x.diaSemana === dow);
  const qc = useQueryClient();
  const listar = useServerFn(listarBloqueiosDoDia);
  const criar = useServerFn(criarBloqueio);
  const remover = useServerFn(removerBloqueio);
  const chave = ["bloqueios", diaEscolhido];
  const lista = useQuery({
    queryKey: chave,
    queryFn: () => listar({ data: { dia: diaEscolhido } }),
    enabled: aberto,
  });
  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: chave });
    void qc.invalidateQueries({ queryKey: ["agenda-dia"] });
  };
  const salvar = useMutation({
    mutationFn: () =>
      criar({
        data: {
          dia: diaEscolhido,
          de,
          ate,
          profissionalId: prof || null,
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        },
      }),
    onSuccess: (r) => {
      atualizar();
      setMotivo("");
      aviso.ok(
        r.atendimentosNoPeriodo
          ? `Horário bloqueado. Há ${r.atendimentosNoPeriodo} atendimento(s) nesse período; eles continuam marcados.`
          : "Horário bloqueado. Clientes não conseguem marcar nesse período.",
      );
    },
    onError: (e) => aviso.erro(e instanceof Error ? e.message : "Não foi possível bloquear."),
  });
  const liberar = useMutation({
    mutationFn: (id: string) => remover({ data: { id } }),
    onSuccess: () => {
      atualizar();
      aviso.ok("Horário liberado.");
    },
    onError: () => aviso.erro("Não foi possível liberar. Tente de novo."),
  });
  const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: fuso,
    });
  const nomeDe = (id: string | null) =>
    id ? (profissionais.find((p) => p.id === id)?.nome ?? "Profissional") : "Equipe toda";
  const problema = problemaDoBloqueio({ dia: diaEscolhido, hoje, agoraMin, de, ate });
  const invalido = problema !== null;

  const pedirLiberacao = async (id: string) => {
    const ok = await confirmar({
      titulo: "Liberar este horário?",
      descricao: "Clientes poderão agendar esse horário de novo.",
      confirmar: "Liberar",
      cancelar: "Cancelar",
    });
    if (ok) liberar.mutate(id);
  };

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-base text-paper">Bloquear horário</SheetTitle>
          <SheetDescription className="text-sm text-mute">
            {diaEscolhido === hoje ? "Hoje" : dataEditorial(diaEscolhido)} ·{" "}
            {!h || h.fechado ? "Fechado" : `expediente ${h.abre} – ${h.fecha}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          <label className="block text-sm text-mute">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" /> Dia
            </span>
            <input
              type="date"
              value={diaEscolhido}
              min={hoje}
              onChange={(e) => trocarDia(e.target.value)}
              className="field-control mt-1 min-h-12 w-full"
              aria-label={`Dia do bloqueio: ${dataEditorial(diaEscolhido)}`}
            />
          </label>
          {/* Relógio do Flow (padrão Figaro) no lugar do nativo do Android, que saía cortado (dono, 26/10). */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { qual: "inicio", rotulo: "Início", valor: de },
                { qual: "fim", rotulo: "Fim", valor: ate },
              ] as const
            ).map(({ qual, rotulo, valor }) => (
              <div key={qual} className="text-sm text-mute">
                {rotulo}
                <button
                  type="button"
                  onClick={() => setRelogio(qual)}
                  className="field-control mt-1 flex min-h-12 w-full items-center text-left tabular-nums text-paper"
                  aria-label={`Horário de ${rotulo.toLowerCase()} do bloqueio: ${valor || "escolher"}`}
                >
                  {valor || "--:--"}
                </button>
              </div>
            ))}
          </div>
        </div>
        <SeletorDeHorario
          aberto={relogio !== null}
          titulo={relogio === "fim" ? "Fim" : "Início"}
          valor={relogio === "fim" ? ate : de}
          onAberto={(v) => !v && setRelogio(null)}
          onEscolher={(v) => (relogio === "fim" ? setAte(v) : setDe(v))}
        />
        {profissionais.length > 1 ? (
          <label className="mt-3 block text-sm text-mute">
            Para quem
            <select
              value={prof}
              onChange={(e) => setProf(e.target.value)}
              className="field-control mt-1 min-h-11 w-full"
            >
              <option value="">Equipe toda</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="mt-3 block text-sm text-mute">
          Motivo (opcional)
          <input
            value={motivo}
            maxLength={120}
            enterKeyHint="done"
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: consulta médica"
            className="field-control mt-1 min-h-11 w-full"
          />
        </label>
        <p className="mt-4 rounded-lg bg-ink3 px-3 py-3 text-sm text-mute">
          Clientes não conseguem agendar durante o bloqueio.
        </p>
        {problema ? (
          <p className="mt-2 text-sm text-brick" role="alert">
            {problema}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
          <Button
            variant="outline"
            size="lg"
            className="min-w-0 px-4"
            disabled={salvar.isPending}
            onClick={() => onAberto(false)}
          >
            Cancelar
          </Button>
          <Button
            className="w-full min-w-0 px-4"
            size="lg"
            disabled={invalido || salvar.isPending}
            onClick={() => salvar.mutate()}
          >
            <Lock /> {salvar.isPending ? "Bloqueando…" : "Bloquear horário"}
          </Button>
        </div>

        {lista.data?.length ? (
          <ul
            className="mt-5 divide-y divide-line border-y border-line text-sm"
            aria-label="Bloqueios do dia"
          >
            {lista.data.map((b) => (
              <li key={b.id} className="flex min-h-12 items-center justify-between gap-3 py-1">
                <span className="text-paper">
                  <strong>
                    {hora(b.inicio)} – {hora(b.fim)}
                  </strong>{" "}
                  <span className="text-mute">
                    · {nomeDe(b.profissionalId)}
                    {b.motivo ? ` · ${b.motivo}` : ""}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={liberar.isPending}
                  onClick={() => void pedirLiberacao(b.id)}
                >
                  <Unlock /> Liberar
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <Button asChild variant="ghost" className="mt-3 w-full">
          <Link to="/barbeiro/horarios" onClick={() => onAberto(false)}>
            <Clock3 /> Expediente, intervalo e escala da equipe
          </Link>
        </Button>
        {dialogoDeConfirmacao}
      </SheetContent>
    </Sheet>
  );
}
