import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  DollarSign,
  Pencil,
  ShieldCheck,
  Star,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import {
  getFichaProfissionalFlow,
} from "@/lib/ficha-profissional-flow.functions";
import {
  salvarEscalaDoProfissional,
  type DiaDaEscala,
} from "@/lib/bloqueios.functions";
import type { MembroDaEquipe } from "@/lib/equipe.functions";
import { PAPEIS, type PapelDeEquipe } from "@/lib/permissoes";

const SEMANA = [
  { id: 1, curta: "S", nome: "segunda-feira" },
  { id: 2, curta: "T", nome: "terça-feira" },
  { id: 3, curta: "Q", nome: "quarta-feira" },
  { id: 4, curta: "Q", nome: "quinta-feira" },
  { id: 5, curta: "S", nome: "sexta-feira" },
  { id: 6, curta: "S", nome: "sábado" },
  { id: 0, curta: "D", nome: "domingo" },
] as const;
type DiaForm = { id: number; modo: "negocio" | "proprio" | "folga"; abre: string; fecha: string };

const painel = "rounded-[26px] bg-[#3A403D] text-[#F1F4F1]";
const botaoAzul =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0752A9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1466C4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8C7FA]";

function montarDias(
  expediente: { dia: number; trabalha: boolean; abre: string; fecha: string }[],
  escala: { dia: number; trabalha: boolean; abre: string | null; fecha: string | null }[],
): DiaForm[] {
  return SEMANA.map((semana) => {
    const base = expediente.find((d) => d.dia === semana.id);
    const proprio = escala.find((d) => d.dia === semana.id);
    return {
      id: semana.id,
      modo: proprio ? (proprio.trabalha ? "proprio" : "folga") : "negocio",
      abre: proprio?.abre ?? base?.abre ?? "09:00",
      fecha: proprio?.fecha ?? base?.fecha ?? "18:00",
    };
  });
}

function disponibilidade(
  item: DiaForm,
  expediente: { dia: number; trabalha: boolean; abre: string; fecha: string }[],
) {
  const base = expediente.find((d) => d.dia === item.id);
  if (item.modo === "folga") return { trabalha: false, abre: "", fecha: "" };
  if (item.modo === "proprio") return { trabalha: true, abre: item.abre, fecha: item.fecha };
  return { trabalha: Boolean(base?.trabalha), abre: base?.abre ?? "", fecha: base?.fecha ?? "" };
}

/** Ficha de equipe no padrão visual do vídeo, sem substituir os controles existentes. */
export function FichaProfissionalFlow({
  membro,
  aoFechar,
  aoAjustarAcesso,
  aoDesativar,
  ocupado,
}: {
  membro: MembroDaEquipe;
  aoFechar: () => void;
  aoAjustarAcesso: () => void;
  aoDesativar: () => void;
  ocupado: boolean;
}) {
  const qc = useQueryClient();
  const ficha = useQuery({
    queryKey: ["ficha-profissional-flow", membro.userId],
    queryFn: () => getFichaProfissionalFlow({ data: { userId: membro.userId } }),
  });
  const [tela, setTela] = useState<"perfil" | "horarios">("perfil");
  const [compacto, setCompacto] = useState(false);
  const [verMais, setVerMais] = useState(false);
  const [confirmarDesativacao, setConfirmarDesativacao] = useState(false);
  const [diasEdit, setDiasEdit] = useState<DiaForm[]>([]);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voltarRef = useRef<HTMLButtonElement>(null);
  const refFocoAnterior = useRef<HTMLElement | null>(null);
  const fecharAtual = useRef(aoFechar);
  const telaAtual = useRef(tela);
  const confirmarAtual = useRef(confirmarDesativacao);
  fecharAtual.current = aoFechar;
  telaAtual.current = tela;
  confirmarAtual.current = confirmarDesativacao;

  const dados = ficha.data;
  const dias = useMemo(
    () => montarDias(dados?.expediente ?? [], dados?.escala ?? []),
    [dados?.expediente, dados?.escala],
  );
  const estados = dias.map((dia) => disponibilidade(dia, dados?.expediente ?? []));
  const abertos = estados.filter((d) => d.trabalha);
  const mesmoHorario = abertos.length > 0 && abertos.every((d) => d.abre === abertos[0]?.abre && d.fecha === abertos[0]?.fecha);
  const resumoHorario = !abertos.length
    ? "Sem disponibilidade"
    : mesmoHorario
      ? (abertos[0]?.abre ?? "") + " · " + (abertos[0]?.fecha ?? "")
      : "Horários variados";
  const nome = dados?.nome ?? membro.nome ?? "Profissional";
  const funcao = membro.papel === "barbeiro"
    ? "Profissional"
    : PAPEIS[membro.papel as PapelDeEquipe] ?? membro.papel;

  const salvarEscala = useMutation({
    mutationFn: async () => {
      if (!dados?.profissionalId) throw new Error("Este membro não possui vínculo com um profissional da agenda.");
      const escala: DiaDaEscala[] = diasEdit.flatMap((d) =>
        d.modo === "negocio"
          ? []
          : [{
              diaSemana: d.id,
              trabalha: d.modo === "proprio",
              abre: d.abre,
              fecha: d.fecha,
            }],
      );
      return salvarEscalaDoProfissional({
        data: { profissionalId: dados.profissionalId, dias: escala },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ficha-profissional-flow", membro.userId] }),
        qc.invalidateQueries({ queryKey: ["escala"] }),
        qc.invalidateQueries({ queryKey: ["agenda-dia"] }),
      ]);
      setTela("perfil");
      setErroSalvar(null);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    onError: (e) => {
      setErroSalvar(e instanceof Error ? e.message : "Não foi possível salvar os horários.");
    },
  });

  useEffect(() => {
    if (!dados) return;
    setDiasEdit(montarDias(dados.expediente, dados.escala));
  }, [dados]);

  useEffect(() => {
    refFocoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    voltarRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (telaAtual.current === "horarios") {
          setTela("perfil");
        } else if (confirmarAtual.current) {
          setConfirmarDesativacao(false);
        } else {
          fecharAtual.current();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const raiz = scrollRef.current;
      const elementos = Array.from(raiz?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []).filter((el) => el.getClientRects().length > 0);
      if (!elementos.length) return;
      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoTeclar);
      refFocoAnterior.current?.focus();
    };
  }, []);

  const fecharOuVoltar = () => {
    if (tela === "horarios") {
      setTela("perfil");
      setErroSalvar(null);
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    aoFechar();
  };

  return createPortal(
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label={tela === "perfil" ? "Ficha do profissional: " + nome : "Seus horários: " + nome}
      onScroll={(e) => setCompacto(e.currentTarget.scrollTop > 74)}
      className="fixed inset-0 z-[110] overflow-y-auto overscroll-contain bg-[#19201D] text-[#F4F6F2]"
    >
      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] pb-[max(env(safe-area-inset-bottom),24px)]">
        <header className="sticky top-0 z-20 flex min-h-[74px] items-center gap-3 bg-[#19201D]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
          <button
            type="button"
            ref={voltarRef}
            onClick={fecharOuVoltar}
            aria-label="Voltar"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3C4440] text-white focus-visible:outline-2 focus-visible:outline-[#A8C7FA]"
          >
            <ArrowLeft size={25} aria-hidden />
          </button>
          <span className={"truncate text-base font-medium transition-opacity " + (compacto ? "opacity-100" : "opacity-0")}>
            {tela === "perfil" ? nome : "Seus Horários"}
          </span>
          {tela === "perfil" && (
            <button type="button" aria-label="Fechar ficha" onClick={aoFechar} className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-white/65">
              <X size={20} />
            </button>
          )}
        </header>

        <div className="px-4 pt-4">
          <h1 className="mb-6 text-[38px] font-bold leading-tight tracking-tight">
            {tela === "perfil" ? nome : "Seus Horários"}
          </h1>

          {tela === "horarios" ? (
            <section aria-label="Editor da escala semanal" className="pb-6">
              <p className="mb-5 text-sm leading-relaxed text-[#B8C0BA]">
                Defina os horários semanais de trabalho deste profissional.
              </p>
              <div className={painel + " overflow-hidden"}>
                {diasEdit.map((dia) => {
                  const sem = SEMANA.find((s) => s.id === dia.id);
                  const horario = disponibilidade(dia, dados?.expediente ?? []);
                  return (
                    <div key={dia.id} className="border-b border-white/10 px-4 py-4 last:border-0">
                      <div className="flex min-h-10 items-center justify-between gap-2">
                        <label className="flex min-h-11 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={horario.trabalha}
                            onChange={(e) => setDiasEdit((atuais) => atuais.map((x) => x.id !== dia.id ? x : {
                              ...x,
                              modo: e.target.checked ? "proprio" : "folga",
                            }))}
                            className="h-4 w-4 accent-[#18843D]"
                          />
                          <span className="text-sm font-semibold">{sem?.nome}</span>
                        </label>
                        {horario.trabalha ? (
                          <span className="text-xs font-semibold text-[#A8C7FA]">{horario.abre} - {horario.fecha}</span>
                        ) : (
                          <span className="text-xs text-[#B9BFBA]">Indisponível</span>
                        )}
                      </div>
                      {horario.trabalha && (
                        <div className="mt-2 flex items-center gap-2 pl-7">
                          <input
                            type="time"
                            aria-label={(sem?.nome ?? "") + ": início"}
                            value={horario.abre}
                            onChange={(e) => setDiasEdit((atuais) => atuais.map((x) => x.id === dia.id ? { ...x, modo: "proprio", abre: e.target.value } : x))}
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#252C28] px-2 py-2.5 text-sm text-white"
                          />
                          <span className="text-white/60">—</span>
                          <input
                            type="time"
                            aria-label={(sem?.nome ?? "") + ": fim"}
                            value={horario.fecha}
                            onChange={(e) => setDiasEdit((atuais) => atuais.map((x) => x.id === dia.id ? { ...x, modo: "proprio", fecha: e.target.value } : x))}
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#252C28] px-2 py-2.5 text-sm text-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[#B8C0BA]">
                Os ajustes desta tela são individuais; o expediente geral do negócio permanece inalterado.
              </p>
              {erroSalvar && <p role="alert" className="mt-3 text-sm text-red-300">{erroSalvar}</p>}
              <button
                type="button"
                disabled={salvarEscala.isPending || !dados?.profissionalId}
                onClick={() => salvarEscala.mutate()}
                className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#A8C7FA] px-5 font-semibold text-[#172638] disabled:opacity-50"
              >
                <Check size={18} /> {salvarEscala.isPending ? "Salvando…" : "Salvar alterações"}
              </button>
            </section>
          ) : (
            <>
              <section aria-label="Resumo do profissional" className="overflow-hidden rounded-[28px] bg-[#2C332F]">
                <div className="flex min-h-24 items-center gap-4 bg-[#3A403D] p-4">
                  {dados?.fotoUrl ? (
                    <img src={dados.fotoUrl} alt={"Foto de " + nome} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-label="Sem foto" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#65706B]">
                      <UserRound size={37} className="text-[#D3DAD5]" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xl font-semibold">{funcao}</span>
                  <Link to="/barbeiro/profissionais" onClick={aoFechar} className={botaoAzul + " shrink-0 px-3"}>
                    Editar perfil
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-2">
                  {[
                    { label: "Agend.", valor: dados?.agendamentos?.toString() ?? "—", icone: CalendarCheck2 },
                    { label: "Receita", valor: "—", icone: DollarSign },
                    { label: "Aval.", valor: dados?.avaliacao == null ? "—" : dados.avaliacao.toFixed(1), icone: Star },
                  ].map((item) => {
                    const Icone = item.icone;
                    return (
                      <div key={item.label} className="flex min-h-28 flex-col justify-between rounded-[20px] bg-[#3A403D] p-3">
                        <Icone size={20} className="text-[#A8C7FA]" aria-hidden />
                        <strong className="mt-2 text-[27px] leading-none">{item.valor}</strong>
                        <span className="mt-1 text-sm text-white/55">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="flex items-center gap-2 px-4 pb-4 pt-1 text-sm font-semibold text-[#CBD2CC]">
                  <TrendingUp size={18} aria-hidden /> Estatísticas dos últimos 30 dias
                </p>
              </section>

              {ficha.isLoading && <p role="status" className="mt-5 text-sm text-white/70">Carregando ficha…</p>}
              {ficha.isError && <p role="alert" className="mt-5 text-sm text-red-300">Não foi possível carregar as informações do profissional.</p>}

              <section aria-labelledby="ficha-disponibilidade" className="mt-9">
                <div className="mb-4 flex items-center justify-between">
                  <h2 id="ficha-disponibilidade" className="text-xl font-semibold">Disponibilidade</h2>
                  <button type="button" disabled={!dados?.profissionalId} onClick={() => { setTela("horarios"); setCompacto(false); scrollRef.current?.scrollTo({ top: 0 }); }} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A8C7FA] disabled:opacity-50">
                    <Pencil size={17} aria-hidden /> Editar
                  </button>
                </div>
                <div className={painel + " overflow-hidden"}>
                  <div className="grid grid-cols-7 gap-1 px-3 pb-3 pt-4">
                    {SEMANA.map((sem, i) => {
                      const ativo = estados[i]?.trabalha;
                      return (
                        <div key={sem.id} className="text-center">
                          <span className="block pb-2 text-sm font-semibold text-white/80">{sem.curta}</span>
                          <span aria-label={sem.nome + (ativo ? ": disponível" : ": indisponível")} className={"flex h-10 items-center justify-center rounded-lg text-sm " + (ativo ? "bg-[#0C6123] text-white" : "text-white/50")}>
                            {ativo ? <Check size={17} aria-hidden /> : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" aria-expanded={verMais} onClick={() => setVerMais((v) => !v)} className="flex min-h-12 w-full items-center justify-between gap-2 border-t border-[#19201D] bg-[#484F4B] px-4 text-left text-sm">
                    <span className="inline-flex items-center gap-2"><Clock3 size={17} />{resumoHorario}</span>
                    <span className="inline-flex items-center gap-1 text-[#A8C7FA]">{verMais ? "Ver menos" : "Ver mais"} <ChevronDown size={16} className={verMais ? "rotate-180" : ""} /></span>
                  </button>
                  {verMais && (
                    <div className="space-y-2 px-4 py-3 text-sm">
                      {SEMANA.map((sem, i) => (
                        <div key={sem.id} className="flex justify-between gap-3">
                          <span className="capitalize">{sem.nome}</span>
                          <span className="text-white/75">{estados[i]?.trabalha ? (estados[i]?.abre + " - " + estados[i]?.fecha) : "Indisponível"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  to="/barbeiro/agenda"
                  onClick={aoFechar}
                  className={botaoAzul + " mt-4 w-full"}
                >
                  <CalendarDays size={17} /> Gerenciar datas na agenda
                </Link>
                {!dados?.profissionalId && (
                  <p className="mt-2 text-xs text-white/60">Este membro ainda não está vinculado a um profissional da agenda.</p>
                )}
              </section>

              <section aria-labelledby="ficha-dados" className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 id="ficha-dados" className="text-xl font-semibold">Dados Pessoais</h2>
                  <Link to="/barbeiro/profissionais" onClick={aoFechar} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A8C7FA]">
                    <Pencil size={17} aria-hidden /> Editar perfil
                  </Link>
                </div>
                <dl className={painel + " divide-y divide-[#19201D] overflow-hidden"}>
                  {[
                    ["Nome", nome],
                    ["Atividade", funcao],
                    ["Telefone", dados?.telefone ?? "Não informado"],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="px-4 py-3">
                      <dt className="text-xs text-white/50">{rotulo}</dt>
                      <dd className="mt-1 text-sm font-medium">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-labelledby="ficha-acesso" className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 id="ficha-acesso" className="text-xl font-semibold">Acesso ao Flow</h2>
                  {membro.papel !== "dono" && (
                    <button type="button" onClick={aoAjustarAcesso} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A8C7FA]">
                      <Pencil size={17} aria-hidden /> Editar
                    </button>
                  )}
                </div>
                <dl className={painel + " divide-y divide-[#19201D] overflow-hidden"}>
                  <div className="px-4 py-3">
                    <dt className="text-xs text-white/50">E-mail</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{membro.email ?? "Não informado"}</dd>
                  </div>
                  <div className="px-4 py-3">
                    <dt className="text-xs text-white/50">Nível de acesso</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
                      {membro.papel === "dono" && <ShieldCheck size={16} />}
                      {PAPEIS[membro.papel as PapelDeEquipe] ?? membro.papel}
                    </dd>
                  </div>
                </dl>
              </section>

              {membro.papel !== "dono" && (
                <section className="mt-10 pb-6">
                  {!confirmarDesativacao ? (
                    <button type="button" disabled={ocupado || !membro.ativo} onClick={() => setConfirmarDesativacao(true)} className={botaoAzul + " disabled:opacity-50"}>
                      {membro.ativo ? "Desativar profissional" : "Profissional desativado"}
                    </button>
                  ) : (
                    <div role="group" aria-label="Confirmar desativação" className={painel + " p-4"}>
                      <p className="text-sm">Desativar o acesso de {nome}? Os agendamentos existentes não serão apagados.</p>
                      <div className="mt-4 flex gap-3">
                        <button type="button" onClick={() => setConfirmarDesativacao(false)} className="min-h-11 rounded-full border border-white/30 px-4 text-sm">Cancelar</button>
                        <button type="button" disabled={ocupado} onClick={aoDesativar} className="min-h-11 rounded-full bg-[#0752A9] px-4 text-sm font-semibold disabled:opacity-50">Confirmar</button>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-white/60">O acesso ao negócio será bloqueado; os agendamentos existentes permanecem registrados.</p>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  , document.body);
}
