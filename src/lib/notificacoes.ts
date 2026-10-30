import { supabase } from "@/integrations/supabase/client";
import { fusoAtualDasTelas } from "@/lib/format";
import { hojeNoFuso } from "@/lib/horarios";

export type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  link: string | null;
  lida_em: string | null;
  criado_em: string;
};

export type GrupoDeAvisos = { rotulo: string; itens: Notificacao[] };

export async function listarNotificacoes(tenantId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("id, tipo, titulo, corpo, link, lida_em, criado_em")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Notificacao[];
}

export async function marcarComoLida(id: string) {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function marcarTodasComoLidas(tenantId: string) {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida_em: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .is("lida_em", null);
  if (error) throw new Error(error.message);
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Dia corrido (AAAA-MM-DD → número de dias) para comparar datas já no fuso do negócio. */
function diaCorrido(dia: string) {
  return Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10)) / 86_400_000;
}

/**
 * Grupos do sininho como no Figaro (`NotificationDayBucket`): Hoje, Ontem, Esta semana (até 6 dias) e, antes disso,
 * a data por extenso ("18 de outubro"; com o ano se for de outro ano). Datas no fuso do negócio, nunca do aparelho.
 */
export function agrupar(
  itens: Notificacao[],
  agora: Date = new Date(),
  fuso: string = fusoAtualDasTelas(),
): GrupoDeAvisos[] {
  const hoje = hojeNoFuso(fuso, agora);
  const grupos: GrupoDeAvisos[] = [];
  for (const item of itens) {
    const dia = hojeNoFuso(fuso, new Date(item.criado_em));
    const distancia = diaCorrido(hoje) - diaCorrido(dia);
    const rotulo =
      distancia <= 0
        ? "Hoje"
        : distancia === 1
          ? "Ontem"
          : distancia < 7
            ? "Esta semana"
            : `${+dia.slice(8, 10)} de ${MESES[+dia.slice(5, 7) - 1]}${dia.slice(0, 4) === hoje.slice(0, 4) ? "" : ` de ${dia.slice(0, 4)}`}`;
    const grupo = grupos.find((g) => g.rotulo === rotulo);
    if (grupo) grupo.itens.push(item);
    else grupos.push({ rotulo, itens: [item] });
  }
  return grupos;
}

/** Filtros do sininho como no Figaro (`NotificationsFilter`): Todas, Não lidas, Agendamentos e Clientes. */
export type FiltroDeAvisos = "nao_lidas" | "todas" | "agendamentos" | "clientes";

const TIPOS_DE_AGENDAMENTO =
  /^(agendamento|lembrete|cliente_chegou|atraso|vaga|encaixe|fila|reserva|bloqueio)/;
const TIPOS_DE_CLIENTE = /^(cliente_novo|cliente_criado|novo_cliente|avaliac)/;

export function tipoDoFiltro(tipo: string): "agendamentos" | "clientes" | null {
  if (TIPOS_DE_AGENDAMENTO.test(tipo)) return "agendamentos";
  if (TIPOS_DE_CLIENTE.test(tipo)) return "clientes";
  return null;
}

/**
 * Valores em reais no padrão brasileiro: avisos montados no banco chegam como "R$ 220.00" (ex.: Pix recebido);
 * a tela mostra "R$ 220,00". Vale também para os avisos já gravados.
 */
export function valoresEmReais(texto: string): string {
  return texto.replace(/R\$ ?(\d+)\.(\d{2})(?!\d)/g, (_, inteiro: string, centavos: string) => {
    const milhares = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `R$ ${milhares},${centavos}`;
  });
}
