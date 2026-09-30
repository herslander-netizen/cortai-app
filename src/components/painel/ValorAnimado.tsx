import { useContagem } from "@/hooks/useMovimento";

/** Número do painel com contagem curta ao carregar. */
export function ValorAnimado({
  valor,
  formatar,
  primeiraCarga = false,
}: {
  valor: number;
  formatar: (n: number) => string;
  primeiraCarga?: boolean;
}) {
  const atual = useContagem(valor, 400, primeiraCarga);
  return <>{formatar(Math.round(atual))}</>;
}
