import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { gerarCodigoPorTelefone } from "@/lib/whatsapp.functions";
import { formatarCodigo } from "@/lib/whatsapp/pareamento-telefone";
import type { TipoDeConexao } from "@/lib/whatsapp/finalidade-conexao";

function formatarRestante(segundos: number) {
  const min = Math.floor(segundos / 60);
  return `${min}:${String(segundos % 60).padStart(2, "0")}`;
}

/**
 * Alternativa ao QR Code: o dono informa o número do WhatsApp e digita no celular o código
 * de 8 caracteres (WhatsApp → Aparelhos conectados → Conectar com número de telefone).
 * O estado da conexão segue sendo acompanhado pelo cartão de conexão.
 */
export function CodigoPorTelefone({
  tipo,
  aoGerar,
}: {
  tipo: TipoDeConexao;
  /** Chamado depois de um código gerado, para o cartão atualizar o estado da conexão. */
  aoGerar?: () => void;
}) {
  const gerar = useServerFn(gerarCodigoPorTelefone);
  const [aberto, setAberto] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [resultado, setResultado] = useState<{ codigo: string; expiraEm: string } | null>(null);
  const [restante, setRestante] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const pedido = useMutation({
    mutationFn: () => gerar({ data: { tipo, telefone } }),
    onSuccess: (r) => {
      if (r.codigo && r.expiraEm) {
        setResultado({ codigo: r.codigo, expiraEm: r.expiraEm });
        setMensagem(null);
        aoGerar?.();
      } else {
        setResultado(null);
        setMensagem(r.aviso ?? "Não foi possível gerar o código agora.");
      }
    },
    onError: (e: unknown) =>
      setMensagem(e instanceof Error ? e.message : "Não foi possível gerar o código agora."),
  });

  const expiraEm = resultado?.expiraEm ?? null;
  useEffect(() => {
    if (!expiraEm) {
      setRestante(null);
      return;
    }
    const calcular = () =>
      setRestante(Math.max(0, Math.round((new Date(expiraEm).getTime() - Date.now()) / 1000)));
    calcular();
    const id = window.setInterval(calcular, 1000);
    return () => window.clearInterval(id);
  }, [expiraEm]);

  const expirado = resultado !== null && restante !== null && restante <= 0;

  async function copiar() {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.codigo);
      aviso.ok("Código copiado");
    } catch {
      aviso.erro("Não foi possível copiar. Digite o código no celular.");
    }
  }

  if (!aberto) {
    return (
      <Button
        variant="outline"
        type="button"
        className="min-h-12 w-full text-paper"
        onClick={() => setAberto(true)}
      >
        <Smartphone aria-hidden />
        Conectar com número de telefone
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-line2 p-4">
      <p className="text-sm font-semibold text-paper">Conectar com número de telefone</p>
      <p className="mt-1 text-xs leading-relaxed text-mute">
        Informe o número do WhatsApp que será o do negócio. Vamos gerar um código para você digitar
        no celular.
      </p>

      {resultado && !expirado ? (
        <div className="mt-4 text-center">
          <p
            className="select-all font-mono text-3xl font-semibold tracking-[0.18em] text-paper"
            aria-label={`Código ${resultado.codigo.split("").join(" ")}`}
          >
            {formatarCodigo(resultado.codigo)}
          </p>
          {restante !== null ? (
            <p
              className={`mt-2 text-xs font-medium ${restante <= 15 ? "text-brick" : "text-mute2"}`}
              role="timer"
              aria-live="polite"
            >
              Este código expira em {formatarRestante(restante)}.
            </p>
          ) : null}
          <ol className="mt-4 space-y-1 text-left text-xs leading-relaxed text-paper">
            <li>1. Abra o WhatsApp no celular do negócio.</li>
            <li>2. Toque em Aparelhos conectados → Conectar um aparelho.</li>
            <li>3. Escolha “Conectar com número de telefone” e digite o código acima.</li>
          </ol>
          <Button
            variant="outline"
            type="button"
            className="mt-4 min-h-12 w-full text-paper"
            onClick={() => void copiar()}
          >
            <Copy aria-hidden />
            Copiar código
          </Button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            pedido.mutate();
          }}
        >
          <label className="block text-xs text-mute" htmlFor={`telefone-pareamento-${tipo}`}>
            Número do WhatsApp (com DDD)
          </label>
          <Input
            id={`telefone-pareamento-${tipo}`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-8888"
            className="min-h-12"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          {expirado ? (
            <p className="text-xs text-brick">
              O código expirou. Gere um novo para tentar de novo.
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-12 w-full"
            disabled={pedido.isPending || telefone.replace(/\D/g, "").length < 10}
          >
            {pedido.isPending ? "Gerando…" : expirado ? "Gerar novo código" : "Gerar código"}
          </Button>
        </form>
      )}

      {mensagem ? <p className="mt-3 text-center text-sm text-brick">{mensagem}</p> : null}

      <Button
        variant="ghost"
        type="button"
        className="mt-3 min-h-12 w-full text-sm text-mute"
        onClick={() => setAberto(false)}
      >
        Voltar para o QR Code
      </Button>
    </div>
  );
}
