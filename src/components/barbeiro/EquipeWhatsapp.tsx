import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { Switch } from "@/components/ui/switch";
import {
  definirWhatsappDoMembro,
  whatsappDaEquipe,
  type StatusWhatsappDaEquipe,
} from "@/lib/whatsapp-equipe.functions";

const STATUS: Record<StatusWhatsappDaEquipe, { rotulo: string; classe: string }> = {
  nao_configurado: { rotulo: "Não configurado", classe: "text-mute" },
  aguardando: { rotulo: "Aguardando verificação", classe: "text-gold" },
  verificado: { rotulo: "Verificado", classe: "text-primary" },
};

const PAPEL: Record<string, string> = {
  dono: "Proprietário",
  gerente: "Gerente",
  barbeiro: "Profissional",
  recepcao: "Recepção",
};

function telefoneVisivel(t: string | null) {
  if (!t) return "Sem telefone";
  const d = t.replace(/\D/g, "").replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : t;
}

export function EquipeWhatsapp() {
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["equipe-whatsapp"], queryFn: () => whatsappDaEquipe() });
  const alternar = useMutation({
    mutationFn: (v: { userId: string; ligado: boolean }) => definirWhatsappDoMembro({ data: v }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["equipe-whatsapp"] }),
  });

  if (lista.error) return null; // sem permissão de gestão: a seção não aparece
  return (
    <section aria-labelledby="equipe-whatsapp" className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
        <h2 id="equipe-whatsapp" className="text-sm font-semibold text-paper">
          Equipe e WhatsApp
        </h2>
      </div>
      <p className="text-xs text-mute">
        Avisos da agenda, fila, Pix e fiado pelo WhatsApp da empresa. Só chegam para quem
        verificou o próprio número.
      </p>
      {lista.isLoading ? <p className="text-xs text-mute">Carregando…</p> : null}
      <ul className="space-y-2">
        {(lista.data ?? []).map((m) => {
          const s = STATUS[m.status];
          const ligado = m.avisosLigados > 0;
          return (
            <li key={m.userId} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-paper">{m.nome ?? "Sem nome"}</p>
                  <p className="text-xs text-mute">
                    {PAPEL[m.papel] ?? m.papel} ·{" "}
                    {m.profissional ? "Ligado à agenda" : "Sem agenda vinculada"}
                  </p>
                  <p className="mt-1 text-xs text-mute">{telefoneVisivel(m.telefone)}</p>
                  <p className={`mt-1 text-xs font-semibold ${s.classe}`}>{s.rotulo}</p>
                </div>
                <label className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-mute">Avisos</span>
                  <Switch
                    checked={ligado}
                    disabled={alternar.isPending}
                    aria-label={`Avisos pelo WhatsApp para ${m.nome ?? "membro"}`}
                    onCheckedChange={(v) => alternar.mutate({ userId: m.userId, ligado: v })}
                  />
                </label>
              </div>
              {m.status !== "verificado" ? (
                <p className="mt-3 text-xs text-mute">
                  {m.nome ?? "A pessoa"} precisa confirmar o próprio número: no celular dela, abra
                  Ajustes → Avisos → “Confirmar meu WhatsApp” e envie o código mostrado para o
                  WhatsApp da empresa.
                  {ligado ? " Até lá, os avisos seguem no app e no celular." : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {alternar.error ? (
        <Aviso tom="atencao" titulo="Não foi possível salvar">
          {(alternar.error as Error).message}
        </Aviso>
      ) : null}
    </section>
  );
}
