import {
  Coffee,
  MessageCircle,
  Music,
  Scissors,
  Snowflake,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { salvarPreferenciasCliente } from "@/lib/perfil-cliente.functions";
import { ROTULOS_PREFERENCIAS, type PreferenciasCliente } from "@/lib/preferencias-cliente";
import { comDesfazer } from "@/lib/avisos";

export function FichaFoco({
  clienteId,
  cliente,
  preferencias,
  observacao,
  discreto,
  finalizado,
  onAbrir,
}: {
  clienteId: string | null;
  cliente: string;
  preferencias: PreferenciasCliente;
  observacao: string | null;
  discreto: boolean;
  finalizado: boolean;
  onAbrir: () => void;
}) {
  const salvar = useServerFn(salvarPreferenciasCliente);
  const [local, setLocal] = useState(preferencias);
  const [oculto, setOculto] = useState(false);
  if (discreto)
    return <p className="mt-4 text-sm text-mute">Preferências ocultas no modo discreto.</p>;
  const etiquetas = [
    local.conversa
      ? {
          id: "conversa",
          Icone: MessageCircle,
          texto: ROTULOS_PREFERENCIAS.conversa[local.conversa],
        }
      : null,
    local.ar ? { id: "ar", Icone: Snowflake, texto: ROTULOS_PREFERENCIAS.ar[local.ar] } : null,
    local.bebida
      ? { id: "bebida", Icone: Coffee, texto: ROTULOS_PREFERENCIAS.bebida[local.bebida] }
      : null,
    local.musica ? { id: "musica", Icone: Music, texto: local.musica } : null,
    local.corte_habitual ? { id: "corte", Icone: Scissors, texto: local.corte_habitual } : null,
    local.assuntos ? { id: "assuntos", Icone: Sparkles, texto: local.assuntos } : null,
  ].filter(Boolean) as { id: string; Icone: typeof Coffee; texto: string }[];
  async function escolha(chave: "conversa" | "ar" | "bebida", valor: string) {
    if (!clienteId) return;
    const anterior = local;
    const proximo = { ...local, [chave]: valor } as PreferenciasCliente;
    setLocal(proximo);
    try {
      await salvar({ data: { clienteId, preferencias: proximo } });
      comDesfazer("Preferência salva.", async () => {
        setLocal(anterior);
        await salvar({ data: { clienteId, preferencias: anterior } });
      });
    } catch {
      setLocal(anterior);
    }
  }
  const escolhas = [
    ...(!local.conversa
      ? (["papo", "silencio", "tanto_faz"] as const).map((valor) => ({
          chave: "conversa" as const,
          valor,
          texto: ROTULOS_PREFERENCIAS.conversa[valor],
        }))
      : []),
    ...(!local.ar
      ? (["gelado", "ameno", "sem_ar"] as const).map((valor) => ({
          chave: "ar" as const,
          valor,
          texto: ROTULOS_PREFERENCIAS.ar[valor],
        }))
      : []),
    ...(!local.bebida
      ? (["cafe", "agua", "refri", "cerveja", "nada"] as const).map((valor) => ({
          chave: "bebida" as const,
          valor,
          texto: ROTULOS_PREFERENCIAS.bebida[valor],
        }))
      : []),
  ];
  return (
    <section className="mt-4" aria-label="Preferências do cliente">
      {local.atencao ? (
        <p className="flex items-start gap-2 rounded-md bg-brick/20 px-3 py-3 text-sm font-semibold text-paper">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>Atenção</strong>
            <br />
            {local.atencao}
          </span>
        </p>
      ) : null}
      {etiquetas.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {etiquetas.map(({ id, Icone, texto }) => (
            <span
              key={id}
              className="flex min-h-12 items-center gap-2 rounded-full border border-line px-3 text-sm text-paper"
            >
              <Icone className="size-4" aria-hidden />
              {texto}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-mute">Sem preferências registradas ainda.</p>
      )}
      {observacao ? (
        <Button
          variant="ghost"
          className="mt-3 h-auto min-h-12 w-full justify-start border-l-2 border-status-arrived px-3 text-left"
          onClick={onAbrir}
        >
          <span className="line-clamp-2 text-sm text-mute">{observacao}</span>
        </Button>
      ) : null}
      {finalizado && !oculto ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-semibold text-paper">
            Algo novo sobre {cliente.split(" ")[0] || "este cliente"}?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {escolhas.map((opcao) => (
              <Button
                key={`${opcao.chave}:${opcao.valor}`}
                variant="outline"
                onClick={() => void escolha(opcao.chave, opcao.valor)}
              >
                {opcao.texto}
              </Button>
            ))}
          </div>
          <Button variant="ghost" className="mt-2" onClick={() => setOculto(true)}>
            Pronto
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** Renderização pura usada também pelos testes de privacidade e campos opcionais. */
export function fichaFocoVisivel(preferencias: PreferenciasCliente, observacao: string | null) {
  return {
    atencao: preferencias.atencao ?? null,
    conversa: preferencias.conversa ?? null,
    ar: preferencias.ar ?? null,
    bebida: preferencias.bebida ?? null,
    musica: preferencias.musica ?? null,
    corte: preferencias.corte_habitual ?? null,
    assuntos: preferencias.assuntos ?? null,
    observacao,
  };
}
