import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronDown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROTULOS_PREFERENCIAS, type PreferenciasCliente } from "@/lib/preferencias-cliente";
import { salvarPreferenciasDoAgendamento } from "@/lib/agendamento-publico.functions";
import {
  deveMostrarPreferencias,
  lembrarPreferencias,
} from "@/components/agendamento/lembrete-preferencias";

type Props = { agendamentoId: string; token: string; slug: string };

export function PreferenciasAposAgendamento({ agendamentoId, token, slug }: Props) {
  const [visivel, setVisivel] = useState(() => deveMostrarPreferencias(slug));
  const [aberto, setAberto] = useState(false);
  const [anotado, setAnotado] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [preferencias, setPreferencias] = useState<PreferenciasCliente>({});
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: () =>
      salvarPreferenciasDoAgendamento({ data: { agendamentoId, token, preferencias } }),
    onSuccess: () => {
      lembrarPreferencias(slug);
      setAnotado(true);
      setErro(null);
    },
    onError: () => setErro("Não foi possível salvar agora. Seu agendamento continua confirmado."),
  });

  if (!visivel) return null;
  if (anotado) {
    return (
      <section
        className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-card-foreground shadow-sm"
        role="status"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">Preferências salvas</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Vamos deixar seu atendimento do seu jeito.</p>
        </div>
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
    <section
      className="mt-5 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
      aria-labelledby="preferencias-titulo"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles size={19} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Opcional · 20 segundos
          </p>
          <h2 id="preferencias-titulo" className="mt-1 text-base font-bold leading-snug">
            Deixe seu atendimento do seu jeito
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Conte como você prefere. Seu horário já está confirmado.
          </p>
          {!aberto ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 rounded-full px-4"
                onClick={() => setAberto(true)}
                aria-expanded={false}
              >
                Personalizar atendimento
                <ChevronDown size={16} aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 rounded-full px-3 text-muted-foreground"
                onClick={() => {
                  lembrarPreferencias(slug);
                  setVisivel(false);
                }}
              >
                Agora não
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {aberto ? (
        <div className="border-t border-border/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <div className="grid gap-4">
            {grupos.map(([campo, titulo, opcoes]) => (
              <fieldset key={campo} className="min-w-0">
                <legend className="text-sm font-semibold">{titulo}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(opcoes).map(([valor, rotulo]) => {
                    const selecionado = preferencias[campo] === valor;
                    return (
                      <Button
                        key={valor}
                        type="button"
                        variant="outline"
                        aria-pressed={selecionado}
                        className={`min-h-12 rounded-full px-3 text-sm transition-colors ${selecionado ? "border-primary bg-primary/10 text-card-foreground ring-1 ring-primary/30" : ""}`}
                        onClick={() =>
                          setPreferencias((atual) => ({
                            ...atual,
                            [campo]: selecionado ? undefined : valor,
                          }))
                        }
                      >
                        {selecionado ? <Check size={15} aria-hidden /> : null}
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
            className="mt-3 min-h-12 w-full justify-between rounded-xl px-2 text-sm text-muted-foreground hover:text-card-foreground"
            aria-expanded={detalhes}
            onClick={() => setDetalhes((valor) => !valor)}
          >
            Mais detalhes (opcional)
            <ChevronDown className={detalhes ? "rotate-180" : ""} size={17} aria-hidden />
          </Button>

          {detalhes ? (
            <div className="mt-1 space-y-4 rounded-xl bg-muted/40 p-3">
              <label className="block text-sm font-medium">
                Música favorita
                <Input
                  className="mt-2 min-h-12"
                  maxLength={40}
                  value={preferencias.musica ?? ""}
                  onChange={(e) => setPreferencias((p) => ({ ...p, musica: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium">
                Como costuma cortar
                <Input
                  className="mt-2 min-h-12"
                  maxLength={60}
                  value={preferencias.corte_habitual ?? ""}
                  onChange={(e) => setPreferencias((p) => ({ ...p, corte_habitual: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium">
                Alergia ou cuidado com a pele?
                <Input
                  className="mt-2 min-h-12"
                  maxLength={80}
                  value={preferencias.atencao ?? ""}
                  onChange={(e) => setPreferencias((p) => ({ ...p, atencao: e.target.value }))}
                />
                <span className="mt-1 block text-sm font-normal text-muted-foreground">
                  Só a equipe deste negócio vê essa informação.
                </span>
              </label>
            </div>
          ) : null}

          <p className="mt-4 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            Usamos essas informações apenas para melhorar seu atendimento. Você pode pedir para apagá-las.{" "}
            <a href="/privacidade" className="font-semibold text-primary underline underline-offset-2">
              Saiba mais
            </a>
          </p>

          {erro ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="min-h-12 rounded-full font-semibold"
              disabled={!temAlgo || salvar.isPending}
              onClick={() => salvar.mutate()}
            >
              {salvar.isPending ? "Salvando…" : "Salvar preferências"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 rounded-full font-semibold"
              onClick={() => {
                lembrarPreferencias(slug);
                setVisivel(false);
              }}
            >
              Agora não
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
