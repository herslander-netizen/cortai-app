import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { admin: true } }));

import { exigirAdminDaPlataforma } from "./whatsapp-central.functions";

const contexto = (ehAdmin: boolean) => ({
  userId: "u1",
  supabase: { rpc: vi.fn(async () => ({ data: ehAdmin, error: null })) } as never,
});

describe("acesso à Central de Notificações", () => {
  it("usuário de estabelecimento é barrado", async () => {
    await expect(exigirAdminDaPlataforma(contexto(false))).rejects.toThrow(/exclusivo/);
  });
  it("Admin da plataforma é liberado", async () => {
    await expect(exigirAdminDaPlataforma(contexto(true))).resolves.toEqual({ admin: true });
  });
  it("confere o papel admin pelo banco, com o id de quem chama", async () => {
    const ctx = contexto(true);
    await exigirAdminDaPlataforma(ctx);
    expect((ctx.supabase as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith(
      "has_role",
      { _user_id: "u1", _role: "admin" },
    );
  });
});
