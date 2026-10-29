import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessao } from "@/lib/sessao.functions";
import { getCapacidades, getUsoDaAgendaOnline } from "@/lib/capacidades.functions";
import { MOLA } from "@/lib/movimento-figaro";
import {
  getConfiguracaoInicial,
  ITENS_DO_CHECKLIST,
  marcarItemDoChecklist,
} from "@/lib/onboarding.functions";

/**
 * Primeiros passos na tela inicial. Só para quem cuida da barbearia.
 * Cada item é detectado de verdade; a lista some quando tudo estiver feito.
 */
/** Contador discreto do teste grátis. */
function ContadorDoTeste() {
  const { data } = useQuery({
    queryKey: ["capacidades"],
    queryFn: () => getCapacidades(),
    staleTime: 300_000,
  });
  if (!data?.teste?.ativo) return null;
  const dias = data.teste.diasRestantes;
  return (
    <Link
      to="/barbeiro/plano"
      className="mt-4 flex min-h-12 w-full basis-full items-center justify-between gap-3 rounded-xl border border-line px-4 text-left text-xs text-mute"
    >
      <span>Teste grátis: {dias === 1 ? "resta 1 dia" : `restam ${dias} dias`}</span>
      <ChevronRight size={16} aria-hidden />
    </Link>
  );
}

/** Aviso do limite mensal de agendamentos (só aparece em 80% e 100%). */
function AvisoDoLimiteMensal() {
  const { data } = useQuery({
    queryKey: ["uso-agenda-online"],
    queryFn: () => getUsoDaAgendaOnline(),
    staleTime: 300_000,
  });
  if (!data?.aviso) return null;
  const atingido = data.aviso === "atingido";
  return (
    <Link
      to="/barbeiro/plano"
      role="status"
      className="mt-4 flex min-h-12 w-full basis-full items-center justify-between gap-3 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-paper">
          {atingido
            ? "Limite de agendamentos do mês atingido"
            : `${data.uso} de ${data.limite} agendamentos do mês`}
        </span>
        <span className="block text-xs text-mute">
          {atingido
            ? "Seus clientes estão sendo direcionados ao WhatsApp. Faça upgrade para agendamentos ilimitados."
            : "Perto do limite: depois dele, seus clientes vão para o WhatsApp."}
        </span>
      </span>
      <ChevronRight size={16} className="text-mute" aria-hidden />
    </Link>
  );
}

const DETALHES_DO_CHECKLIST: Record<(typeof ITENS_DO_CHECKLIST)[number]["chave"], string> = {
  cadastrar_servicos:
    "Defina os serviços, a duração e os preços para que seus clientes possam escolher o que desejam agendar.",
  cadastrar_profissionais:
    "Adicione as pessoas que atendem e organize a equipe para disponibilizar os horários corretos.",
  whatsapp:
    "Conecte o WhatsApp para habilitar os canais de mensagens e notificações configurados no Flow.",
  compartilhar_link:
    "Envie sua página de agendamento para que os clientes consultem os serviços e escolham um horário.",
};

export function PrimeirosPassos() {
  return (
    <>
      <ContadorDoTeste />
      <AvisoDoLimiteMensal />
      <ListaDePrimeirosPassos />
    </>
  );
}

function ListaDePrimeirosPassos() {
  const reduzirMovimento = useReducedMotion();
  const marcar = useServerFn(marcarItemDoChecklist);
  const queryClient = useQueryClient();
  const [detalheAberto, setDetalheAberto] = useState<string | null>(null);
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const cuidaDaBarbearia = Boolean(sessao?.permissoes.includes("alterar_dados_barbearia"));
  const { data } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
    enabled: cuidaDaBarbearia,
    staleTime: 60_000,
  });

  if (!cuidaDaBarbearia || !data) return null;

  if (!data.concluidoEm) {
    return (
      <Link
        to="/barbeiro/configurar"
        className="mt-4 flex w-full basis-full text-left min-h-14 items-center gap-3 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-paper">Termine de configurar</span>
          <span className="block text-xs text-mute">
            Faltam poucos passos para seu link ficar pronto.
          </span>
        </span>
        <ChevronRight size={16} className="text-mute" aria-hidden />
      </Link>
    );
  }

  const feitos = ITENS_DO_CHECKLIST.filter((i) => data.itens[i.chave]).length;
  if (feitos === ITENS_DO_CHECKLIST.length) return null;

  return (
    <section
      className="mt-4 w-full basis-full surface px-4 py-3 text-left"
      aria-label="Primeiros passos"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-paper">Primeiros passos</h2>
        <span className="text-xs text-mute">
          {feitos} de {ITENS_DO_CHECKLIST.length}
        </span>
      </div>
      <ul className="mt-1">
        {ITENS_DO_CHECKLIST.map((item) => {
          const feito = Boolean(data.itens[item.chave]);
          const aberto = detalheAberto === item.chave;
          return (
            <li key={item.chave} className="py-1">
              <div className="flex items-center gap-1">
                <Link
                  to={item.destino}
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3"
                  onClick={() => {
                    // Compartilhar o link é o único que não dá para detectar sozinho.
                    if (feito || item.chave !== "compartilhar_link") return;
                    void marcar({ data: { chave: item.chave, feito: true } }).then(() =>
                      queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] }),
                    );
                  }}
                >
                  <motion.span
                    className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-full border"
                    animate={{
                      backgroundColor: feito ? "var(--paper)" : "transparent",
                      borderColor: feito ? "var(--paper)" : "var(--mute2)",
                    }}
                    transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoCompose}
                    aria-hidden
                  >
                    <AnimatePresence initial={false} mode="wait">
                      {feito ? (
                        <motion.span
                          key="feito"
                          initial={reduzirMovimento ? false : { opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoCompose}
                        >
                          <Check size={12} className="text-ink" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="pendente"
                          initial={reduzirMovimento ? false : { opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoCompose}
                        >
                          <Circle size={16} className="text-mute2" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  <span className={`min-w-0 text-sm ${feito ? "text-mute line-through" : "text-paper"}`}>
                    {item.rotulo}
                  </span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`${aberto ? "Ocultar" : "Ver"} detalhes: ${item.rotulo}`}
                  aria-expanded={aberto}
                  aria-controls={`detalhe-primeiro-passo-${item.chave}`}
                  className="size-12 shrink-0 px-0 text-mute"
                  onClick={() => setDetalheAberto(aberto ? null : item.chave)}
                >
                  <motion.span
                    aria-hidden
                    animate={{ rotate: aberto ? 180 : 0 }}
                    transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoCompose}
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </Button>
                {feito ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-12 shrink-0 px-2 text-xs font-medium text-mute"
                    onClick={() =>
                      void marcar({ data: { chave: item.chave, feito: true } }).then(() =>
                        queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] }),
                      )
                    }
                  >
                    Pular
                  </Button>
                )}
              </div>
              <AnimatePresence initial={false}>
                {aberto ? (
                  <motion.div
                    key={item.chave}
                    id={`detalhe-primeiro-passo-${item.chave}`}
                    role="region"
                    aria-label={`Detalhes de ${item.rotulo}`}
                    initial={reduzirMovimento ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={
                      reduzirMovimento
                        ? { duration: 0 }
                        : { height: MOLA.tamanho, opacity: MOLA.padraoEfeito }
                    }
                    className="overflow-hidden"
                  >
                    <p className="ml-7 mr-2 pb-3 pr-2 text-xs leading-relaxed text-mute">
                      {DETALHES_DO_CHECKLIST[item.chave]}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
