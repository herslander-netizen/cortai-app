import type { ConteudoApresentacao } from "@/lib/apresentacao-conteudo";
import { Capitulos } from "./Capitulos";
import { BarraDoCelular, ChamadaFinal, FaixaDeFotos, Perguntas, Planos } from "./Fechamento";
import { OfertaGratis } from "./OfertaGratis";
import { TEMA_CLARO } from "./tema";
import { Cabecalho, Heroi } from "./Topo";

/** Página pública promocional do Flow (antes do login): claro, escuro, claro… com telas animadas do produto. */
export function Landing({ conteudo }: { conteudo: ConteudoApresentacao }) {
  return (
    <div style={TEMA_CLARO} className="min-h-dvh bg-[var(--fundo)] text-[var(--texto)]">
      <Cabecalho />
      <main>
        <Heroi conteudo={conteudo.hero} />
        <OfertaGratis />
        <FaixaDeFotos />
        <Capitulos />
        <Planos conteudo={conteudo.planos} />
        <Perguntas bloco={conteudo.duvidas} perguntas={conteudo.perguntas} />
        <ChamadaFinal conteudo={conteudo.final} />
      </main>
      <BarraDoCelular />
    </div>
  );
}
