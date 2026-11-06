/**
 * Esqueletos das telas públicas (dono, 06/11/2026: "ajustar o esqueleto da página de login e da página pública"):
 * a entrada (`/login`, `/comecar`, `/`) é sempre clara e a página de divulgação (`/apresentacao`) começa escura, então
 * a espera tem o mesmo formato e as mesmas cores da tela que vai aparecer — antes aparecia o esqueleto escuro genérico.
 */
import { TEMA_CLARO, TEMA_ESCURO } from "@/components/apresentacao/landing/tema";
import { CLASSE_TELA_ENTRADA, TEMA_FIXO_ENTRADA } from "@/components/entrada/tema-fixo";
import { BlocoEsqueleto, Barra, RegiaoDeEsqueleto } from "@/components/layout/Esqueleto";

/** Mesmo desenho da entrada: logo e frase, cartão do celular, cinco ícones e os botões de baixo. */
export function EsqueletoDaEntrada() {
  return (
    <main className={CLASSE_TELA_ENTRADA} style={TEMA_FIXO_ENTRADA}>
      <RegiaoDeEsqueleto className="mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col px-5 pb-6 pt-10">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <BlocoEsqueleto className="h-[46px] w-[min(42vw,160px)] rounded-xl" />
          <Barra w="52%" h={12} />
        </div>
        <div className="mt-6 flex min-h-0 flex-1 justify-center">
          <BlocoEsqueleto className="h-full max-h-[460px] w-[80%] max-w-[320px] rounded-[30px]" />
        </div>
        <div className="mx-auto mt-5 flex w-full max-w-[320px] shrink-0 items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="flex flex-col items-center gap-2">
              <BlocoEsqueleto className="size-6 rounded-full" />
              <BlocoEsqueleto className="h-[3px] w-[18px] rounded-full" />
            </span>
          ))}
        </div>
        <div className="mt-5 flex shrink-0 flex-col items-center gap-3">
          <BlocoEsqueleto className="h-14 w-full rounded-full" />
          <Barra w="46%" h={12} />
          <Barra w="38%" h={10} />
        </div>
      </RegiaoDeEsqueleto>
    </main>
  );
}

/** Mesma sequência da página de divulgação: cabeçalho e abertura escuros, faixa da oferta e fotos em tema claro. */
export function EsqueletoDaApresentacao() {
  return (
    <div style={TEMA_CLARO} className="light min-h-dvh bg-[var(--fundo)] text-[var(--texto)]">
      <RegiaoDeEsqueleto>
        <div style={TEMA_ESCURO} className="bg-[var(--fundo)]">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <BlocoEsqueleto className="h-6 w-24 rounded-md" />
            <BlocoEsqueleto className="h-9 w-20 rounded-full" />
          </div>
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-5 pb-14 pt-10">
            <BlocoEsqueleto className="h-8 w-60 rounded-full" />
            <Barra w="86%" h={34} />
            <Barra w="64%" h={34} />
            <Barra w="78%" h={12} className="mt-2" />
            <Barra w="58%" h={12} />
            <BlocoEsqueleto className="mt-4 h-14 w-full max-w-sm rounded-2xl" />
            <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3">
              <BlocoEsqueleto className="aspect-[3/4] rounded-[22px]" />
              <BlocoEsqueleto className="aspect-[3/4] rounded-[22px]" />
              <BlocoEsqueleto className="aspect-[3/4] rounded-[22px]" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--painel)] px-4 py-12">
          <BlocoEsqueleto className="mx-auto h-72 max-w-5xl rounded-[32px]" />
        </div>
      </RegiaoDeEsqueleto>
    </div>
  );
}
