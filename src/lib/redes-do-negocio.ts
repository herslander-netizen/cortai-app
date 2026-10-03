/** Validação e links das redes sociais do negócio (seguro no navegador). */

export type RedeId = "instagram" | "facebook" | "tiktok" | "youtube" | "whatsapp" | "site";

const usuario = (v: string) => v.trim().replace(/^@/, "");

/** Devolve a mensagem de erro ou null quando o valor é válido (vazio é válido). */
export function validarRede(rede: RedeId, valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  if (rede === "whatsapp") {
    const d = v.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 13 ? null : "Informe o número com DDD, ex.: 79 99999-9999.";
  }
  if (/^https?:\/\//i.test(v)) {
    try {
      new URL(v);
      return null;
    } catch {
      return "Link inválido.";
    }
  }
  if (rede === "site") return /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v) ? null : "Informe um site válido.";
  return /^@?[\w.-]{2,60}$/.test(v) ? null : "Use o @ do perfil ou o link completo.";
}

/** Link público para abrir a rede. */
export function linkDaRede(rede: RedeId, valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v || validarRede(rede, v)) return null;
  if (rede === "whatsapp") {
    const d = v.replace(/\D/g, "");
    return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
  }
  if (/^https?:\/\//i.test(v)) return v;
  if (rede === "site") return `https://${v}`;
  const u = usuario(v);
  if (rede === "instagram") return `https://instagram.com/${u}`;
  if (rede === "facebook") return `https://facebook.com/${u}`;
  if (rede === "tiktok") return `https://tiktok.com/@${u}`;
  return `https://youtube.com/@${u}`;
}
