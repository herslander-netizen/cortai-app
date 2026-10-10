import { beforeEach, describe, expect, it, vi } from "vitest";

type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => ({
  auditoria: [] as Linha[],
  alertas: [] as Linha[],
  avisos: [] as Linha[],
  avisoFalha: false,
}));

function consulta(tabela: Linha[]) {
  const filtros: Array<(l: Linha) => boolean> = [];
  let ordem: "desc" | null = null;
  let limite = Infinity;
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), q),
    is: (c: string, v: unknown) => (filtros.push((l) => (l[c] ?? null) === v), q),
    in: (c: string, v: unknown[]) => (filtros.push((l) => v.includes(l[c])), q),
    order: () => ((ordem = "desc"), q),
    limit: (n: number) => ((limite = n), q),
    maybeSingle: async () => ({ data: resultado()[0] ?? null }),
    update: (campos: Linha) => ({
      eq: (c: string, v: unknown) => ({
        eq: (c2: string, v2: unknown) => ({
          is: async () => {
            tabela
              .filter((l) => l[c] === v && l[c2] === v2 && (l["resolvido_em"] ?? null) === null)
              .forEach((l) => Object.assign(l, campos));
            return { error: null };
          },
        }),
      }),
    }),
    insert: async (linha: Linha) => {
      tabela.push({ ...linha, criado_em: new Date(relogio.agora).toISOString() });
      return { error: null };
    },
  };
  const resultado = () => {
    const r = tabela.filter((l) => filtros.every((f) => f(l)));
    if (ordem) r.sort((a, b) => String(b["criado_em"]).localeCompare(String(a["criado_em"])));
    return r.slice(0, limite);
  };
  return q;
}

const relogio = vi.hoisted(() => ({ agora: Date.parse("2026-10-10T12:00:00Z") }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (t: string) => consulta(t === "auditoria_da_barbearia" ? banco.auditoria : banco.alertas),
  },
}));
vi.mock("@/lib/avisos/emitir.server", () => ({
  emitirAviso: async (a: Linha) => {
    if (banco.avisoFalha) throw new Error("canal fora do ar");
    banco.avisos.push(a);
    return { gravados: 1, decisoes: [] };
  },
}));

import { registrarFalhaDoServico, registrarServicoOk } from "./incidente-evolution.server";

const linha = { id: "c1", tenant_id: "t1", sessao_id: "s1" };
const outra = { id: "c2", tenant_id: "t2", sessao_id: "s2" };
const em = () => new Date(relogio.agora);
const avancar = (min: number) => (relogio.agora += min * 60_000);

beforeEach(() => {
  banco.auditoria = [];
  banco.alertas = [];
  banco.avisos = [];
  banco.avisoFalha = false;
  relogio.agora = Date.parse("2026-10-10T12:00:00Z");
});

describe("ocorrências do serviço Evolution", () => {
  it("timeout isolado: só registra instabilidade, sem alerta nem queda", async () => {
    expect(await registrarFalhaDoServico(linha, "timeout", em())).toBe("instavel");
    expect(banco.avisos).toHaveLength(0);
    expect(banco.alertas).toHaveLength(0);
    expect(banco.auditoria.map((a) => a["acao"])).toEqual(["whatsapp.evolution_instavel"]);
  });

  it("duas falhas seguidas confirmam a queda com um alerta; as seguintes não repetem", async () => {
    await registrarFalhaDoServico(linha, "timeout", em());
    avancar(15);
    expect(await registrarFalhaDoServico(linha, "timeout", em())).toBe("queda");
    expect(banco.avisos).toHaveLength(1);
    expect(banco.avisos[0]).toMatchObject({ tenantId: "t1", alvos: [{ destinatario: "gestor" }] });
    expect(banco.alertas).toHaveLength(1);
    avancar(15);
    expect(await registrarFalhaDoServico(linha, "timeout", em())).toBe("nada");
    expect(banco.avisos).toHaveLength(1);
    expect(banco.alertas).toHaveLength(1);
  });

  it("recuperação encerra a ocorrência e avisa; recuperar de instabilidade é silencioso", async () => {
    await registrarFalhaDoServico(linha, "timeout", em());
    avancar(15);
    await registrarFalhaDoServico(linha, "servico_indisponivel", em());
    avancar(15);
    expect(await registrarServicoOk(linha, em())).toBe("recuperado");
    expect(banco.avisos).toHaveLength(2);
    expect(banco.alertas[0]?.["resolvido_em"]).toBeTruthy();
    avancar(15);
    expect(await registrarServicoOk(linha, em())).toBe("nada");

    await registrarFalhaDoServico(outra, "timeout", em());
    avancar(1);
    expect(await registrarServicoOk(outra, em())).toBe("nada");
    expect(banco.avisos).toHaveLength(2);
  });

  it("falha no canal de alerta não interrompe o monitoramento", async () => {
    banco.avisoFalha = true;
    await registrarFalhaDoServico(linha, "timeout", em());
    avancar(15);
    await expect(registrarFalhaDoServico(linha, "timeout", em())).resolves.toBe("queda");
    expect(banco.auditoria.map((a) => a["acao"])).toContain("whatsapp.evolution_indisponivel");
  });

  it("isolamento: a ocorrência de um negócio não afeta o outro", async () => {
    await registrarFalhaDoServico(linha, "timeout", em());
    avancar(15);
    await registrarFalhaDoServico(linha, "timeout", em());
    expect(await registrarFalhaDoServico(outra, "timeout", em())).toBe("instavel");
    expect(banco.avisos.every((a) => a["tenantId"] === "t1")).toBe(true);
  });

  it("conexão sem negócio (central) é ignorada", async () => {
    expect(await registrarFalhaDoServico({ ...linha, tenant_id: null }, "timeout", em())).toBe(
      "ignorado",
    );
  });
});
