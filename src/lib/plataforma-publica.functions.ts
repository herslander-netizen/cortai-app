import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const getGlobalDesign = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await clientePublico()
    .from("design_da_plataforma")
    .select("cor_fundo, cor_superficie, cor_primaria, cor_texto, tipografia, raio_px")
    .eq("id", true)
    .maybeSingle();
  return data;
});

export const getPlatformContact = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("contato_da_plataforma");
  return data?.[0] ?? null;
});