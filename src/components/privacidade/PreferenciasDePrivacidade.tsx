import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import {
  DESCRICAO_DAS_CATEGORIAS,
  SOMENTE_NECESSARIAS,
  useConsentimento,
  type Categorias,
} from "@/lib/consentimento";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";

/** Seção de Perfil/Configurações para revisar e alterar as preferências de privacidade. */
export function PreferenciasDePrivacidade() {
  const { pronto, consentimento, registrar } = useConsentimento();
  const [escolhas, setEscolhas] = useState<Categorias>(SOMENTE_NECESSARIAS);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (consentimento) setEscolhas(consentimento.categorias);
  }, [consentimento]);

  if (!pronto) return null;

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mute">
        <ShieldCheck size={14} /> Privacidade e cookies
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-mute">
        Escolha o que o Flow pode usar além do necessário para funcionar. Você pode mudar quando
        quiser. Leia a{" "}
        <Link to="/privacidade" className="text-gold underline">
          Política de Privacidade
        </Link>
        .
      </p>
      <ul className="mt-4 space-y-3">
        {DESCRICAO_DAS_CATEGORIAS.map((categoria) => (
          <li key={categoria.chave}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
                checked={categoria.fixa ? true : escolhas[categoria.chave]}
                disabled={categoria.fixa}
                onChange={(e) => {
                  setEscolhas((atual) => ({ ...atual, [categoria.chave]: e.target.checked }));
                  setAviso(null);
                }}
              />
              <span>
                <span className="block text-sm font-semibold text-paper">{categoria.titulo}</span>
                <span className="mt-1 block text-xs leading-relaxed text-mute">
                  {categoria.detalhe}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="primary"
        onClick={() => {
          registrar(escolhas);
          setAviso("Preferências salvas.");
        }}
        className="mt-4"
      >
        Salvar
      </Button>
      {aviso ? (
        <Aviso className="mt-3" tom="sucesso">
          {aviso}
        </Aviso>
      ) : null}
      {consentimento ? (
        <p className="mt-3 text-xs text-mute2">
          Registrado em {new Date(consentimento.registradoEm).toLocaleString("pt-BR")} · política{" "}
          {consentimento.versao}
        </p>
      ) : null}
    </section>
  );
}
