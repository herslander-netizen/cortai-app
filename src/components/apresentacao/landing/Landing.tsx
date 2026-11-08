import type { ConteudoApresentacao } from "@/lib/apresentacao-conteudo";
import { Capitulos } from "./Capitulos";
import { CatalogoPublico } from "./CatalogoPublico";
import { BotaoFlutuanteWhatsApp, ChamadaFinal, FaixaDeFotos, Perguntas, Planos } from "./Fechamento";
import { OfertaGratis } from "./OfertaGratis";
import { TEMA_CLARO } from "./tema";
import { Cabecalho, Heroi } from "./Topo";

/** Página pública promocional do Flow: claro, escuro, claro… com demonstrações animadas. */
export function Landing({ conteudo }: { conteudo: ConteudoApresentacao }) {
  return (
    <div style={TEMA_CLARO} className="light min-h-dvh bg-[var(--fundo)] text-[var(--texto)]">
      <Cabecalho />
      <main>
        <Heroi conteudo={conteudo.hero} />
        <OfertaGratis />
        <FaixaDeFotos />
        <div id="como-funciona" className="scroll-mt-20">
          <Capitulos />
        </div>
        <CatalogoPublico />
        <Planos conteudo={conteudo.planos} />
        <Perguntas bloco={conteudo.duvidas} perguntas={conteudo.perguntas} />
        <ChamadaFinal conteudo={conteudo.final} />
      </main>
      <BotaoFlutuanteWhatsApp />
    </div>
  );
}
