import { Check, Copy, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { AnelOndulado } from "@/components/ui/AnelOndulado";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { fonteDoLink, trechoDigitado } from "@/lib/conclusao-do-onboarding";
import { CONCLUSAO, CURVA, MOLA } from "@/lib/movimento-figaro";

/** Link que aparece letra a letra, com cursor. Quem usa leitor de tela lê o link inteiro de uma vez. */
function LinkDigitado({ texto, parado }: { texto: string; parado: boolean }) {
  const [n, setN] = useState(parado ? texto.length : 0);
  const [cursor, setCursor] = useState(true);
  const digitando = n < texto.length;

  useEffect(() => {
    if (parado) {
      setN(texto.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((atual) => {
        if (atual + 1 >= texto.length) window.clearInterval(id);
        return atual + 1;
      });
    }, CONCLUSAO.letraMs);
    return () => window.clearInterval(id);
  }, [texto, parado]);

  useEffect(() => {
    if (!digitando) return;
    const id = window.setInterval(() => setCursor((c) => !c), CONCLUSAO.cursorMs);
    return () => window.clearInterval(id);
  }, [digitando]);

  return (
    <p
      aria-label={texto}
      className="mt-2 break-all font-semibold text-paper"
      style={{ fontSize: fonteDoLink(texto, 342) }}
    >
      <span aria-hidden>
        {trechoDigitado(texto, n)}
        {digitando ? (
          <span
            className="ml-px inline-block w-0.5 bg-gold align-middle"
            style={{ height: "1em", opacity: cursor ? 1 : 0 }}
          />
        ) : null}
        {/* O resto fica invisível para a altura não pular enquanto digita. */}
        <span className="invisible">{texto.slice(n)}</span>
      </span>
    </p>
  );
}

/**
 * Conclusão do onboarding no padrão do Figaro (`OnboardingCompleteScreen`, spec 6 §4). Primeiro a espera
 * ("Configurando sua página…", anel ondulado girando); quando `carregando` acaba, o anel fecha e vira o
 * círculo com o visto em 520 ms, o texto da espera esmaece por cima do conteúdo, que sobe e aparece com a
 * mola `lentaEfeito`; o logotipo entra 800 ms depois e o link é digitado.
 */
export function ConclusaoDoOnboarding({
  titulo,
  link,
  linkCurto,
  onCopiar,
  onCompartilhar,
  onIrParaAgenda,
  onRevisar,
  copiado,
  carregando = false,
}: {
  titulo: string;
  link: string;
  linkCurto: string;
  onCopiar: () => void | Promise<void>;
  onCompartilhar: () => void | Promise<void>;
  onIrParaAgenda: () => void;
  onRevisar: () => void;
  copiado: boolean;
  /** A página ainda está sendo publicada: mostra só a espera. */
  carregando?: boolean;
}) {
  const menosMovimento = useMenosMovimento();
  const [logo, setLogo] = useState(menosMovimento);

  useEffect(() => {
    if (menosMovimento) {
      setLogo(true);
      return;
    }
    const id = window.setTimeout(() => setLogo(true), CONCLUSAO.logoAtrasoMs);
    return () => window.clearTimeout(id);
  }, [menosMovimento]);

  return (
    <div className="pt-2 text-center" data-link={link}>
      <div
        className="mx-auto grid place-items-center"
        style={{ width: CONCLUSAO.heroPx, height: CONCLUSAO.heroPx }}
      >
        <AnelOndulado completo={!carregando} tamanho={CONCLUSAO.heroPx} />
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {carregando ? (
          <motion.div
            key="carregando"
            role="status"
            exit={{ opacity: 0 }}
            transition={{
              duration: menosMovimento ? 0.15 : CONCLUSAO.heroSegundos,
              ease: CURVA.rapidaParaLenta,
            }}
          >
            <h2 className="mt-6 text-3xl font-semibold leading-tight text-paper">
              Configurando sua página…
            </h2>
            <p className="mt-3 text-base text-mute">Isso levará apenas um instante.</p>
          </motion.div>
        ) : (
          <motion.div
            key="pronto"
            initial={menosMovimento ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={menosMovimento ? { duration: 0.15 } : MOLA.lentaEfeito}
          >
            <h2 className="mt-6 text-xl font-semibold text-paper">{titulo}</h2>
            <LinkDigitado texto={linkCurto} parado={menosMovimento} />
            <p className="mt-3 text-sm text-mute">
              Você pode personalizar o layout e o tema da página quando quiser.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 whitespace-nowrap text-sm"
                onClick={onCopiar}
              >
                <Copy size={14} className="mr-1.5 inline" aria-hidden />
                {copiado ? "Copiado" : "Copiar link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12 whitespace-nowrap text-sm"
                onClick={onCompartilhar}
              >
                <Share2 size={14} className="mr-1.5 inline" aria-hidden />
                Compartilhar
              </Button>
            </div>
            <Button
              variant="primary"
              type="button"
              className="mt-4 min-h-14 w-full text-sm"
              onClick={onIrParaAgenda}
            >
              <Check aria-hidden /> Ir para a agenda
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="mt-3 min-h-12 w-full text-center text-xs text-mute"
              onClick={onRevisar}
            >
              Revisar configuração
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="mt-8 flex justify-center"
        aria-label="Flow"
        initial={{ opacity: 0 }}
        animate={{ opacity: logo && !carregando ? 1 : 0 }}
        transition={{ duration: menosMovimento ? 0.15 : 0.4, ease: CURVA.rapidaParaLenta }}
      >
        <MarcaFlow variante="automatica" className="h-6 w-auto" />
      </motion.div>
    </div>
  );
}
