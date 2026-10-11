/* eslint-disable @typescript-eslint/no-explicit-any -- simulações de serviços */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarBancoFalso } from "./brain/banco-falso.apoio";

const estado = vi.hoisted(() => ({
  banco: null as any,
  configurada: true,
  transcricao: "marque um horário para Leandro amanhã às 15h para corte" as string | null,
  chamadas: [] as any[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return estado.banco;
  },
}));
vi.mock("@/lib/whatsapp/transcricao.server", () => ({
  transcricaoConfigurada: () => estado.configurada,
  transcreverAudioBase64: async (b64: string, o: any) => {
    estado.chamadas.push({ tamanho: b64.length, ...o });
    return estado.transcricao;
  },
}));

import {
  LIMITE_POR_HORA,
  TAMANHO_MAXIMO_DO_AUDIO,
  transcreverComandoDeVoz,
  validarAudio,
} from "./voz.server";

const audioOk = (bytes = 2_000) => Buffer.alloc(bytes, 7).toString("base64");

beforeEach(() => {
  estado.banco = criarBancoFalso({ acoes_de_ia_log: [] });
  estado.configurada = true;
  estado.transcricao = "marque um horário para Leandro amanhã às 15h para corte";
  estado.chamadas.length = 0;
});

describe("validarAudio", () => {
  it("aceita os formatos que os navegadores gravam", () => {
    for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg", "audio/wav"])
      expect(validarAudio(audioOk(), t).ok).toBe(true);
  });
  it("recusa tipo estranho, base64 inválido, pequeno e grande demais", () => {
    expect(validarAudio(audioOk(), "application/pdf")).toEqual({
      ok: false,
      motivo: "tipo_nao_aceito",
    });
    expect(validarAudio("isso não é base64!!", "audio/webm")).toEqual({
      ok: false,
      motivo: "invalido",
    });
    expect(validarAudio(audioOk(100), "audio/webm")).toEqual({ ok: false, motivo: "invalido" });
    expect(validarAudio(audioOk(TAMANHO_MAXIMO_DO_AUDIO + 10), "audio/webm")).toEqual({
      ok: false,
      motivo: "grande_demais",
    });
  });
  it("aceita o prefixo data: de FileReader", () => {
    expect(validarAudio(`data:audio/webm;base64,${audioOk()}`, "audio/webm").ok).toBe(true);
  });
});

describe("transcreverComandoDeVoz (servidor)", () => {
  const entrada = (extra: Record<string, unknown> = {}) => ({
    tenantId: "t1",
    userId: "u1",
    audioBase64: audioOk(),
    mimeType: "audio/webm;codecs=opus",
    ...extra,
  });

  it("transcreve e registra o uso (sem guardar o áudio)", async () => {
    const r = await transcreverComandoDeVoz(entrada());
    expect(r).toEqual({ texto: "marque um horário para Leandro amanhã às 15h para corte" });
    expect(estado.chamadas[0]).toMatchObject({ mimetype: "audio/webm" });
    const log = estado.banco.tabelas.acoes_de_ia_log;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ tenant_id: "t1", acao: "voz.transcricao", intencao: "u1" });
    expect(JSON.stringify(log)).not.toContain(audioOk());
  });

  it("não entendeu o áudio", async () => {
    estado.transcricao = null;
    expect(await transcreverComandoDeVoz(entrada())).toEqual({
      texto: null,
      motivo: "nao_entendi",
    });
  });

  it("IA de voz não configurada neste ambiente", async () => {
    estado.configurada = false;
    expect(await transcreverComandoDeVoz(entrada())).toEqual({
      texto: null,
      motivo: "indisponivel",
    });
    expect(estado.chamadas).toHaveLength(0);
  });

  it("áudio inválido nem chega ao serviço de transcrição", async () => {
    expect(await transcreverComandoDeVoz(entrada({ mimeType: "text/plain" }))).toEqual({
      texto: null,
      motivo: "tipo_nao_aceito",
    });
    expect(estado.chamadas).toHaveLength(0);
  });

  it("limite por pessoa/hora; outra pessoa e outro negócio não são afetados", async () => {
    const log = estado.banco.tabelas.acoes_de_ia_log;
    for (let i = 0; i < LIMITE_POR_HORA; i += 1)
      log.push({
        tenant_id: "t1",
        acao: "voz.transcricao",
        intencao: "u1",
        criado_em: new Date().toISOString(),
      });
    expect(await transcreverComandoDeVoz(entrada())).toEqual({ texto: null, motivo: "limite" });
    expect((await transcreverComandoDeVoz(entrada({ userId: "u2" }))).texto).not.toBeNull();
    expect((await transcreverComandoDeVoz(entrada({ tenantId: "t2" }))).texto).not.toBeNull();
  });

  it("usos antigos (mais de 1 hora) não contam", async () => {
    const log = estado.banco.tabelas.acoes_de_ia_log;
    for (let i = 0; i < LIMITE_POR_HORA; i += 1)
      log.push({
        tenant_id: "t1",
        acao: "voz.transcricao",
        intencao: "u1",
        criado_em: new Date(Date.now() - 2 * 3600_000).toISOString(),
      });
    expect((await transcreverComandoDeVoz(entrada())).texto).not.toBeNull();
  });

  it("falha ao contar o uso não bloqueia a equipe", async () => {
    estado.banco = {
      from: () => {
        throw new Error("banco fora");
      },
    };
    expect((await transcreverComandoDeVoz(entrada())).texto).not.toBeNull();
  });

  it("limita o tamanho do comando transcrito", async () => {
    estado.transcricao = "a".repeat(5_000);
    const r: any = await transcreverComandoDeVoz(entrada());
    expect(r.texto.length).toBe(1_500);
  });
});
