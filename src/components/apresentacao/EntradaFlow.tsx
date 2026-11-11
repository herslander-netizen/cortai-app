import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Globe,
  Mail,
  Pause,
  Play,
  Star,
  User,
  X,
} from "lucide-react";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { direcaoDoDeslize } from "./entrada-gestos";

interface Cena {
  id: string;
  tag: string;
  titulo: string;
  texto: string;
  icone: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const DURACAO_CENA_MS = 5000;

const CENAS: Cena[] = [
  {
    id: "site",
    tag: "SEU SITE",
    titulo: "Seu site próprio",
    texto: "O cliente conhece seu espaço, serviços e profissionais.",
    icone: Globe,
  },
  {
    id: "agenda",
    tag: "AGENDA",
    titulo: "Agenda sem atrito",
    texto: "Agenda ali mesmo, rápido e sem enrolação.",
    icone: CalendarDays,
  },
  {
    id: "lembretes",
    tag: "LEMBRETES",
    titulo: "Avisos automáticos",
    texto: "Lembretes mantêm todo mundo atento e reduzem faltas.",
    icone: Bell,
  },
  {
    id: "avaliacoes",
    tag: "AVALIAÇÕES",
    titulo: "Reputação real",
    texto: "Depois do serviço, o cliente avalia e recomenda.",
    icone: Star,
  },
  {
    id: "desempenho",
    tag: "DESEMPENHO",
    titulo: "Gestão completa",
    texto: "Você acompanha o desempenho e guia o negócio.",
    icone: BarChart3,
  },
];

export function EntradaFlow({ proximo }: { proximo?: string | undefined } = {}) {
  const [ativo, setAtivo] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [loginAberto, setLoginAberto] = useState(false);
  const [pausaManual, setPausaManual] = useState(false);
  const menosMovimento = useMenosMovimento();

  const pausadoPeloToque = useRef(false);
  const toqueInicial = useRef<{ id: number; x: number; y: number } | null>(null);
  const decorridoRef = useRef(0);
  const fecharLogin = useCallback(() => setLoginAberto(false), []);

  // Uma atualização a cada 100 ms evita renderizar toda a página a cada frame.
  // O intervalo não avança enquanto a tela estiver em segundo plano ou pausada.
  useEffect(() => {
    let anterior = performance.now();
    const intervalo = window.setInterval(() => {
      const agora = performance.now();
      const delta = Math.min(150, Math.max(0, agora - anterior));
      anterior = agora;
      if (document.hidden || pausadoPeloToque.current || loginAberto || pausaManual || menosMovimento) return;

      decorridoRef.current += delta;
      if (decorridoRef.current >= DURACAO_CENA_MS) {
        decorridoRef.current %= DURACAO_CENA_MS;
        setAtivo((atual) => (atual + 1) % CENAS.length);
      }
      setProgresso(decorridoRef.current / DURACAO_CENA_MS);
    }, 100);
    return () => window.clearInterval(intervalo);
  }, [loginAberto, pausaManual, menosMovimento]);

  const irPara = (indice: number) => {
    decorridoRef.current = 0;
    setAtivo((indice + CENAS.length) % CENAS.length);
    setProgresso(0);
  };

  const cenaAtual = CENAS[ativo] ?? CENAS[0]!;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-x-hidden bg-[#0A0D14] text-white">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#00509D]/20 blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#FF2D78]/15 blur-[90px]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),20px)]">
        <header className="relative flex min-h-12 items-center justify-center">
          <div aria-label="Flow" className="flex items-baseline gap-0.5">
            <span className="text-2xl font-extrabold tracking-tight text-white">Flow</span>
            <span aria-hidden="true" className="text-2xl font-extrabold text-[#F48FB1]">.</span>
          </div>
          <button
            type="button"
            aria-label={pausaManual ? "Retomar apresentação" : "Pausar apresentação"}
            aria-pressed={pausaManual}
            onClick={() => setPausaManual((atual) => !atual)}
            className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {pausaManual ? <Play size={19} aria-hidden /> : <Pause size={19} aria-hidden />}
          </button>
        </header>

        <section
          aria-labelledby="titulo-cena"
          className="mt-2 flex min-h-0 flex-1 touch-pan-y flex-col justify-center"
          onPointerDown={(e) => {
            if (!e.isPrimary) return;
            pausadoPeloToque.current = true;
            toqueInicial.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
          onPointerUp={(e) => {
            const toque = toqueInicial.current;
            if (!toque || toque.id !== e.pointerId) return;
            const direcao = direcaoDoDeslize(e.clientX - toque.x, e.clientY - toque.y);
            toqueInicial.current = null;
            pausadoPeloToque.current = false;
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
            if (direcao) irPara(ativo + direcao);
          }}
          onPointerCancel={() => {
            pausadoPeloToque.current = false;
            toqueInicial.current = null;
          }}
          onPointerLeave={(e) => {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
            pausadoPeloToque.current = false;
            toqueInicial.current = null;
          }}
        >
          <div aria-hidden="true" className="relative mx-auto h-[clamp(195px,37dvh,320px)] w-full overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(ellipse_at_20%_0%,rgba(107,95,143,0.28),transparent_65%),#121824] p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={cenaAtual.id}
                initial={menosMovimento ? false : { opacity: 0.94, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={menosMovimento ? { opacity: 1 } : { opacity: 0.94, x: -12 }}
                transition={menosMovimento ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
                className="absolute inset-4"
              >
                <MockupCena id={cenaAtual.id} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div aria-live="polite"
            aria-atomic="true"
            className="mt-3 flex min-h-[86px] flex-col items-center justify-center text-center">
            <span className="text-[11px] font-extrabold tracking-widest text-[#00B4FF]">
              {cenaAtual.tag}
            </span>
            <h1 id="titulo-cena" className="mt-1 text-base font-bold leading-tight text-white">{cenaAtual.titulo}</h1>
            <p className="mt-1 line-clamp-2 px-2 text-sm font-medium text-white/80">
              {cenaAtual.texto}
            </p>
          </div>
        </section>

        <nav aria-label="Navegação de recursos" className="my-2 flex w-full items-center justify-between px-1">
          {CENAS.map((c, i) => {
            const ehAtivo = i === ativo;
            const Icone = c.icone;
            return (
              <motion.button
                key={c.id}
                type="button"
                aria-label={`Ver recurso: ${c.tag}`}
                aria-current={ehAtivo ? "step" : undefined}
                onClick={() => irPara(i)}
                whileTap={menosMovimento ? { scale: 1 } : { scale: 0.9 }}
                className={`flex h-14 w-14 flex-col items-center justify-center gap-1.5 rounded-2xl border transition-[background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C7FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D14] ${ehAtivo ? "border-[#BB86FC]/40 bg-[#6B5F8F]/20" : "border-transparent hover:bg-white/5"}`}
              >
                <motion.span
                  animate={{ scale: menosMovimento ? 1 : ehAtivo ? 1.18 : 1 }}
                  transition={menosMovimento ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
                  className={ehAtivo ? "text-white" : "text-white/70"}
                  style={{ filter: ehAtivo ? "drop-shadow(0 0 10px rgba(0,180,255,0.7))" : "none" }}
                >
                  <Icone size={22} strokeWidth={ehAtivo ? 2.2 : 1.8} />
                </motion.span>
                <span className="relative h-[3px] w-[22px] overflow-hidden rounded-full bg-white/15">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[#F48FB1]"
                    style={{
                      width: ehAtivo ? `${Math.round(progresso * 100)}%` : i < ativo ? "100%" : "0%",
                    }}
                  />
                </span>
              </motion.button>
            );
          })}
        </nav>

        <div className="mt-3 flex flex-col gap-2.5">
          <motion.div whileTap={menosMovimento ? { scale: 1 } : { scale: 0.98 }}>
            <Link
              to="/login"
              search={{ aba: "criar", proximo: proximo ?? "/comecar" }}
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#6B5F8F] text-base font-semibold text-white shadow-lg shadow-[#6B5F8F]/30 transition-colors hover:bg-[#51466F]"
            >
              Começar Agora
            </Link>
          </motion.div>

          <button
            type="button"
            onClick={() => setLoginAberto(true)}
            className="flex h-11 w-full items-center justify-center text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Já possui conta? <span className="ml-1 text-white underline underline-offset-4">Faça login</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {loginAberto && <BottomSheetLogin aoFechar={fecharLogin} reduzirMovimento={menosMovimento} proximo={proximo} />}
      </AnimatePresence>
    </div>
  );
}

function MockupCena({ id }: { id: string }) {
  if (id === "site") {
    return (
      <div className="flex h-full flex-col justify-between text-xs">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <p className="font-bold text-sm text-white">Estúdio Aurora</p>
              <p className="text-[11px] text-[#00B4FF]">Seu momento, sua escolha</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Aberto</span>
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
            {["Ana M.", "Bruno C.", "Camila A."].map((prof) => (
              <span key={prof} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80">
                <User size={12} className="text-[#00B4FF]" />{prof}
              </span>
            ))}
          </div>
          <p className="mt-3 font-semibold text-[11px] uppercase tracking-wider text-white/60">Mais procurados</p>
          <div className="mt-1.5 space-y-1.5">
            {[
              { nome: "Atendimento personalizado", preco: "R$ 70,00", duracao: "60 min" },
              { nome: "Consulta inicial", preco: "R$ 55,00", duracao: "45 min" },
            ].map((s) => (
              <div key={s.nome} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.04] p-2.5">
                <div>
                  <p className="font-medium text-white">{s.nome}</p>
                  <p className="text-[10px] text-white/50">{s.preco} · {s.duracao}</p>
                </div>
                <span className="rounded-full bg-[#00509D] px-2.5 py-1 text-[11px] font-semibold text-white">Agendar</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (id === "agenda") {
    return (
      <div className="flex h-full flex-col justify-between text-xs">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-semibold text-white">Horários disponíveis</span>
            <span className="text-[11px] text-[#00B4FF]">3 profissionais livres</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { hora: "09:00", prof: "Ana Martins" },
              { hora: "09:15", prof: "Bruno Costa" },
              { hora: "09:30", prof: "Camila Alves" },
              { hora: "09:45", prof: "Ana Martins" },
            ].map((slot) => (
              <div key={slot.hora} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-[#00B4FF]">{slot.hora}</span>
                  <span className="text-white/80">{slot.prof}</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-400">Selecionar</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (id === "lembretes") {
    return (
      <div className="flex h-full flex-col justify-center gap-2.5 text-xs">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-2 font-semibold text-emerald-400"><Check size={16} /> Agendamento confirmado</div>
          <p className="mt-1 text-[11px] text-white/70">Amanhã às 09:15 · Atendimento com Ana Martins</p>
        </div>
        <div className="rounded-xl border border-[#00B4FF]/20 bg-[#00B4FF]/10 p-3">
          <div className="flex items-center gap-2 font-semibold text-[#00B4FF]"><Clock size={16} /> Lembrete via WhatsApp</div>
          <p className="mt-1 text-[11px] text-white/70">Enviado com antecedência de 2h para o cliente.</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 font-semibold text-amber-400"><Star size={16} /> Nova avaliação recebida</div>
          <p className="mt-1 text-[11px] text-white/70">★ ★ ★ ★ ★ de Gabriel Santos</p>
        </div>
      </div>
    );
  }

  if (id === "avaliacoes") {
    return (
      <div className="flex h-full flex-col justify-between text-xs">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <p className="font-bold text-base text-white">4.8 / 5.0</p>
              <div className="flex items-center gap-1 text-[#FFD700]">{"★★★★★"}</div>
            </div>
            <span className="text-[11px] text-white/50">20 avaliações ilustrativas</span>
          </div>
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Lucas Ferreira</span>
              <span className="text-[10px] text-white/60">Exemplo</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
              "Atendimento pontual e uma ótima experiência. A equipe me recebeu com atenção do início ao fim!"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between text-xs">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Visão dos últimos 30 dias · exemplo</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.04] p-2 text-center">
            <p className="text-[10px] text-white/50">Atendimentos</p>
            <p className="mt-0.5 text-base font-extrabold text-white">1.240</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.04] p-2 text-center">
            <p className="text-[10px] text-white/50">Clientes</p>
            <p className="mt-0.5 text-base font-extrabold text-[#00B4FF]">186</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.04] p-2 text-center">
            <p className="text-[10px] text-white/50">Retorno</p>
            <p className="mt-0.5 text-base font-extrabold text-emerald-400">15%</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-gradient-to-r from-[#00509D]/30 to-transparent p-3">
          <p className="text-[11px] font-bold text-white">Agenda online</p>
          <p className="mt-0.5 text-[10px] text-white/70">Novos horários disponíveis para seus clientes.</p>
        </div>
      </div>
    </div>
  );
}

function BottomSheetLogin({
  aoFechar,
  reduzirMovimento,
  proximo,
}: {
  aoFechar: () => void;
  reduzirMovimento: boolean;
  proximo?: string | undefined;
}) {
  const dialogoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialogo = dialogoRef.current;
    dialogo?.querySelector<HTMLButtonElement>('button[aria-label="Fechar login"]')?.focus();

    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        aoFechar();
        return;
      }
      if (event.key !== "Tab") return;
      const elementos = Array.from(
        dialogo?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [],
      );
      if (!elementos.length) return;
      const primeiro = elementos[0]!;
      const ultimo = elementos[elementos.length - 1]!;
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, [aoFechar]);

  return (
    <motion.div
      initial={reduzirMovimento ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduzirMovimento ? 0 : 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <motion.div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-login-flow"
        tabIndex={-1}
        initial={reduzirMovimento ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={reduzirMovimento ? { opacity: 0 } : { y: "100%" }}
        transition={reduzirMovimento ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[28px] border-t border-white/10 bg-[#121824] px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 shadow-2xl"
      >
        <div aria-hidden="true" className="mb-4 mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 id="titulo-login-flow" className="text-lg font-bold text-white">Acesse sua conta</h2>
            <p className="text-xs text-white/70">Entre para gerenciar seu negócio ou horários.</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar login"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Link to="/login" search={proximo ? { proximo } : {}} className="flex h-12 w-full items-center justify-between rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15">
            <div className="flex items-center gap-3"><Mail size={18} className="text-[#A8C7FA]" aria-hidden /><span>Continuar para login</span></div>
            <ChevronRight size={18} className="text-white/70" aria-hidden />
          </Link>
          <p className="text-center text-xs text-white/70">Entre com e-mail e senha, Google ou Apple.</p>
        </div>
        <div className="mt-5 text-center">
          <Link to="/login" search={{ aba: "criar", proximo: proximo ?? "/comecar" }} className="inline-flex min-h-11 items-center text-xs text-[#A8C7FA] hover:underline">
            Ainda não tem conta? Criar conta
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
