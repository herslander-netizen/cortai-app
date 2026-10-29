import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Check,
  HandCoins,
  QrCode,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  GrupoDeLinhas,
  LinhaComInterruptor,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getSessao } from "@/lib/sessao.functions";
import { aviso } from "@/lib/avisos";
import { tipoDePushValido } from "@/lib/push/regras";
import { pushAtivoNesteAparelho, precisaInstalarParaPush } from "@/lib/push/aparelho";
import { ativarAvisosDaEquipe, TEXTO_INSTALAR_PRIMEIRO } from "@/lib/push/ativar";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { gerarCodigoDoMeuWhatsapp, meuWhatsappNoCortai } from "@/lib/whatsapp-equipe.functions";

const TIPOS = [
  { chave: "agendamento_novo", rotulo: "Novo agendamento" },
  { chave: "agendamento_cancelado", rotulo: "Cancelamento" },
  { chave: "agendamento_remarcado", rotulo: "Remarcação" },
  { chave: "cliente_chegou", rotulo: "Cliente chegou" },
  { chave: "fila", rotulo: "Cliente entrou na fila" },
  { chave: "fiado", rotulo: "Fiado em aberto" },
  { chave: "pix", rotulo: "Pix recebido" },
] as const;

type Canal = "no_app" | "no_whatsapp" | "no_push";
type Preferencia = { tipo: string; no_app: boolean; no_whatsapp: boolean; no_push: boolean };

/** Padrão quando a pessoa ainda não escolheu nada para aquele aviso. */
const PADRAO: Omit<Preferencia, "tipo"> = { no_app: true, no_whatsapp: false, no_push: true };

const DETALHE_DO_CANAL: Record<Canal, string> = {
  no_app: "Sininho e aviso dentro do Flow.",
  no_push: "Notificação no celular, mesmo com o app fechado.",
  no_whatsapp: "Mensagem no seu WhatsApp.",
};

const ICONE_DO_TIPO: Record<(typeof TIPOS)[number]["chave"], LucideIcon> = {
  agendamento_novo: CalendarPlus,
  agendamento_cancelado: CalendarX,
  agendamento_remarcado: CalendarClock,
  cliente_chegou: UserCheck,
  fila: Users,
  fiado: HandCoins,
  pix: QrCode,
};

const ROTULO_DO_CANAL: Record<Canal, string> = {
  no_app: "No app",
  no_whatsapp: "WhatsApp",
  no_push: "Celular",
};

function canaisDo(tipo: string): Canal[] {
  return tipoDePushValido(tipo) ? ["no_app", "no_push", "no_whatsapp"] : ["no_app", "no_whatsapp"];
}

export function PreferenciasDeAvisos() {
  const queryClient = useQueryClient();
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  const tenantId = sessao?.tenantId ?? null;
  const userId = sessao?.userId ?? null;
  const chaveDaLista = ["preferencias-avisos", tenantId, userId] as const;

  const { data: prefs, isLoading } = useQuery({
    queryKey: chaveDaLista,
    enabled: !!tenantId && !!userId,
    queryFn: async (): Promise<Preferencia[]> => {
      const { data, error } = await supabase
        .from("notificacoes_preferencias")
        .select("tipo, no_app, no_whatsapp, no_push")
        .eq("tenant_id", tenantId!)
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as Preferencia[];
    },
  });

  const linhaDe = (lista: Preferencia[] | undefined, tipo: string): Preferencia => {
    const achado = (lista ?? []).find((x) => x.tipo === tipo);
    return achado ?? { tipo, ...PADRAO };
  };

  // Cada canal é independente: gravamos os dois valores sempre juntos.
  const salvar = useMutation({
    mutationFn: async (linha: Preferencia) => {
      const { error } = await supabase.from("notificacoes_preferencias").upsert(
        {
          tenant_id: tenantId!,
          user_id: userId!,
          tipo: linha.tipo,
          no_app: linha.no_app,
          no_whatsapp: linha.no_whatsapp,
          no_push: linha.no_push,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "tenant_id,user_id,tipo" },
      );
      if (error) throw new Error(error.message);
    },
    onMutate: async (linha) => {
      await queryClient.cancelQueries({ queryKey: chaveDaLista });
      const anterior = queryClient.getQueryData<Preferencia[]>(chaveDaLista);
      queryClient.setQueryData<Preferencia[]>(chaveDaLista, (atual) => {
        const lista = (atual ?? []).filter((x) => x.tipo !== linha.tipo);
        return [...lista, linha];
      });
      return { anterior };
    },
    onError: (_erro, _linha, contexto) => {
      queryClient.setQueryData(chaveDaLista, contexto?.anterior);
      aviso.erro("Não deu certo salvar essa preferência. Tenta de novo?");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaveDaLista });
    },
  });

  const [editando, setEditando] = useState<(typeof TIPOS)[number] | null>(null);
  if (!tenantId || !userId) return null;

  const alternar = (tipo: string, canal: Canal) => {
    const atual = linhaDe(prefs, tipo);
    salvar.mutate({ ...atual, tipo, [canal]: !atual[canal] });
  };
  const resumo = (tipo: string) => {
    const linha = linhaDe(prefs, tipo);
    const ligados = canaisDo(tipo).filter((c) => linha[c]);
    return ligados.length ? ligados.map((c) => ROTULO_DO_CANAL[c]).join(" · ") : "Desligado";
  };
  const atual = editando ? linhaDe(prefs, editando.chave) : null;

  return (
    <div id="avisos" className="scroll-mt-6">
      {/* Avisos do aparelho e do WhatsApp da pessoa, em cartões de 28 dp como no Figaro. */}
      <div className="space-y-3">
        <AvisosNoCelular tenantId={tenantId} />
        <MeuWhatsappNoCortai />
      </div>
      <SecaoDeConfiguracao
        titulo="Avisos para você"
        rodape="Escolha onde receber cada aviso. Pode ligar mais de um canal."
      >
        <GrupoDeLinhas>
          {TIPOS.map((t) => (
            <LinhaDeConfiguracao
              key={t.chave}
              icone={ICONE_DO_TIPO[t.chave]}
              titulo={t.rotulo}
              suporte={resumo(t.chave)}
              aoTocar={() => setEditando(t)}
              desabilitada={isLoading}
            />
          ))}
        </GrupoDeLinhas>
      </SecaoDeConfiguracao>

      <Sheet open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-[520px] rounded-t-[28px]">
          <SheetHeader className="text-left">
            <SheetTitle>{editando?.rotulo}</SheetTitle>
            <SheetDescription>Onde você quer receber este aviso.</SheetDescription>
          </SheetHeader>
          {editando && atual ? (
            <GrupoDeLinhas className="mt-4">
              {canaisDo(editando.chave).map((canal) => (
                <LinhaComInterruptor
                  key={canal}
                  titulo={ROTULO_DO_CANAL[canal]}
                  suporte={DETALHE_DO_CANAL[canal]}
                  marcado={atual[canal]}
                  aoMudar={() => alternar(editando.chave, canal)}
                />
              ))}
            </GrupoDeLinhas>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AvisosNoCelular({ tenantId }: { tenantId: string }) {
  const [ativo, setAtivo] = useState(false);
  const [instalar, setInstalar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => setAtivo(pushAtivoNesteAparelho()), []);
  if (ativo) {
    return (
      <p className="flex min-h-14 items-center gap-2 rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] px-4 text-sm text-paper">
        <Check className="h-4 w-4 text-primary" aria-hidden /> Avisos no celular ativos neste
        aparelho
      </p>
    );
  }
  return (
    <div className="rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] p-4">
      <p className="text-[15px] font-semibold leading-5 text-paper">Ative as notificações</p>
      <p className="mt-1 text-sm text-mute">
        Não perca agendamentos novos e cancelamentos de última hora.
      </p>
      <Button
        type="button"
        variant="primary"
        disabled={ocupado}
        onClick={async () => {
          if (precisaInstalarParaPush()) {
            setInstalar(true);
            return;
          }
          setOcupado(true);
          const r = await ativarAvisosDaEquipe(tenantId);
          setOcupado(false);
          setAtivo(r === "ativo");
        }}
        className="mt-3 w-full"
      >
        Ativar avisos no celular
      </Button>
      {instalar ? (
        <p className="mt-2 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-3 py-3 text-xs leading-relaxed text-mute">
          {TEXTO_INSTALAR_PRIMEIRO}
        </p>
      ) : null}
    </div>
  );
}

/** Confirma o WhatsApp da pessoa da equipe: libera conversar com o Flow e receber avisos por lá. */
function MeuWhatsappNoCortai() {
  const consultar = useServerFn(meuWhatsappNoCortai);
  const gerar = useServerFn(gerarCodigoDoMeuWhatsapp);
  const { data, refetch } = useQuery({
    queryKey: ["meu-whatsapp-cortai"],
    queryFn: () => consultar(),
    staleTime: 30000,
  });
  const [codigo, setCodigo] = useState<{ codigo: string; numero: string | null } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (data?.verificadoEm && !codigo) {
    return (
      <p className="flex min-h-14 items-center gap-2 rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] px-4 py-3 text-sm text-paper">
        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> WhatsApp confirmado:
        converse com o Flow e receba avisos por lá
      </p>
    );
  }
  return (
    <div className="rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] p-4">
      <p className="text-[15px] font-semibold leading-5 text-paper">
        Conversar com o Flow pelo WhatsApp
      </p>
      <p className="mt-1 text-xs leading-relaxed text-mute">
        Confirme seu número para perguntar sua agenda, avisar atrasos e receber avisos por lá.
      </p>
      {codigo ? (
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-mute">
          <p>
            Do seu WhatsApp, envie para{" "}
            {codigo.numero ? (
              <strong className="text-paper">+{codigo.numero}</strong>
            ) : (
              "o número do Flow"
            )}
            :
          </p>
          <p className="rounded-md bg-ink px-3 py-2 text-center font-mono text-base tracking-widest text-gold">
            CODIGO {codigo.codigo}
          </p>
          <p>Vale por 15 minutos.</p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const r = await refetch();
              if (r.data?.verificadoEm) {
                setCodigo(null);
                aviso.ok("WhatsApp confirmado.");
              } else aviso.erro("Ainda não recebemos o código. Envie e tente de novo.");
            }}
            className="w-full"
          >
            Já enviei
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            try {
              const r = await gerar();
              setCodigo({ codigo: r.codigo, numero: r.numero });
            } catch (e) {
              aviso.erro(e instanceof Error ? e.message : "Não deu certo gerar o código.");
            } finally {
              setOcupado(false);
            }
          }}
          className="mt-3 w-full"
        >
          Confirmar meu WhatsApp
        </Button>
      )}
    </div>
  );
}
