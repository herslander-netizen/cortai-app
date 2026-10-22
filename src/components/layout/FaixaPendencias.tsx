import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

import { getConfiguracaoInicial, ITENS_DO_CHECKLIST } from "@/lib/onboarding.functions";
import { transicaoBase } from "@/lib/motion";

/**
 * Faixa de configuração pendente. Ao rolar, encolhe para uma pílula
 * e desaparece quando não falta mais nada.
 */
export function FaixaPendencias() {
  const [encolhida, setEncolhida] = useState(false);
  const { data } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });

  useEffect(() => {
    const aoRolar = () => setEncolhida(window.scrollY > 40);
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  if (!data) return null;
  const pendentes = ITENS_DO_CHECKLIST.filter((i) => !data.itens[i.chave]);
  if (pendentes.length === 0) return null;

  const proximo = pendentes[0]!;
  const texto =
    pendentes.length === 1
      ? "Falta 1 coisa para deixar seu negócio pronto"
      : `Faltam ${pendentes.length} coisas para deixar seu negócio pronto`;

  return (
    // Entrada do Figaro (`AgendaOnboardingToast`): sobe a própria altura com esmaecer, 320 ms.
    <motion.div
      layout
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transicaoBase, duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="mb-4"
    >
      <Link
        to={proximo.destino}
        className={`flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft text-gold transition-transform duration-[120ms] active:scale-[0.98] ${
          encolhida ? "w-fit px-3 py-1.5" : "w-full px-4 py-3"
        }`}
      >
        <span className={`min-w-0 truncate ${encolhida ? "text-xs" : "text-xs"}`}>
          {encolhida ? `${pendentes.length} pendente${pendentes.length > 1 ? "s" : ""}` : texto}
        </span>
        <ChevronRight size={14} className="ml-auto shrink-0" aria-hidden />
      </Link>
    </motion.div>
  );
}
