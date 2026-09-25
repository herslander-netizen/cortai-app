import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PERMISSOES_PADRAO, TETO_DO_PAPEL } from "@/lib/permissoes";

describe("presets por função", () => {
  it("nenhum preset passa do teto da função", () => {
    for (const papel of Object.keys(PERMISSOES_PADRAO) as (keyof typeof PERMISSOES_PADRAO)[]) {
      for (const chave of PERMISSOES_PADRAO[papel]) expect(TETO_DO_PAPEL[papel]).toContain(chave);
    }
  });
  it("plano, fiado e exclusão só no teto do dono", () => {
    for (const chave of ["gerenciar_plano", "liberar_fiado", "excluir_barbearia"] as const) {
      expect(TETO_DO_PAPEL.dono).toContain(chave);
      expect(TETO_DO_PAPEL.gerente).not.toContain(chave);
      expect(TETO_DO_PAPEL.recepcao).not.toContain(chave);
      expect(TETO_DO_PAPEL.barbeiro).not.toContain(chave);
    }
  });
  it("relatórios e comissões de todos só para gerente e dono", () => {
    for (const chave of ["relatorios", "comissao_visualizar_todas", "visualizar_financeiro", "gerenciar_permissoes"] as const) {
      expect(TETO_DO_PAPEL.barbeiro).not.toContain(chave);
      expect(TETO_DO_PAPEL.recepcao).not.toContain(chave);
      expect(TETO_DO_PAPEL.gerente).toContain(chave);
    }
  });
});

// Prova no banco (RLS e funções). Precisa de acesso ao banco; roda em transação desfeita.
const temBanco = Boolean(process.env["PGHOST"] || process.env["SUPABASE_DB_URL"]);
describe.skipIf(!temBanco)("regras no banco por função", () => {
  it("cada função lê e altera só o que deve", () => {
    const arquivo = resolve(__dirname, "../../supabase/tests/rbac.sql");
    expect(existsSync(arquivo)).toBe(true);
    const saida = execFileSync("psql", ["-X", "-q", "-f", arquivo], { encoding: "utf8", timeout: 60000 });
    const linhas = saida.split("\n").filter((l) => l.startsWith("PASS") || l.startsWith("FAIL"));
    expect(linhas.length).toBeGreaterThan(40);
    expect(linhas.filter((l) => l.startsWith("FAIL"))).toEqual([]);
  }, 70000);
});
