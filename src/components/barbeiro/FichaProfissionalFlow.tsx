import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Camera,
  Plus,
  Trash2,
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
  salvarDadosProfissionalFlow,
  salvarFotoProfissionalFlow,
  salvarDisponibilidadePorDataFlow,
  removerDisponibilidadePorDataFlow,
} from "@/lib/ficha-profissional-flow.functions";
import { useMenosMovimento } from "@/hooks/useMovimento";
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
  profissionalId,
  aoFechar,
  aoAjustarAcesso,
  aoDesativar,
  ocupado,
}: {
  membro: MembroDaEquipe;
  profissionalId?: string;
  aoFechar: () => void;
  aoAjustarAcesso: () => void;
  aoDesativar: () => void;
  ocupado: boolean;
}) {
  const qc = useQueryClient();
  const alvo = profissionalId ? { profissionalId } : { userId: membro.userId };
  const chaveFicha = profissionalId ?? membro.userId;
  const ficha = useQuery({
    queryKey: ["ficha-profissional-flow", chaveFicha],
    queryFn: () => getFichaProfissionalFlow({ data: alvo }),
  });
  const [tela, setTela] = useState<"perfil" | "horarios" | "dados" | "data">("perfil");
  const menosMovimento = useMenosMovimento();
  const [dadosForm, setDadosForm] = useState({ nome: "", atividade: "", telefone: "" });
  const [dataForm, setDataForm] = useState({ dia: "", trabalha: true, abre: "09:00", fecha: "18:00" });
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [diaExpandido, setDiaExpandido] = useState<number | null>(null);
  const [excecaoParaRemover, setExcecaoParaRemover] = useState<string | null>(null);
  const fotoInput = useRef<HTMLInputElement>(null);
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
  const atividade = dados?.atividade || funcao;
  const hojeDoAparelho = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const limiteData = new Date(Date.now() + 365 * 86_400_000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  const atualizarDados = useMutation({
    mutationFn: () => salvarDadosProfissionalFlow({ data: { ...alvo, ...dadosForm } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ficha-profissional-flow", chaveFicha] }),
        qc.invalidateQueries({ queryKey: ["equipe"] }),
        qc.invalidateQueries({ queryKey: ["equipe-escala"] }),
      ]);
      setTela("perfil");
      setErroLocal(null);
    },
    onError: (e) => setErroLocal(e instanceof Error ? e.message : "Não foi possível salvar os dados."),
  });
  const atualizarFoto = useMutation({
    mutationFn: (arquivo: { tipo: "image/jpeg" | "image/png" | "image/webp"; base64: string }) =>
      salvarFotoProfissionalFlow({ data: { ...alvo, ...arquivo } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["ficha-profissional-flow", chaveFicha] });
      setErroLocal(null);
    },
    onError: (e) => setErroLocal(e instanceof Error ? e.message : "Não foi possível atualizar a foto."),
  });
  const atualizarData = useMutation({
    mutationFn: () => salvarDisponibilidadePorDataFlow({
      data: { ...alvo, dia: dataForm.dia, trabalha: dataForm.trabalha,
        abre: dataForm.trabalha ? dataForm.abre : null,
        fecha: dataForm.trabalha ? dataForm.fecha : null },
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ficha-profissional-flow", chaveFicha] }),
        qc.invalidateQueries({ queryKey: ["agenda-dia"] }),
        qc.invalidateQueries({ queryKey: ["agenda-publica"] }),
      ]);
      setErroLocal(null);
      setTela("perfil");
    },
    onError: (e) => setErroLocal(e instanceof Error ? e.message : "Não foi possível salvar esta data."),
  });
  const removerData = useMutation({
    mutationFn: (dia: string) => removerDisponibilidadePorDataFlow({ data: { ...alvo, dia } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ficha-profissional-flow", chaveFicha] }),
        qc.invalidateQueries({ queryKey: ["agenda-dia"] }),
        qc.invalidateQueries({ queryKey: ["agenda-publica"] }),
      ]);
      setErroLocal(null);
      setExcecaoParaRemover(null);
    },
    onError: (e) => setErroLocal(e instanceof Error ? e.message : "Não foi possível remover esta data."),
  });

  const abrirEdicao = () => {
    setDadosForm({ nome: dados?.nome ?? nome, atividade: dados?.atividade ?? "", telefone: dados?.telefone ?? "" });
    setTela("dados");
    setErroLocal(null);
    scrollRef.current?.scrollTo({ top: 0 });
  };
  const abrirData = (excecao?: { dia: string; trabalha: boolean; abre: string | null; fecha: string | null }) => {
    setDataForm({ dia: excecao?.dia ?? "", trabalha: excecao?.trabalha ?? true,
      abre: excecao?.abre ?? "09:00", fecha: excecao?.fecha ?? "18:00" });
    setErroLocal(null);
    setTela("data");
    scrollRef.current?.scrollTo({ top: 0 });
  };
  const enviarFoto = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 12_582_912) {
      setErroLocal("Escolha uma foto JPG, PNG ou WebP de até 12 MB. O Flow reduzirá a imagem automaticamente.");
      return;
    }
    setErroLocal(null);
    try {
      // Fotos de câmera normalmente ultrapassam 2 MB. Normaliza um recorte
      // quadrado no próprio aparelho, sem enviar o original ao servidor.
      let imagem: Blob = arquivo;
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(arquivo);
        try {
          const lado = Math.min(bitmap.width, bitmap.height);
          const canvas = document.createElement("canvas");
          canvas.width = 768;
          canvas.height = 768;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Não foi possível processar a foto.");
          ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, 768, 768);
          const comprimida = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/webp", 0.82));
          if (comprimida?.type === "image/webp") imagem = comprimida;
        } finally {
          bitmap.close();
        }
      }
      if (imagem.size > 2_097_152) {
        throw new Error("Não foi possível reduzir a foto para até 2 MB. Escolha uma imagem menor.");
      }
      const endereco = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(new Error("Não foi possível ler a foto."));
        leitor.readAsDataURL(imagem);
      });
      const base64 = endereco.split(",")[1];
      if (!base64) throw new Error("A foto selecionada está vazia.");
      atualizarFoto.mutate({
        tipo: imagem.type as "image/jpeg" | "image/png" | "image/webp",
        base64,
      });
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : "Não foi possível ler a foto.");
    }
  };

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
        qc.invalidateQueries({ queryKey: ["ficha-profissional-flow", chaveFicha] }),
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
    const vizinhos = Array.from(document.body.children)
      .filter((el) => el !== scrollRef.current)
      .map((el) => ({ el: el as HTMLElement, aria: el.getAttribute("aria-hidden"), inert: (el as HTMLElement).inert }));
    for (const item of vizinhos) {
      item.el.inert = true;
      item.el.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";
    voltarRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (telaAtual.current !== "perfil") {
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
      for (const item of vizinhos) {
        item.el.inert = item.inert;
        if (item.aria === null) item.el.removeAttribute("aria-hidden");
        else item.el.setAttribute("aria-hidden", item.aria);
      }
      document.removeEventListener("keydown", aoTeclar);
      refFocoAnterior.current?.focus();
    };
  }, []);

  useEffect(() => {
    voltarRef.current?.focus();
  }, [tela]);

  const fecharOuVoltar = () => {
    if (tela !== "perfil") {
      setTela("perfil");
      setErroSalvar(null);
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    aoFechar();
  };

  const titulo = tela === "perfil" ? nome : tela === "horarios" ? "Seus Horários" : tela === "dados" ? "Editar dados" : "Disponibilidade por data";

  return createPortal(
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label={titulo + ": " + nome}
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
            {titulo}
          </span>
          {tela === "perfil" && (
            <button type="button" aria-label="Fechar ficha" onClick={aoFechar} className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-white/65">
              <X size={20} />
            </button>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tela}
            initial={menosMovimento ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={menosMovimento ? { opacity: 1 } : { opacity: 0, x: -14 }}
            transition={{ duration: menosMovimento ? 0 : 0.19, ease: "easeOut" }}
            className="px-4 pt-4"
          >
          <h1 className="mb-6 break-words text-[clamp(28px,8vw,38px)] font-bold leading-tight tracking-tight">
            {titulo}
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
                  const expandido = diaExpandido === dia.id;
                  return (
                    <div key={dia.id} className="border-b border-[#19201D] last:border-0">
                      <button
                        type="button"
                        aria-expanded={expandido}
                        aria-label={(sem?.nome ?? "Dia") + ": " + (horario.trabalha ? horario.abre + " às " + horario.fecha : "indisponível") + ". Editar horário"}
                        onClick={() => setDiaExpandido((v) => v === dia.id ? null : dia.id)}
                        className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left focus-visible:outline-2 focus-visible:outline-[#A8C7FA]"
                      >
                        <span aria-hidden className={"h-2 w-2 shrink-0 rounded-full " + (horario.trabalha ? "bg-[#2BC958]" : "border border-white/50")} />
                        <span className="min-w-0 flex-1 text-sm font-semibold">{sem?.nome}</span>
                        <span className="text-xs font-medium text-[#A8C7FA]">
                          {horario.trabalha ? horario.abre + " - " + horario.fecha : "Indisponível"}
                        </span>
                        <ChevronDown size={16} aria-hidden className={"shrink-0 text-white/60 transition-transform " + (expandido ? "rotate-180" : "")} />
                      </button>
                      {expandido && (
                        <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
                          <label className="block text-xs text-white/70">
                            Regra do dia
                            <select
                              aria-label={(sem?.nome ?? "Dia") + ": regra"}
                              value={dia.modo}
                              onChange={(e) => setDiasEdit((atuais) => atuais.map((x) =>
                                x.id === dia.id ? { ...x, modo: e.target.value as DiaForm["modo"] } : x))}
                              className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#252C28] px-3 text-sm text-white"
                            >
                              <option value="negocio">Seguir expediente do negócio</option>
                              <option value="proprio">Horário próprio</option>
                              <option value="folga">Folga / indisponível</option>
                            </select>
                          </label>
                          {dia.modo === "proprio" && (
                            <div className="flex items-center gap-2">
                              <input type="time" aria-label={(sem?.nome ?? "Dia") + ": início"}
                                value={dia.abre}
                                onChange={(e) => setDiasEdit((atuais) => atuais.map((x) =>
                                  x.id === dia.id ? { ...x, abre: e.target.value } : x))}
                                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#252C28] px-2 text-sm text-white" />
                              <span className="text-white/60">até</span>
                              <input type="time" aria-label={(sem?.nome ?? "Dia") + ": fim"}
                                value={dia.fecha}
                                onChange={(e) => setDiasEdit((atuais) => atuais.map((x) =>
                                  x.id === dia.id ? { ...x, fecha: e.target.value } : x))}
                                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#252C28] px-2 text-sm text-white" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[#B8C0BA]">
                Os ajustes desta tela são individuais. O expediente geral e os intervalos do negócio continuam valendo.
              </p>
              {erroSalvar && <p role="alert" className="mt-3 text-sm text-red-300">{erroSalvar}</p>}
              <button
                type="button"
                disabled={salvarEscala.isPending || !dados?.profissionalId}
                onClick={() => salvarEscala.mutate()}
                className="sticky bottom-[max(env(safe-area-inset-bottom),8px)] z-10 mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#A8C7FA] px-5 font-semibold text-[#172638] shadow-[0_12px_30px_rgba(0,0,0,0.45)] disabled:opacity-50"
              >
                <Check size={18} /> {salvarEscala.isPending ? "Salvando…" : "Salvar alterações"}
              </button>
            </section>
          ) : tela === "dados" ? (
            <form
              aria-label="Editar dados do profissional"
              className="pb-10"
              onSubmit={(e) => { e.preventDefault(); setErroLocal(null); atualizarDados.mutate(); }}
            >
              <p className="mb-5 text-sm leading-relaxed text-[#B8C0BA]">
                Atualize as informações exibidas neste estabelecimento. O nível de acesso é gerenciado separadamente.
              </p>
              <div className={painel + " space-y-5 p-4"}>
                {([
                  { chave: "nome", titulo: "Nome", tipo: "text", dica: "Nome exibido na agenda" },
                  { chave: "atividade", titulo: "Atividade", tipo: "text", dica: "Ex.: barbeiro, manicure, terapeuta" },
                  { chave: "telefone", titulo: "Telefone", tipo: "tel", dica: "Contato com DDD (não é público)" },
                ] as const).map((campo) => (
                  <label key={campo.chave} className="block">
                    <span className="mb-2 block text-sm font-semibold">{campo.titulo}</span>
                    <input
                      required={campo.chave === "nome"}
                      type={campo.tipo}
                      autoComplete={campo.chave === "telefone" ? "off" : "name"}
                      maxLength={campo.chave === "nome" || campo.chave === "atividade" ? 100 : 22}
                      value={dadosForm[campo.chave]}
                      onChange={(e) => setDadosForm((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
                      className="min-h-12 w-full rounded-xl border border-white/15 bg-[#252C28] px-4 text-base text-white focus-visible:outline-2 focus-visible:outline-[#A8C7FA]"
                    />
                    <span className="mt-1 block text-xs text-white/55">{campo.dica}</span>
                  </label>
                ))}
              </div>
              {erroLocal && <p role="alert" className="mt-4 text-sm text-red-300">{erroLocal}</p>}
              <button disabled={atualizarDados.isPending} type="submit" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#A8C7FA] px-5 font-semibold text-[#172638] disabled:opacity-50">
                <Check size={18} aria-hidden /> {atualizarDados.isPending ? "Salvando…" : "Salvar alterações"}
              </button>
            </form>
          ) : tela === "data" ? (
            <form
              aria-label="Disponibilidade especial por data"
              className="pb-10"
              onSubmit={(e) => { e.preventDefault(); setErroLocal(null); atualizarData.mutate(); }}
            >
              <p className="mb-5 text-sm leading-relaxed text-[#B8C0BA]">
                Defina uma exceção para uma data específica. Ela substitui a escala semanal do profissional,
                mas respeita o expediente e os intervalos do estabelecimento.
              </p>
              <div className={painel + " space-y-5 p-4"}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Data</span>
                  <input type="date" required min={hojeDoAparelho} max={limiteData}
                    value={dataForm.dia}
                    onChange={(e) => setDataForm((atual) => ({ ...atual, dia: e.target.value }))}
                    className="min-h-12 w-full rounded-xl border border-white/15 bg-[#252C28] px-4 text-base text-white focus-visible:outline-2 focus-visible:outline-[#A8C7FA]" />
                </label>
                <label className="flex min-h-12 items-center justify-between gap-4">
                  <span className="text-sm font-semibold">Disponível para atender</span>
                  <input type="checkbox" checked={dataForm.trabalha}
                    onChange={(e) => setDataForm((atual) => ({ ...atual, trabalha: e.target.checked }))}
                    className="h-6 w-6 accent-[#18843D]" />
                </label>
                {dataForm.trabalha && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="mb-2 block">Início</span>
                      <input type="time" required value={dataForm.abre}
                        onChange={(e) => setDataForm((atual) => ({ ...atual, abre: e.target.value }))}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#252C28] px-2 text-base text-white" />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-2 block">Fim</span>
                      <input type="time" required value={dataForm.fecha}
                        onChange={(e) => setDataForm((atual) => ({ ...atual, fecha: e.target.value }))}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#252C28] px-2 text-base text-white" />
                    </label>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                A agenda não muda agendamentos já existentes. Caso o ajuste entre em conflito com eles, o Flow pedirá para remarcá-los antes.
              </p>
              {erroLocal && <p role="alert" className="mt-4 text-sm text-red-300">{erroLocal}</p>}
              <button disabled={atualizarData.isPending || !dataForm.dia} type="submit" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#A8C7FA] px-5 font-semibold text-[#172638] disabled:opacity-50">
                <Check size={18} aria-hidden /> {atualizarData.isPending ? "Salvando…" : "Salvar disponibilidade"}
              </button>
            </form>
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
                  <span className="min-w-0 flex-1 truncate text-xl font-semibold">{atividade}</span>
                  <input ref={fotoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher foto do profissional" className="sr-only"
                    onChange={(e) => { void enviarFoto(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} />
                  <button type="button" disabled={!dados?.profissionalId || atualizarFoto.isPending} onClick={() => fotoInput.current?.click()} className={botaoAzul + " shrink-0 px-3 disabled:opacity-50"}>
                    <Camera size={16} aria-hidden /> {atualizarFoto.isPending ? "Enviando…" : "Adicionar foto"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-2">
                  {[
                    { label: "Agend.", valor: dados?.agendamentos?.toString() ?? "—", icone: CalendarCheck2 },
                    { label: "Receita", valor: dados?.receitaCentavos == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(dados.receitaCentavos / 100), icone: DollarSign },
                    { label: "Aval.", valor: dados?.avaliacao == null ? "—" : dados.avaliacao.toFixed(1), icone: Star },
                  ].map((item) => {
                    const Icone = item.icone;
                    return (
                      <div key={item.label} className="flex min-h-28 flex-col justify-between rounded-[20px] bg-[#3A403D] p-3">
                        <Icone size={20} className="text-[#A8C7FA]" aria-hidden />
                        <strong className="mt-2 break-words text-[clamp(14px,4.5vw,26px)] leading-none">{item.valor}</strong>
                        <span className="mt-1 text-sm text-white/55">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="flex items-center gap-2 px-4 pb-4 pt-1 text-sm font-semibold text-[#CBD2CC]">
                  <TrendingUp size={18} aria-hidden /> Estatísticas dos últimos 30 dias
                </p>
              </section>

              {erroLocal && <p role="alert" className="mt-4 text-sm text-red-300">{erroLocal}</p>}
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
                <button
                  type="button"
                  disabled={!dados?.profissionalId}
                  onClick={() => abrirData()}
                  className={botaoAzul + " mt-4 w-full disabled:opacity-50"}
                >
                  <Plus size={17} aria-hidden /> Adicionar disponibilidade por data
                </button>
                {(dados?.excecoesPorData?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2" aria-label="Disponibilidades especiais cadastradas">
                    {dados?.excecoesPorData.map((excecao: { id: string; dia: string; trabalha: boolean; abre: string | null; fecha: string | null }) => (
                      <div key={excecao.id} className="flex items-center gap-2 rounded-2xl bg-[#3A403D] px-3 py-2">
                        <button type="button" onClick={() => abrirData(excecao)} className="min-h-11 min-w-0 flex-1 text-left text-sm">
                          <span className="block font-semibold">{excecao.dia.split("-").reverse().join("/")}</span>
                          <span className="block text-xs text-white/65">{excecao.trabalha ? `${excecao.abre} - ${excecao.fecha}` : "Indisponível"}</span>
                        </button>
                        {excecaoParaRemover === excecao.dia ? (
                          <div className="flex shrink-0 flex-col gap-1 text-xs" role="group" aria-label="Confirmar remoção da data">
                            <button type="button" disabled={removerData.isPending} onClick={() => removerData.mutate(excecao.dia)} className="min-h-8 rounded-lg bg-[#0752A9] px-2 font-semibold">Confirmar</button>
                            <button type="button" onClick={() => setExcecaoParaRemover(null)} className="min-h-8 rounded-lg border border-white/20 px-2">Cancelar</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setExcecaoParaRemover(excecao.dia)}
                            aria-label={"Remover exceção de " + excecao.dia} className="flex h-11 w-11 items-center justify-center rounded-full text-[#A8C7FA]">
                            <Trash2 size={18} aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/barbeiro/agenda" onClick={aoFechar} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-[#A8C7FA]">
                  <CalendarDays size={17} aria-hidden /> Ver agenda completa
                </Link>
                {!dados?.profissionalId && (
                  <p className="mt-2 text-xs text-white/60">Este membro ainda não está vinculado a um profissional da agenda.</p>
                )}
              </section>

              <section aria-labelledby="ficha-dados" className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 id="ficha-dados" className="text-xl font-semibold">Dados Pessoais</h2>
                  <button type="button" onClick={abrirEdicao} disabled={!dados?.profissionalId} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A8C7FA] disabled:opacity-50">
                    <Pencil size={17} aria-hidden /> Editar
                  </button>
                </div>
                <dl className={painel + " divide-y divide-[#19201D] overflow-hidden"}>
                  {[
                    ["Nome", nome],
                    ["Atividade", atividade],
                    ["Telefone", dados?.telefone ?? "Não informado"],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="px-4 py-3">
                      <dt className="text-xs text-white/50">{rotulo}</dt>
                      <dd className="mt-1 text-sm font-medium">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {!profissionalId && <section aria-labelledby="ficha-acesso" className="mt-10">
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
              </section>}

              {membro.papel !== "dono" && (
                <section className="mt-10 pb-6">
                  {!confirmarDesativacao ? (
                    <button type="button" disabled={ocupado || !membro.ativo || Boolean(profissionalId && dados?.vinculadoAConta)} onClick={() => setConfirmarDesativacao(true)} className={botaoAzul + " disabled:opacity-50"}>
                      {membro.ativo ? "Desativar profissional" : "Profissional desativado"}
                    </button>
                  ) : (
                    <div role="group" aria-label="Confirmar desativação" className={painel + " p-4"}>
                      <p className="text-sm">Desativar {nome}? O acesso e a oferta de novos horários serão suspensos. Os agendamentos existentes não serão apagados.</p>
                      <div className="mt-4 flex gap-3">
                        <button type="button" onClick={() => setConfirmarDesativacao(false)} className="min-h-11 rounded-full border border-white/30 px-4 text-sm">Cancelar</button>
                        <button type="button" disabled={ocupado} onClick={aoDesativar} className="min-h-11 rounded-full bg-[#0752A9] px-4 text-sm font-semibold disabled:opacity-50">Confirmar</button>
                      </div>
                    </div>
                  )}
                  {profissionalId && dados?.vinculadoAConta ? (
                    <p className="mt-2 text-xs leading-relaxed text-white/60">Este profissional tem acesso ao Flow. Desative-o pela tela Equipe e permissões.</p>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-white/60">Agendamentos existentes permanecem registrados; novos horários não serão oferecidos.</p>
                  )}
                </section>
              )}
            </>
          )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  , document.body);
}
