/**
 * Inscrição de push deste aparelho (só equipe). Sempre a partir de um toque.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  atualizarEstadoPush,
  getChavePublicaPush,
  salvarInscricaoPush,
} from "@/lib/push.functions";
import { detectarPlataforma, estaInstalado } from "@/lib/pwa";
import { modoDiscretoInicial } from "@/components/barbeiro/agenda/preferencias";
import { deB64urlNavegador } from "./base64";

export const CHAVE_PUSH_ATIVO = "cortai:push-ativo";

export type ResultadoDoPush =
  "ativo" | "instalar_primeiro" | "bloqueado" | "recusado" | "so_no_app" | "falhou";

/** iPhone só recebe push com o Flow instalado na Tela de Início. */
export function precisaInstalarParaPush() {
  return detectarPlataforma() === "ios" && !estaInstalado();
}

function marcar(ativo: boolean) {
  try {
    if (ativo) localStorage.setItem(CHAVE_PUSH_ATIVO, "sim");
    else localStorage.removeItem(CHAVE_PUSH_ATIVO);
  } catch {
    /* opcional */
  }
}

export function pushAtivoNesteAparelho() {
  try {
    return localStorage.getItem(CHAVE_PUSH_ATIVO) === "sim";
  } catch {
    return false;
  }
}

async function registroAtivo() {
  if (!("serviceWorker" in navigator)) return null;
  const registros = await navigator.serviceWorker.getRegistrations();
  return registros.find((r) => r.active?.scriptURL.endsWith("/sw.js")) ?? null;
}

export async function ativarPushDaEquipe(tenantId: string): Promise<ResultadoDoPush> {
  if (precisaInstalarParaPush()) return "instalar_primeiro";
  if (typeof Notification === "undefined") return "falhou";
  let permissao: NotificationPermission;
  try {
    permissao = await Notification.requestPermission();
  } catch {
    return "falhou";
  }
  if (permissao === "denied") return "bloqueado";
  if (permissao !== "granted") return "recusado";
  try {
    const registro = await registroAtivo();
    // Fora do domínio oficial não há service worker: os avisos ficam no app.
    if (!registro || !("pushManager" in registro)) return "so_no_app";
    const { publica } = await getChavePublicaPush();
    const inscricao =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: deB64urlNavegador(publica),
      }));
    const json = inscricao.toJSON();
    const r = await salvarInscricaoPush({
      data: {
        tenantId,
        endpoint: inscricao.endpoint,
        p256dh: json.keys?.["p256dh"] ?? "",
        auth: json.keys?.["auth"] ?? "",
        plataforma: detectarPlataforma(),
      },
    });
    if (!r.ok) return "falhou";
    marcar(true);
    void informarEstadoDoAparelho({ foco: false, discreto: modoDiscretoInicial() });
    return "ativo";
  } catch {
    return "falhou";
  }
}

/** Na saída da conta: apaga a inscrição deste aparelho. Nunca bloqueia o logout. */
export async function removerPushDesteAparelho() {
  marcar(false);
  try {
    const registro = await registroAtivo();
    const inscricao = await registro?.pushManager.getSubscription();
    if (!inscricao) return;
    await supabase.from("push_inscricoes").delete().eq("endpoint", inscricao.endpoint);
    await inscricao.unsubscribe();
  } catch {
    /* segue o logout */
  }
}

/** Informa ao servidor o Foco e o modo discreto deste aparelho. Nunca falha alto. */
export async function informarEstadoDoAparelho(estado: { foco: boolean; discreto: boolean }) {
  if (!pushAtivoNesteAparelho()) return;
  try {
    const registro = await registroAtivo();
    const inscricao = await registro?.pushManager.getSubscription();
    if (!inscricao) return;
    await atualizarEstadoPush({ data: { endpoint: inscricao.endpoint, ...estado } });
  } catch {
    /* sem rede: o Foco expira sozinho no servidor */
  }
}
