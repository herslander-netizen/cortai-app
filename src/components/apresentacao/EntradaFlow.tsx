import { useEffect, useRef, useState, type ComponentType } from "react";
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
  Lock,
  Mail,
  Star,
  User,
  X,
} from "lucide-react";

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
    texto: "O cliente descobre cada detalhe da sua barbearia.",
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

export function EntradaFlow() {
  const [ativo, setAtivo] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [loginAberto, setLoginAberto] = useState(false);

  const pausado = useRef(false);
  const toqueX = useRef<number | null>(null);
  const decorridoRef = useRef(0);

  useEffect(() => {
    let anterior = performance.now();
    let quadro = 0;

    const passo = (agora: number) => {
      const dt = agora - anterior;
      anterior = agora;

      if (!pausado.current && !loginAberto) {
        decorridoRef.current += dt;

        if (decorridoRef.current >= DURACAO_CENA_MS) {
          decorridoRef.current = 0;
          setAtivo((atual) => (atual + 1) % CENAS.length);
        }

        setProgresso(decorridoRef.current / DURACAO_CENA_MS);
      }

      quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [loginAberto]);

  const irPara = (indice: number) => {
    decorridoRef.current = 0;
    setAtivo((indice + CENAS.length) % CENAS.length);
    setProgresso(0);
  };

  const cenaAtual = CENAS[ativo] ?? CENAS[0]!;

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[400px] flex-col overflow-hidden bg-[#0A0D14] text-white select-none">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#00509D]/20 blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#FF2D78]/15 blur-[90px]" />

      <div className="relative z-10 flex h-full flex-col px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),20px)]">
        <header className="flex flex-col items-center pt-2">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-extrabold tracking-tight text-white">flow</span>
            <span className="h-2 w-2 rounded-full bg-[#FF2D78]" />
          </div>
        </header>

        <section
          className="mt-4 flex flex-1 flex-col justify-center"
          onPointerDown={(e) => {
            pausado.current = true;
            toqueX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            pausado.current = false;
            if (toqueX.current !== null) {
              const dx = e.clientX - toqueX.current;
              if (Math.abs(dx) > 45) irPara(ativo + (dx < 0 ? 1 : -1));
            }
            toqueX.current = null;
          }}
          onPointerCancel={() => {
            pausado.current = false;
            toqueX.current = null;
          }}
          onPointerLeave={() => {
            pausado.current = false;
            toqueX.current = null;
          }}
        >
          <div className="relative mx-auto h-[320px] w-full overflow-hidden rounded-[26px] border border-white/10 bg-[#121824]/90 p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={cenaAtual.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="h-full w-full"
              >
                <MockupCena id={cenaAtual.id} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex h-[74px] flex-col items-center justify-center text-center">
            <span className="text-[11px] font-extrabold tracking-widest text-[#00B4FF]">
              {cenaAtual.tag}
            </span>
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
                aria-label={c.tag}
                aria-current={ehAtivo ? "true" : undefined}
                onClick={() => irPara(i)}
                whileTap={{ scale: 0.9 }}
                className="flex h-14 w-14 flex-col items-center justify-center gap-1.5"
              >
                <motion.span
                  animate={{ scale: ehAtivo ? 1.18 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={ehAtivo ? "text-white" : "text-white/40"}
                  style={{ filter: ehAtivo ? "drop-shadow(0 0 10px rgba(0,180,255,0.7))" : "none" }}
                >
                  <Icone size={22} strokeWidth={ehAtivo ? 2.2 : 1.8} />
                </motion.span>
                <span className="relative h-[3px] w-[22px] overflow-hidden rounded-full bg-white/15">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[#FFD700]"
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
          <motion.div whileTap={{ scale: 0.98 }}>
            <Link
              to="/comecar"
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#00509D] text-base font-semibold text-white shadow-lg shadow-[#00509D]/30 transition-colors hover:bg-[#003C8C]"
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
        {loginAberto && <BottomSheetLogin aoFechar={() => setLoginAberto(false)} />}
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
              <p className="font-bold text-sm text-white">Barbearia Gomes</p>
              <p className="text-[11px] text-[#00B4FF]">Seu Visual, Nosso Orgulho</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Aberto</span>
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
            {["Lucas M.", "Rafael C.", "Diego A."].map((prof) => (
              <span key={prof} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80">
                <User size={12} className="text-[#00B4FF]" />{prof}
              </span>
            ))}
          </div>
          <p className="mt-3 font-semibold text-[11px] uppercase tracking-wider text-white/60">Mais procurados</p>
          <div className="mt-1.5 space-y-1.5">
            {[
              { nome: "Degradê Premium", preco: "R$ 70,00", duracao: "60 min" },
              { nome: "Corte Masculino", preco: "R$ 55,00", duracao: "45 min" },
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
            <span className="font-semibold text-white">Sexta, 14 de Novembro</span>
            <span className="text-[11px] text-[#00B4FF]">3 profissionais livres</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { hora: "09:00", prof: "Lucas Martins", status: "Livre" },
              { hora: "09:15", prof: "Rafael Costa", status: "Livre" },
              { hora: "09:30", prof: "Diego Alves", status: "Disponível" },
              { hora: "09:45", prof: "Lucas Martins", status: "Disponível" },
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
          <p className="mt-1 text-[11px] text-white/70">Amanhã às 09:15 · Corte com Lucas Martins</p>
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
            <span className="text-[11px] text-white/50">20 avaliações</span>
          </div>
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Lucas Ferreira</span>
              <span className="text-[10px] text-white/40">Hoje</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
              "Melhor corte que já fiz na cidade. O Rafael entendeu exatamente o que eu queria e ainda ajustou a barba do jeito certo!"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between text-xs">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Visão dos últimos 30 dias</p>
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
          <p className="text-[11px] font-bold text-white">Campanha Dia dos Pais</p>
          <p className="mt-0.5 text-[10px] text-white/70">Presenteie seu pai com um visual novo!</p>
        </div>
      </div>
    </div>
  );
}

function BottomSheetLogin({ aoFechar }: { aoFechar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-t-[28px] border-t border-white/10 bg-[#121824] px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 shadow-2xl"
      >
        <div className="mb-4 mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="text-lg font-bold text-white">Acesse sua conta</h2>
            <p className="text-xs text-white/60">Entre para gerenciar seu negócio ou horários.</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar login"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Link to="/login" className="flex h-12 w-full items-center justify-between rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15">
            <div className="flex items-center gap-3"><Mail size={18} className="text-[#00B4FF]" /><span>Entrar com E-mail ou Telefone</span></div>
            <ChevronRight size={18} className="text-white/40" />
          </Link>
          <Link to="/login" className="flex h-12 w-full items-center justify-between rounded-xl bg-white/5 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10">
            <div className="flex items-center gap-3"><Lock size={18} className="text-[#FF2D78]" /><span>Entrar com Google ou Apple</span></div>
            <ChevronRight size={18} className="text-white/40" />
          </Link>
        </div>
        <div className="mt-5 text-center">
          <Link to="/comecar" className="text-xs text-[#00B4FF] hover:underline">
            Ainda não tem conta? Crie grátis em 1 minuto
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
