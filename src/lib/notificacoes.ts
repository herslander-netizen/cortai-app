import { supabase } from "@/integrations/supabase/client";

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

function diaDe(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function agrupar(itens: Notificacao[]): GrupoDeAvisos[] {
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const ontem = hoje - 86400000;
  const grupos: GrupoDeAvisos[] = [
    { rotulo: "Hoje", itens: [] },
    { rotulo: "Ontem", itens: [] },
    { rotulo: "Anteriores", itens: [] },
  ];
  for (const item of itens) {
    const dia = diaDe(item.criado_em);
    if (dia === hoje) grupos[0]!.itens.push(item);
    else if (dia === ontem) grupos[1]!.itens.push(item);
    else grupos[2]!.itens.push(item);
  }
  return grupos.filter((g) => g.itens.length > 0);
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
