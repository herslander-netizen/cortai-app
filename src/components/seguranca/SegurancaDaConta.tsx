import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";

import { statusDaConta } from "@/lib/seguranca-conta.functions";

function Linha({
  rotulo,
  ok,
  textoOk,
  textoPendente,
}: {
  rotulo: string;
  ok: boolean;
  textoOk: string;
  textoPendente: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-sm text-mute">{rotulo}</span>
      <span className={`flex items-center gap-1.5 text-sm ${ok ? "text-paper" : "text-mute"}`}>
        {ok ? (
          <Check className="h-4 w-4 text-gold" aria-hidden />
        ) : (
          <AlertTriangle className="h-4 w-4 text-mute" aria-hidden />
        )}
        {ok ? textoOk : textoPendente}
      </span>
    </div>
  );
}

/** Bloco somente de leitura: o estado é calculado no servidor. */
export function SegurancaDaConta() {
  const consultar = useServerFn(statusDaConta);
  const { data } = useQuery({
    queryKey: ["seguranca-conta"],
    queryFn: () => consultar(),
    staleTime: 30000,
  });
  if (!data) return null;
  const equipe = data.papel !== "cliente";

  return (
    <section className="border-b border-line py-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-paper">
        <ShieldCheck className="h-4 w-4 text-gold" aria-hidden /> Segurança da conta
      </h2>
      <div className="mt-2">
        <Linha
          rotulo="E-mail"
          ok={data.emailVerificado}
          textoOk="Confirmado"
          textoPendente="Pendente"
        />
        {equipe ? (
          <Linha
            rotulo={data.telefoneMascarado ? `WhatsApp ${data.telefoneMascarado}` : "WhatsApp"}
            ok={data.whatsappVerificado}
            textoOk="Verificado"
            textoPendente="Não verificado"
          />
        ) : null}
        <Linha
          rotulo="Conta"
          ok={data.contaVerificada}
          textoOk={equipe ? "Verificada" : "Confirmada"}
          textoPendente="Verificação pendente"
        />
      </div>
      {equipe && !data.whatsappVerificado ? (
        <Link
          to="/barbeiro/mais"
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-lg border border-line2 text-sm font-medium text-paper"
        >
          Verificar WhatsApp
        </Link>
      ) : null}
    </section>
  );
}
