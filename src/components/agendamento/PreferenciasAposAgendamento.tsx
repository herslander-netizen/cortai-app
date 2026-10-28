import { useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ROTULOS_PREFERENCIAS,
  type PreferenciasCliente,
} from "@/lib/preferencias-cliente";
import { segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";
import { salvarPreferenciasDoAgendamento } from "@/lib/agendamento-publico.functions";
import {
  deveMostrarPreferencias,
  lembrarPreferencias,
} from "@/components/agendamento/lembrete-preferencias";

type Props = {
  agendamentoId: string;
  token: string;
  slug: string;
  segmento?: Segmento | null;
};
type CampoDeConforto = "conversa" | "ar" | "bebida";

function rotuloDaPreferenciaDeServico(segmento: Segmento) {
  switch (segmento) {
    case "barbearia":
      return "Como costuma cortar";
    case "salao":
    case "cabeleireiro":
      return "Preferência de cabelo ou acabamento";
    case "esmalteria":
      return "Cor ou estilo de unha preferido";
    case "sobrancelha_cilios":
      return "Preferência de estilo de sobrancelhas ou cílios";
    case "estetica":
      return "Tratamento ou objetivo habitual";
    default:
      return "Preferência para o atendimento";
  }
}

function placeholderDaPreferencia(segmento: Segmento) {
  switch (segmento) {
    case "barbearia":
      return "Ex.: máquina, comprimento ou acabamento";
    case "salao":
    case "cabeleireiro":
      return "Ex.: comprimento, estilo ou acabamento";
    case "esmalteria":
      return "Ex.: cores, formato ou estilo";
    case "sobrancelha_cilios":
      return "Ex.: formato ou efeito preferido";
    case "estetica":
      return "Ex.: área ou resultado que deseja priorizar";
    default:
      return "Conte à equipe o que é importante para este atendimento";
  }
}

function rotuloDeCuidados(segmento: Segmento) {
  switch (segmento) {
    case "esmalteria":
      return "Alergia ou sensibilidade a produtos";
    case "sobrancelha_cilios":
      return "Alergias ou sensibilidades importantes";
    case "estetica":
      return "Alergias ou sensibilidades da pele";
    case "outro":
      return "Informação importante para a equipe";
    default:
      return "Alergias ou cuidados importantes";
  }
}

export function PreferenciasAposAgendamento({
  agendamentoId,
  token,
  slug,
  segmento,
}: Props) {
  // Um segmento ausente nunca deve presumir barbearia.
  const segmentoAtual = segmentoParaApresentacao(segmento);
  const ehSegmentoDeBeleza = segmentoAtual !== "outro";
  const [visivel, setVisivel] = useState(() => deveMostrarPreferencias(slug));
  const [expandido, setExpandido] = useState(false);
  const [anotado, setAnotado] = useState(false);
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
      <Card className="mt-5 flex items-center gap-3 p-4" role="status">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">Preferências salvas</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Vamos deixar seu atendimento do seu jeito.
          </p>
        </div>
      </Card>
    );
  }

  const grupos: {
    campo: CampoDeConforto;
    titulo: string;
    opcoes: Record<string, string>;
  }[] = ehSegmentoDeBeleza
    ? [
        { campo: "conversa", titulo: "Conversa", opcoes: ROTULOS_PREFERENCIAS.conversa },
        { campo: "ar", titulo: "Ar", opcoes: ROTULOS_PREFERENCIAS.ar },
        { campo: "bebida", titulo: "Bebida", opcoes: ROTULOS_PREFERENCIAS.bebida },
      ]
    : [];

  const temAlgo = Object.values(preferencias).some(
    (valor) => typeof valor === "string" && Boolean(valor.trim()),
  );

  if (!expandido) {
    return (
      <Card className="mt-5 p-4 sm:p-5" aria-labelledby="preferencias-titulo">
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold"
            aria-hidden
          >
            <Sparkles size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="preferencias-titulo" className="text-base font-bold">
              Deixe seu atendimento do seu jeito
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">
              Seu horário já está confirmado. As preferências são opcionais e ajudam a preparar seu atendimento.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full rounded-full sm:w-auto"
                aria-expanded={false}
                onClick={() => setExpandido(true)}
              >
                Personalizar atendimento
                <ChevronDown size={16} aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 w-full rounded-full sm:w-auto"
                onClick={() => {
                  lembrarPreferencias(slug);
                  setVisivel(false);
                }}
              >
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-5 overflow-hidden p-4 sm:p-5" aria-labelledby="preferencias-titulo">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden
        >
          <Sparkles size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Opcional · 20 segundos
          </p>
          <h2 id="preferencias-titulo" className="mt-1 text-base font-bold leading-snug">
            Deixe seu atendimento do seu jeito
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Escolha o que importa para você. Seu horário já está confirmado.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {grupos.map(({ campo, titulo, opcoes }) => (
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

      <div className="mt-4 space-y-4 rounded-xl bg-muted/40 p-3">
        {ehSegmentoDeBeleza ? (
          <label className="block text-sm font-medium">
            Música favorita
            <Input
              className="mt-2 min-h-12"
              maxLength={40}
              value={preferencias.musica ?? ""}
              onChange={(e) => setPreferencias((p) => ({ ...p, musica: e.target.value }))}
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium">
          {rotuloDaPreferenciaDeServico(segmentoAtual)}
          <Input
            className="mt-2 min-h-12"
            maxLength={60}
            value={preferencias.corte_habitual ?? ""}
            placeholder={placeholderDaPreferencia(segmentoAtual)}
            onChange={(e) => setPreferencias((p) => ({ ...p, corte_habitual: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          {rotuloDeCuidados(segmentoAtual)}
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
    </Card>
  );
}
