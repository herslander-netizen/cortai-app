import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { gerarCodigoDoNegocio } from "@/lib/whatsapp-central.functions";

/** Admin: conecta o WhatsApp de um negócio pelo número, digitando o código no celular dele. */
export function CodigoPorNumeroDoNegocio({ tenantId }: { tenantId: string }) {
  const gerar = useServerFn(gerarCodigoDoNegocio);
  const [telefone, setTelefone] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const pedir = async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await gerar({ data: { tenantId, telefone } });
      setCodigo(r.codigo);
      setAviso(r.aviso);
    } catch (erro) {
      setCodigo(null);
      setAviso(erro instanceof Error ? erro.message : "Não foi possível gerar o código.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-sm font-semibold text-paper">Conectar por número</p>
      <p className="mt-1 text-xs text-mute">
        No celular do negócio: WhatsApp → Aparelhos conectados → Conectar com número. Digite o
        código abaixo.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="field-label">Número do WhatsApp</span>
          <input
            className="field-control mt-1 h-12 w-full px-3 text-sm"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-8888"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </label>
        <Button type="button" disabled={ocupado || telefone.trim().length < 8} onClick={pedir}>
          {ocupado ? "Gerando…" : "Gerar código"}
        </Button>
      </div>
      {codigo ? (
        <p
          className="mt-3 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-paper"
          role="status"
        >
          {codigo}
        </p>
      ) : null}
      {aviso ? (
        <p className="mt-2 text-xs text-brick" role="alert">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
