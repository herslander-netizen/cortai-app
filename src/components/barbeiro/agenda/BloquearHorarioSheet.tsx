import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, Lock, Unlock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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

import { dataEditorial } from "./tempo";

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
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay();
  const h = horarios.find((x) => x.diaSemana === dow);
  const [de, setDe] = useState("12:00");
  const [ate, setAte] = useState("13:00");
  const [prof, setProf] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const qc = useQueryClient();
  const listar = useServerFn(listarBloqueiosDoDia);
  const criar = useServerFn(criarBloqueio);
  const remover = useServerFn(removerBloqueio);
  const chave = ["bloqueios", dia];
  const lista = useQuery({ queryKey: chave, queryFn: () => listar({ data: { dia } }), enabled: aberto });
  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: chave });
    void qc.invalidateQueries({ queryKey: ["agenda-dia"] });
  };
  const salvar = useMutation({
    mutationFn: () =>
      criar({
        data: { dia, de, ate, profissionalId: prof || null, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) },
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
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
  const nomeDe = (id: string | null) =>
    id ? (profissionais.find((p) => p.id === id)?.nome ?? "Profissional") : "Equipe toda";
  const invalido = ate <= de;

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-base text-paper">Bloquear horário</SheetTitle>
          <SheetDescription className="text-sm text-mute">
            {dataEditorial(dia)} · {!h || h.fechado ? "Fechado" : `expediente ${h.abre} – ${h.fecha}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-sm text-mute">
            De
            <input type="time" value={de} onChange={(e) => setDe(e.target.value)} className="input-premium mt-1 min-h-11 w-full" />
          </label>
          <label className="block text-sm text-mute">
            Até
            <input type="time" value={ate} onChange={(e) => setAte(e.target.value)} className="input-premium mt-1 min-h-11 w-full" />
          </label>
        </div>
        {profissionais.length > 1 ? (
          <label className="mt-3 block text-sm text-mute">
            Para quem
            <select value={prof} onChange={(e) => setProf(e.target.value)} className="input-premium mt-1 min-h-11 w-full">
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
            className="input-premium mt-1 min-h-11 w-full"
          />
        </label>
        {invalido ? <p className="mt-2 text-sm text-brick">O fim precisa ser depois do início.</p> : null}
        <Button className="mt-4 w-full" size="lg" disabled={invalido || salvar.isPending} onClick={() => salvar.mutate()}>
          <Lock /> {salvar.isPending ? "Bloqueando…" : "Bloquear este período"}
        </Button>

        {lista.data?.length ? (
          <ul className="mt-5 divide-y divide-line border-y border-line text-sm" aria-label="Bloqueios do dia">
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
                  onClick={() => liberar.mutate(b.id)}
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
      </SheetContent>
    </Sheet>
  );
}
