/**
 * Resolve the OAuth authorization server advertised for the MCP resource.
 * A malformed optional environment value must not turn discovery into a 500.
 */
export function servidoresDeAutorizacaoSupabase(
  supabaseUrl?: string,
  projectRef?: string,
): string[] {
  if (supabaseUrl) {
    try {
      const configured = new URL(supabaseUrl);
      if (
        configured.protocol !== "https:" &&
        !(configured.protocol === "http:" && configured.hostname === "localhost")
      ) return [];
      const basePath = configured.pathname.replace(/\/+$/, "");
      return [`${configured.origin}${basePath}/auth/v1`];
    } catch {
      return [];
    }
  }

  if (projectRef && /^[a-z0-9-]+$/.test(projectRef)) {
    return [`https://${projectRef}.supabase.co/auth/v1`];
  }

  return [];
}
