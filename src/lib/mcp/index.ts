import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarServicos from "./tools/listar-servicos";
import listarAgendamentos from "./tools/listar-agendamentos";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "cort",
  title: "Cortaí",
  version: "0.1.0",
  instructions:
    "Consulta somente leitura do negócio do usuário no Cortaí. Use `listar_servicos` para o catálogo e `listar_agendamentos` para a agenda de um período.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarServicos, listarAgendamentos],
});
