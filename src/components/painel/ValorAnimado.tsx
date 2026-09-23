import { useContagem } from "@/hooks/useMovimento";

/** Número do painel com contagem curta ao carregar. */
export function ValorAnimado({
  valor,
  formatar,
}: {
  valor: number;
  formatar: (n: number) => string;
}) {
  const atual = useContagem(valor);
  return <>{formatar(Math.round(atual))}</>;
}
