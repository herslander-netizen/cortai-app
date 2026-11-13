import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { podeComandarConversa } from "./permissoes-central";

describe("Central de Atendimento — permissões por função", () => {
  it("perfil só com leitura não executa nenhum comando", () => {
    const consulta = { podeAssumir: false, podeGerenciar: false };
    for (const acao of ["assumir", "retomar", "resolver"] as const) {
      expect(podeComandarConversa(consulta, acao)).toBe(false);
    }
  });

  it("profissional com assumir_conversa assume e devolve atendimento, sem encerrar", () => {
    const profissional = { podeAssumir: true, podeGerenciar: false };
    expect(podeComandarConversa(profissional, "assumir")).toBe(true);
    expect(podeComandarConversa(profissional, "retomar")).toBe(true);
    expect(podeComandarConversa(profissional, "resolver")).toBe(false);
  });

  it("recepção ou gerente com gerenciar_conversas pode organizar e encerrar", () => {
    const gerencia = { podeAssumir: false, podeGerenciar: true };
    for (const acao of ["assumir", "retomar", "resolver"] as const) {
      expect(podeComandarConversa(gerencia, acao)).toBe(true);
    }
  });

  it("botões da central respeitam a matriz sem exigir gerenciar_whatsapp", () => {
    const s = readFileSync("src/components/whatsapp/CentralDeAtendimento.tsx", "utf8");
    expect(s).toContain("lista.data?.podeAssumir");
    expect(s).toContain('lista.data?.podeGerenciar && escolhida.estado !== "resolvida"');
    expect(s).not.toContain("gerenciar_whatsapp");
  });

  it("servidor exige recurso e ver_cortai para ambas as consultas", () => {
    const s = readFileSync("src/lib/central-atendimento.functions.ts", "utf8");
    const listar = s.slice(s.indexOf("export const listarConversasDaCentral"),s.indexOf("const conversaSchema"));
    const detalhar = s.slice(s.indexOf("export const detalharConversaDaCentral"),s.indexOf("const comandoSchema"));
    for (const bloco of [listar,detalhar]) {
      expect(bloco).toContain(".middleware([requireSupabaseAuth])");
      expect(bloco).toContain('exigirPermissao(context, tenantId, "ver_cortai")');
      expect(bloco).toContain('exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp")');
      expect(bloco).toContain('.eq("tenant_id", tenantId)');
    }
  });

  it("cartão de conversa é vertical e independente do Button horizontal global", () => {
    const s = readFileSync("src/components/whatsapp/CentralDeAtendimento.tsx", "utf8");
    const start = s.indexOf('aria-pressed={selecao === conversa.id}');
    const bloco = s.slice(start - 90,start + 1700);
    expect(bloco).toContain('<button');
    expect(bloco).toContain("block min-h-12 w-full whitespace-normal");
    expect(bloco).toContain("line-clamp-2 whitespace-normal break-words");
    expect(bloco).not.toContain('<Button variant="ghost"');
  });
});
