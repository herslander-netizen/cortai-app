import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { aplicarComandoDaCentral, camposDaTransicao, type AcaoDaCentral } from "./comandos-central";

const T0 = "2026-11-13T09:00:00.123456+00:00";
const T1 = "2026-11-13T09:00:00.654321+00:00";
type Registro = {
  id: string;
  tenant_id: string;
  atualizado_em: string;
  status: "ativa" | "humano" | "encerrada";
  modo_humano: boolean;
  modo_humano_ate: string | null;
  ia_ativa: boolean;
};
function fakeDb(alterar?: {
  corrida?: boolean;
  falhaLeitura?: boolean;
  falhaEscrita?: boolean;
}) {
  const linha: Registro = {
    id: "conversa-a",
    tenant_id: "tenant-a",
    atualizado_em: T0,
    status: "ativa",
    modo_humano: false,
    modo_humano_ate: null,
    ia_ativa: true,
  };
  let gravacoes = 0;
  const consultas: Array<{ tabela: string; operacao: string; filtros: Record<string, string> }> = [];
  const from = (tabela: string) => ({
    select: (_colunas: string) => {
      const filtros: Record<string, string> = {};
      const builder = {
        eq(coluna: string, valor: string) { filtros[coluna] = valor; return builder; },
        async maybeSingle() {
          consultas.push({ tabela, operacao: "select", filtros: { ...filtros } });
          if (alterar?.falhaLeitura) return { data: null, error: { message: "falha do banco" } };
          const corresponde = linha.id === filtros["id"] && linha.tenant_id === filtros["tenant_id"];
          return {
            data: corresponde ? { id: linha.id, atualizado_em: linha.atualizado_em } : null,
            error: null,
          };
        },
      };
      return builder;
    },
    update: (campos: Record<string, unknown>) => {
      const filtros: Record<string, string> = {};
      const builder = {
        eq(coluna: string, valor: string) { filtros[coluna] = valor; return builder; },
        select(_colunas: string) {
          return {
            async maybeSingle() {
              consultas.push({ tabela, operacao: "update", filtros: { ...filtros } });
              if (alterar?.falhaEscrita) return { data: null, error: { message: "falha de escrita" } };
              const corresponde =
                !alterar?.corrida &&
                linha.id === filtros["id"] &&
                linha.tenant_id === filtros["tenant_id"] &&
                linha.atualizado_em === filtros["atualizado_em"];
              if (!corresponde) return { data: null, error: null };
              Object.assign(linha, campos, { atualizado_em: T1 });
              gravacoes++;
              return { data: { id: linha.id }, error: null };
            },
          };
        },
      };
      return builder;
    },
  });
  return { db: { from } as never, linha, consultas, get gravacoes() { return gravacoes; } };
}
const comando = (acao: AcaoDaCentral) => ({
  tenantId: "tenant-a",
  conversaId: "conversa-a",
  atualizadoEm: T0,
  acao,
});

describe("Central de Atendimento — comandos do banco com controle de concorrência", () => {
  it("Assumir é persistente e não reativa nem desliga a IA global", async () => {
    const b = fakeDb();
    expect(await aplicarComandoDaCentral(b.db, comando("assumir"))).toEqual({ ok: true });
    expect(b.linha).toMatchObject({ status: "humano", modo_humano: true, modo_humano_ate: null, ia_ativa: true });
    expect(b.gravacoes).toBe(1);
  });

  it("Resolver mantém silêncio sem inventar status incompatível com CHECK", async () => {
    const b = fakeDb();
    expect(await aplicarComandoDaCentral(b.db, comando("resolver"))).toEqual({ ok: true });
    expect(b.linha).toMatchObject({ status: "encerrada", modo_humano: true, modo_humano_ate: null, ia_ativa: false });
  });

  it("Liberar IA reabre a conversa sem mexer na configuração global do negócio", async () => {
    const b = fakeDb();
    expect(await aplicarComandoDaCentral(b.db, comando("retomar"))).toEqual({ ok: true });
    expect(b.linha).toMatchObject({ status: "ativa", modo_humano: false, modo_humano_ate: null, ia_ativa: true });
  });

  it("cada comando tem somente estados válidos para o banco oficial", () => {
    const valores = new Set(["ativa", "humano", "encerrada"]);
    for (const acao of ["assumir", "resolver", "retomar"] as const) {
      expect(valores.has(camposDaTransicao(acao)["status"] as string)).toBe(true);
    }
  });

  it("timestamp desatualizado gera conflito antes de qualquer UPDATE", async () => {
    const b = fakeDb();
    expect(await aplicarComandoDaCentral(b.db, { ...comando("resolver"), atualizadoEm: T1 }))
      .toEqual({ ok: false, motivo: "conflito" });
    expect(b.gravacoes).toBe(0);
    expect(b.consultas.map(q => q.operacao)).toEqual(["select"]);
  });

  it("duas alterações simultâneas: atualização condicional só grava se timestamp bater", async () => {
    const b = fakeDb({ corrida: true });
    expect(await aplicarComandoDaCentral(b.db, comando("assumir")))
      .toEqual({ ok: false, motivo: "conflito" });
    expect(b.linha.status).toBe("ativa");
    expect(b.gravacoes).toBe(0);
    const update = b.consultas.find(q => q.operacao === "update");
    expect(update?.filtros).toEqual({
      id: "conversa-a", tenant_id: "tenant-a", atualizado_em: T0,
    });
  });

  it("tenant diferente não lê nem altera conversa do outro negócio", async () => {
    const b = fakeDb();
    await expect(aplicarComandoDaCentral(b.db, { ...comando("assumir"), tenantId: "tenant-b" }))
      .rejects.toThrow("Conversa não encontrada");
    expect(b.gravacoes).toBe(0);
    expect(b.consultas[0]?.filtros).toEqual({ id: "conversa-a", tenant_id: "tenant-b" });
  });

  it("erro de leitura ou escrita falha fechado sem confirmar mudança", async () => {
    for (const [falha, motivo] of [
      [{ falhaLeitura: true }, "Conversa não encontrada"],
      [{ falhaEscrita: true }, "Não foi possível atualizar"],
    ] as const) {
      const b = fakeDb(falha);
      await expect(aplicarComandoDaCentral(b.db, comando("assumir"))).rejects.toThrow(motivo);
      expect(b.gravacoes).toBe(0);
    }
  });

  it("servidor real exige vínculo, permissão e recurso antes de chamar o executor", () => {
    const code = readFileSync("src/lib/central-atendimento.functions.ts", "utf8");
    const fn = code.slice(code.indexOf("export const comandarConversaDaCentral"));
    const posPermissao = fn.indexOf('exigirPermissao(context, tenantId, "gerenciar_whatsapp")');
    const posRecurso = fn.indexOf('exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp")');
    const posComando = fn.indexOf("aplicarComandoDaCentral(db as never");
    expect(fn).toContain(".middleware([requireSupabaseAuth])");
    expect(fn).toContain("const tenantId = await tenantIdDoMembro(context)");
    expect(posPermissao).toBeGreaterThan(0);
    expect(posRecurso).toBeGreaterThan(posPermissao);
    expect(posComando).toBeGreaterThan(posRecurso);
  });
});

describe("Webhook — guarda antes de automações contextuais", () => {
  it("lê posse humana depois de persistir entrada e antes de responder lembretes ou áudio", () => {
    const code = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    const comeco = code.indexOf("export async function processarMensagemRecebida");
    const parte = code.slice(comeco);
    const gravar = parte.indexOf('direcao: "entrada"');
    const posse = parte.indexOf('const { data: posseParaResponder, error: erroPosseParaResponder }');
    const lembrete = parte.indexOf("tratarRespostaDeLembrete");
    const audio = parte.indexOf('textoDeAudioIndisponivel(',posse);
    expect(gravar).toBeGreaterThan(0);
    expect(posse).toBeGreaterThan(gravar);
    expect(lembrete).toBeGreaterThan(posse);
    expect(audio).toBeGreaterThan(posse);
    const regra = parte.slice(posse, lembrete);
    expect(regra).toContain('.select("status, modo_humano, modo_humano_ate")');
    expect(regra).toContain('motivo: "posse_humana_indeterminada"');
    expect(regra).toContain('motivo: "conversa_sob_controle_humano"');
    // A conversa sob controle humano permanece silenciosa mesmo se o contato
    // também estiver cadastrado como membro da equipe.
    expect(regra).not.toContain("identificarEquipe(tenantId, telefone)");
    const bot = readFileSync("src/lib/flow-bot/bot.server.ts", "utf8");
    expect(bot).toContain("if (humanoNoControle(conversa, agora)) return true;");
    expect(bot).not.toContain("!equipe && humanoNoControle");
    expect(code).toContain("if (humanoNoControle(conversa, Date.now())) return false;");
  });
});
