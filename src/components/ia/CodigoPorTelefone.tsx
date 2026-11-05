import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mascaraTelefone } from "@/lib/previa";
import { aviso } from "@/lib/avisos";
import { codigoAtualPorTelefone, gerarCodigoPorTelefone } from "@/lib/whatsapp.functions";
import {
  formatarCodigo,
  SEGUNDOS_DE_CADA_CODIGO,
  type EstadoDoCodigo,
} from "@/lib/whatsapp/pareamento-telefone";
import type { TipoDeConexao } from "@/lib/whatsapp/finalidade-conexao";

type Gerado = { codigo: string | null; expiraEm: string | null; aviso: string | null };

/**
 * Alternativa ao QR Code, dentro da gaveta de conexão: o dono informa o número do WhatsApp e digita no celular o
 * código de 8 caracteres. A Evolution troca o código a cada ~45 s e o antigo deixa de valer: depois de gerado, a
 * tela pergunta o código em vigor a cada poucos segundos e mostra sempre o atual.
 */
export function CodigoPorTelefone({
  tipo,
  aoGerar,
  gerarCodigo,
  acompanharCodigo,
  numeroCadastrado,
}: {
  tipo: TipoDeConexao;
  /** Chamado depois de um código gerado, para o cartão atualizar o estado da conexão. */
  aoGerar?: () => void;
  /** Outra conexão (ex.: linha da plataforma, no ADM): quem gera o código. Padrão: a conexão do negócio. */
  gerarCodigo?: (telefone: string) => Promise<Gerado>;
  /** Par de `gerarCodigo`: quem informa o código em vigor. */
  acompanharCodigo?: (telefone: string) => Promise<EstadoDoCodigo>;
  /** WhatsApp já no cadastro do negócio: aparece primeiro, para conectar o mesmo número sem digitar. */
  numeroCadastrado?: string | null;
}) {
  const gerarDoNegocio = useServerFn(gerarCodigoPorTelefone);
  const atualDoNegocio = useServerFn(codigoAtualPorTelefone);
  const [telefone, setTelefone] = useState("");
  const [outro, setOutro] = useState(false);
  const [emUso, setEmUso] = useState("");
  const cadastrado =
    numeroCadastrado && numeroCadastrado.replace(/\D/g, "").length >= 10 ? numeroCadastrado : null;
  const usarCadastrado = cadastrado !== null && !outro;
  const [codigo, setCodigo] = useState<string | null>(null);
  const [desde, setDesde] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  const [trocou, setTrocou] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const pedido = useMutation({
    mutationFn: (numero: string) =>
      gerarCodigo ? gerarCodigo(numero) : gerarDoNegocio({ data: { tipo, telefone: numero } }),
    onSuccess: (r, numero) => {
      if (r.codigo) {
        setEmUso(numero);
        setCodigo(r.codigo);
        setDesde(Date.now());
        setTrocou(false);
        setEncerrado(false);
        setMensagem(null);
        aoGerar?.();
      } else {
        setCodigo(null);
        setMensagem(r.aviso ?? "Não foi possível gerar o código agora.");
      }
    },
    onError: (e: unknown) =>
      setMensagem(e instanceof Error ? e.message : "Não foi possível gerar o código agora."),
  });

  const atual = useQuery({
    queryKey: ["whatsapp-codigo-atual", tipo, emUso],
    queryFn: () =>
      acompanharCodigo
        ? acompanharCodigo(emUso)
        : atualDoNegocio({ data: { tipo, telefone: emUso } }),
    enabled: codigo !== null && !encerrado,
    refetchInterval: 4000,
    retry: false,
  });

  useEffect(() => {
    const r = atual.data;
    if (!r) return;
    if (r.estado === "encerrado") setEncerrado(true);
    else if (r.estado === "aguardando" && r.codigo && r.codigo !== codigo) {
      setCodigo(r.codigo);
      setDesde(Date.now());
      setTrocou(true);
    }
  }, [atual.data, codigo]);

  useEffect(() => {
    if (codigo === null) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [codigo]);

  const decorrido = Math.max(0, Math.floor((agora - desde) / 1000));
  const restante = Math.max(0, SEGUNDOS_DE_CADA_CODIGO - decorrido);
  const fracao = restante / SEGUNDOS_DE_CADA_CODIGO;
  const mostrarCodigo = codigo !== null && !encerrado;

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setTrocou(false);
      aviso.ok("Código copiado. Cole no WhatsApp agora.");
    } catch {
      aviso.erro("Não foi possível copiar. Digite o código no celular.");
    }
  }

  return (
    <div>
      {mostrarCodigo ? (
        <div className="text-center">
          <ol className="space-y-1 text-left text-xs leading-relaxed text-paper">
            <li>
              1. No celular do negócio, abra o WhatsApp → Dispositivos conectados → Conectar
              dispositivo → Conectar com número de telefone.
            </li>
            <li>2. Com a tela “Insira o código” aberta, digite ou cole o código abaixo.</li>
          </ol>
          <p
            className="mt-4 select-all font-mono text-3xl font-semibold tracking-[0.18em] text-paper"
            aria-live="polite"
            aria-label={`Código ${codigo.split("").join(" ")}`}
          >
            {formatarCodigo(codigo)}
          </p>
          {trocou ? (
            <p className="mt-1 text-xs font-medium text-brick">
              O WhatsApp trocou o código. Use este.
            </p>
          ) : null}
          <div className="mx-auto mt-3 w-full max-w-[248px]" role="timer" aria-live="off">
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full w-full origin-left rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none ${restante <= 10 ? "bg-brick" : "bg-gold"}`}
                style={{ transform: `scaleX(${fracao})` }}
              />
            </div>
            <p className="mt-2 text-xs text-mute2 tabular-nums">
              {restante > 0
                ? `Vale por mais ${restante} s. Depois aparece outro aqui sozinho.`
                : "Buscando o próximo código…"}
            </p>
          </div>
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
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            pedido.mutate(usarCadastrado ? cadastrado : telefone);
          }}
        >
          {usarCadastrado ? (
            <div className="rounded-[16px] bg-[var(--figaro-surface-container-high,var(--ink3))] p-4">
              <p className="text-xs text-mute">WhatsApp do negócio</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-paper">
                {mascaraTelefone(cadastrado)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-mute">
                É o número da sua página e da agenda. Gere o código e digite no celular deste
                número.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-mute">
                {cadastrado
                  ? "O número que você conectar passa a ser o WhatsApp de atendimento da sua página e da agenda."
                  : "Informe o número do WhatsApp que será o do negócio. Vamos gerar um código para você digitar no celular."}
              </p>
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
            </>
          )}
          {encerrado ? (
            <p className="text-xs text-brick">
              Esta tentativa terminou sem conectar. Gere um novo código.
            </p>
          ) : null}
          <Button
            loading={pedido.isPending}
            type="submit"
            className="min-h-12 w-full"
            disabled={
              pedido.isPending || (!usarCadastrado && telefone.replace(/\D/g, "").length < 10)
            }
          >
            {encerrado
              ? "Gerar novo código"
              : usarCadastrado
                ? "Gerar código para este número"
                : "Gerar código"}
          </Button>
          {cadastrado ? (
            <Button
              type="button"
              variant="text"
              className="min-h-12 w-full"
              onClick={() => setOutro((v) => !v)}
            >
              {usarCadastrado ? "Conectar outro número" : "Usar o número cadastrado"}
            </Button>
          ) : null}
        </form>
      )}

      {mensagem ? <p className="mt-3 text-center text-sm text-brick">{mensagem}</p> : null}
    </div>
  );
}
