import { GRUPOS_DE_FUNCIONALIDADES } from "@/lib/funcionalidades";

import { TEMA_CLARO } from "./tema";

/** O catálogo comercial reutiliza os mesmos rótulos e descrições do painel de funcionalidades. */
export function CatalogoPublico() {
  const total = GRUPOS_DE_FUNCIONALIDADES.reduce((acc, grupo) => acc + grupo.itens.length, 0);

  return (
    <section
      id="funcionalidades"
      style={TEMA_CLARO}
      aria-labelledby="titulo-funcionalidades-flow"
      className="scroll-mt-20 bg-[var(--fundo)] px-4 py-16 text-[var(--texto)] sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--figaro-primary)]">
          Funcionalidades
        </p>
        <h2
          id="titulo-funcionalidades-flow"
          className="mx-auto mt-3 max-w-2xl text-center font-serif text-[30px] font-bold leading-[1.1] sm:text-[42px]"
        >
          Um Flow para cada parte do seu negócio.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[14px] leading-relaxed text-[var(--texto-suave)] sm:text-[16px]">
          Conheça {total} funcionalidades organizadas para facilitar sua rotina.
          Alguns recursos dependem do plano e das configurações do estabelecimento.
        </p>

        <div className="mt-10 grid items-start gap-5 md:grid-cols-2">
          {GRUPOS_DE_FUNCIONALIDADES.map((grupo) => (
            <section
              key={grupo.titulo}
              className="rounded-[24px] bg-[var(--cartao)] p-5 shadow-[0_16px_40px_-28px_rgba(40,40,120,0.45)] ring-1 ring-[var(--linha)] sm:p-6"
            >
              <h3 className="font-serif text-[22px] font-bold">{grupo.titulo}</h3>
              <ul className="mt-4 space-y-2.5">
                {grupo.itens.map((item) => (
                  <li
                    id={`recurso-${item.chave}`}
                    key={item.chave}
                    className="scroll-mt-24 rounded-xl bg-[var(--painel)] px-4 py-3"
                  >
                    <p className="text-[14px] font-bold">{item.rotulo}</p>
                    <p className="mt-1 text-[13px] leading-snug text-[var(--texto-suave)]">
                      {item.detalhe}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
