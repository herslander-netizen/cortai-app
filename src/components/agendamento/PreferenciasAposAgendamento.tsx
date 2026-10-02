import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROTULOS_PREFERENCIAS, type PreferenciasCliente } from "@/lib/preferencias-cliente";
import { salvarPreferenciasDoAgendamento } from "@/lib/agendamento-publico.functions";

const NOVENTA_DIAS = 90 * 24 * 60 * 60 * 1000;

export function chaveLembretePreferencias(slug: string) {
  return `cortai-preferencias-atendimento:${slug}`;
}

export function deveMostrarPreferencias(slug: string, agora = Date.now()) {
  try {
    const valor = localStorage.getItem(chaveLembretePreferencias(slug));
    if (!valor) return true;
    const salvoEm = Number(valor);
    return !Number.isFinite(salvoEm) || agora - salvoEm >= NOVENTA_DIAS;
  } catch {
    return true;
  }
}

function lembrar(slug: string) {
  try {
    localStorage.setItem(chaveLembretePreferencias(slug), String(Date.now()));
  } catch {
    /* armazenamento opcional */
  }
}

type Props = { agendamentoId: string; token: string; slug: string };

export function PreferenciasAposAgendamento({ agendamentoId, token, slug }: Props) {
  const [visivel, setVisivel] = useState(() => deveMostrarPreferencias(slug));
  const [anotado, setAnotado] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [preferencias, setPreferencias] = useState<PreferenciasCliente>({});
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: () =>
      salvarPreferenciasDoAgendamento({ data: { agendamentoId, token, preferencias } }),
    onSuccess: () => {
      lembrar(slug);
      setAnotado(true);
      setErro(null);
    },
    onError: () => setErro("Não foi possível salvar agora. Seu agendamento continua confirmado."),
  });

  if (!visivel) return null;
  if (anotado) {
    return (
      <section className="mt-6 surface px-5 py-6 text-center" role="status">
        <Check className="mx-auto text-gold" aria-hidden />
        <p className="mt-2 text-base font-semibold text-paper">Anotado! Até lá.</p>
      </section>
    );
  }

  const grupos = [
    ["conversa", "Conversa", ROTULOS_PREFERENCIAS.conversa],
    ["ar", "Ar", ROTULOS_PREFERENCIAS.ar],
    ["bebida", "Bebida", ROTULOS_PREFERENCIAS.bebida],
  ] as const;
  const temAlgo = Object.values(preferencias).some((valor) => Boolean(valor?.trim()));

  return (
    <section className="mt-6 surface px-5 py-6" aria-labelledby="preferencias-titulo">
      <h2 id="preferencias-titulo" className="text-lg font-bold text-paper">
        Agendado! Quer nos contar como prefere seu atendimento?
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-mute">
        Leva 20 segundos e deixa tudo do seu jeito.
      </p>

      <div className="mt-5 space-y-5">
        {grupos.map(([campo, titulo, opcoes]) => (
          <fieldset key={campo}>
            <legend className="text-sm font-semibold text-paper">{titulo}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(opcoes).map(([valor, rotulo]) => {
                const selecionado = preferencias[campo] === valor;
                return (
                  <Button
                    key={valor}
                    type="button"
                    variant="outline"
                    aria-pressed={selecionado}
                    className={`min-h-12 rounded-full px-4 text-sm ${selecionado ? "border-gold bg-gold/10 text-paper" : ""}`}
                    onClick={() =>
                      setPreferencias((atual) => ({
                        ...atual,
                        [campo]: selecionado ? undefined : valor,
                      }))
                    }
                  >
                    {rotulo}
                  </Button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        className="mt-4 min-h-12 w-full justify-between px-0 text-sm"
        aria-expanded={detalhes}
        onClick={() => setDetalhes((valor) => !valor)}
      >
        Mais detalhes
        <ChevronDown className={detalhes ? "rotate-180" : ""} aria-hidden />
      </Button>

      {detalhes ? (
        <div className="space-y-4 border-t border-line pt-4">
          <label className="block text-sm font-medium text-paper">
            Música favorita
            <Input
              className="mt-2 min-h-12"
              maxLength={40}
              value={preferencias.musica ?? ""}
              onChange={(e) => setPreferencias((p) => ({ ...p, musica: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-paper">
            Como costuma cortar
            <Input
              className="mt-2 min-h-12"
              maxLength={60}
              value={preferencias.corte_habitual ?? ""}
              onChange={(e) => setPreferencias((p) => ({ ...p, corte_habitual: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-paper">
            Alergia ou cuidado com a pele?
            <Input
              className="mt-2 min-h-12"
              maxLength={80}
              value={preferencias.atencao ?? ""}
              onChange={(e) => setPreferencias((p) => ({ ...p, atencao: e.target.value }))}
            />
            <span className="mt-1 block text-sm font-normal text-mute">
              Só a equipe da barbearia vê isso.
            </span>
          </label>
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-relaxed text-mute">
        Usamos isso só para atender você melhor. Só a equipe desta barbearia vê. Você pode pedir
        para apagar.{" "}
        <Link to="/privacidade" className="font-medium text-gold underline underline-offset-2">
          Privacidade
        </Link>
      </p>
      {erro ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          className="min-h-12 font-semibold"
          disabled={!temAlgo || salvar.isPending}
          onClick={() => salvar.mutate()}
        >
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 font-semibold"
          onClick={() => {
            lembrar(slug);
            setVisivel(false);
          }}
        >
          Agora não
        </Button>
      </div>
    </section>
  );
}
