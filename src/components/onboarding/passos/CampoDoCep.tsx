/**
 * CEP e número antes do endereço (dono, 06/11/2026). Com os 8 dígitos, busca rua, bairro e cidade e preenche o
 * endereço; o número completa a linha. O endereço continua editável à mão (CEP sem rua, CEP novo, serviço fora).
 */
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";

import { buscarCep, digitosDoCep, mascaraCep, montarEndereco, type EnderecoDoCep } from "@/lib/cep";

export function CampoDoCep({ onEndereco }: { onEndereco: (endereco: string) => void }) {
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [achado, setAchado] = useState<EnderecoDoCep | null>(null);
  const [estado, setEstado] = useState<"parado" | "buscando" | "achou" | "nao_achou">("parado");
  const ultimaBusca = useRef("");
  const rotulo = "block text-[13px] font-medium text-mute";

  async function mudarCep(valor: string) {
    const mascarado = mascaraCep(valor);
    setCep(mascarado);
    const d = digitosDoCep(mascarado);
    if (d.length < 8) {
      setEstado("parado");
      return;
    }
    if (d === ultimaBusca.current) return;
    ultimaBusca.current = d;
    setEstado("buscando");
    const r = await buscarCep(d);
    if (ultimaBusca.current !== d) return;
    setAchado(r);
    setEstado(r ? "achou" : "nao_achou");
    if (r) onEndereco(montarEndereco(r, numero));
  }

  function mudarNumero(valor: string) {
    const n = valor.slice(0, 10);
    setNumero(n);
    if (achado) onEndereco(montarEndereco(achado, n));
  }

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
        <label className={rotulo}>
          CEP
          <input
            value={cep}
            onChange={(e) => void mudarCep(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            aria-describedby="situacao-do-cep"
            className="field-control mt-2 w-full tabular-nums"
          />
        </label>
        <label className={rotulo}>
          Número
          <input
            value={numero}
            onChange={(e) => mudarNumero(e.target.value)}
            inputMode="numeric"
            placeholder="Nº"
            className="field-control mt-2 w-full"
          />
        </label>
      </div>
      <p
        id="situacao-do-cep"
        aria-live="polite"
        className="mt-2 flex min-h-5 items-center gap-1.5 px-1 text-[13px] text-mute"
      >
        {estado === "buscando" ? (
          <>
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Procurando o endereço…
          </>
        ) : estado === "achou" && achado ? (
          <>
            <Check className="size-4 text-sage" aria-hidden />
            {[achado.bairro, `${achado.cidade}/${achado.uf}`].filter(Boolean).join(", ")}
          </>
        ) : estado === "nao_achou" ? (
          <>
            <CircleAlert className="size-4" aria-hidden />
            Não achamos esse CEP. Digite o endereço abaixo.
          </>
        ) : (
          "Digite o CEP para preencher rua, bairro e cidade."
        )}
      </p>
    </div>
  );
}
