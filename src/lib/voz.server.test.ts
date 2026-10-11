/* eslint-disable @typescript-eslint/no-explicit-any -- simulações de serviços */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarBancoFalso } from "./brain/banco-falso.apoio";

const estado = vi.hoisted(() => ({
  banco: null as any,
  configurada: true,
  transcricao: "marque um horário para Leandro amanhã às 15h para corte" as string | null,
  recusa: null as number | null,
  chamadas: [] as any[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return estado.banco;
  },
}));
vi.mock("@/lib/whatsapp/transcricao.server", () => ({
  transcricaoConfigurada: () => estado.configurada,
  extensaoDoTipo: () => "webm",
  transcreverAudioBase64: async (b64: string, o: any) => {
    estado.chamadas.push({ tamanho: b64.length, ...o });
    if (estado.recusa) o.aoRecusar?.(estado.recusa);
    return estado.transcricao;
  },
}));

import {
  lerConfigDeVoz,
  transcreverComProvedor,
  LIMITE_POR_HORA,
  TAMANHO_MAXIMO_DO_AUDIO,
  transcreverComandoDeVoz,
  validarAudio,
} from "./voz.server";

const audioOk = (bytes = 2_000) => Buffer.alloc(bytes, 7).toString("base64");

beforeEach(() => {
  estado.banco = criarBancoFalso({ acoes_de_ia_log: [] });
  estado.configurada = true;
  estado.recusa = null;
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

describe("motivo real da falha (não dizer 'não entendi' quando acabou o crédito)", () => {
  const entrada = { tenantId: "t1", userId: "u1", audioBase64: audioOk(), mimeType: "audio/webm" };

  it.each([
    [402, "sem_credito"],
    [403, "sem_credito"],
    [429, "sobrecarregado"],
  ])("recusa %i do serviço vira '%s'", async (status, motivo) => {
    estado.transcricao = null;
    estado.recusa = status;
    expect(await transcreverComandoDeVoz(entrada)).toEqual({ texto: null, motivo });
  });

  it("falha sem recusa explícita continua 'nao_entendi'", async () => {
    estado.transcricao = null;
    expect(await transcreverComandoDeVoz(entrada)).toEqual({ texto: null, motivo: "nao_entendi" });
  });
});

describe("provedor de transcrição próprio (ex.: Whisper gratuito)", () => {
  const env = {
    CORTAI_STT_BASE_URL: "https://api.exemplo.test/openai/v1/",
    CORTAI_STT_MODEL: "whisper-large-v3-turbo",
    CORTAI_STT_API_KEY: "chave-de-teste",
  };

  it("lê a configuração e valida https; incompleta = não usa", () => {
    expect(lerConfigDeVoz(env)).toMatchObject({
      baseUrl: "https://api.exemplo.test/openai/v1",
      modelo: "whisper-large-v3-turbo",
    });
    expect(lerConfigDeVoz({})).toBeNull();
    expect(lerConfigDeVoz({ ...env, CORTAI_STT_API_KEY: "" })).toBeNull();
    expect(lerConfigDeVoz({ ...env, CORTAI_STT_BASE_URL: "http://externo.test/v1" })).toBeNull();
    expect(lerConfigDeVoz({ ...env, CORTAI_STT_BASE_URL: "http://localhost:9/v1" })).not.toBeNull();
    expect(lerConfigDeVoz({ ...env, CORTAI_STT_BASE_URL: "não é url" })).toBeNull();
  });

  it("envia o áudio no formato OpenAI (multipart) com a chave só no cabeçalho", async () => {
    const buscar = vi.fn(
      async (_u: any, _i: any) =>
        new Response(JSON.stringify({ text: " marque Leandro às 15h " }), { status: 200 }),
    );
    const r = await transcreverComProvedor(
      lerConfigDeVoz(env)!,
      audioOk(),
      "audio/webm",
      buscar as any,
    );
    expect(r).toEqual({ texto: "marque Leandro às 15h" });
    const [url, init] = buscar.mock.calls[0]!;
    expect(url).toBe("https://api.exemplo.test/openai/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer chave-de-teste");
    const f = init.body as FormData;
    expect(f.get("model")).toBe("whisper-large-v3-turbo");
    expect(f.get("language")).toBe("pt");
    expect((f.get("file") as File).name).toBe("audio.webm");
    expect(JSON.stringify([...f.entries()].filter(([k]) => k !== "file"))).not.toContain(
      "chave-de-teste",
    );
  });

  it("recusa do provedor devolve o status; rede caída e resposta vazia viram sem texto", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cfg = lerConfigDeVoz(env)!;
    expect(
      await transcreverComProvedor(
        cfg,
        audioOk(),
        "audio/webm",
        (async () => new Response("x", { status: 429 })) as any,
      ),
    ).toEqual({ texto: null, status: 429 });
    expect(
      await transcreverComProvedor(cfg, audioOk(), "audio/webm", (async () => {
        throw new Error("rede");
      }) as any),
    ).toEqual({ texto: null });
    expect(
      await transcreverComProvedor(
        cfg,
        audioOk(),
        "audio/webm",
        (async () => new Response(JSON.stringify({ text: "" }), { status: 200 })) as any,
      ),
    ).toEqual({ texto: null });
  });

  it("configurado, o comando usa o provedor próprio e NÃO o gateway do Lovable", async () => {
    vi.stubEnv("CORTAI_STT_BASE_URL", env.CORTAI_STT_BASE_URL);
    vi.stubEnv("CORTAI_STT_MODEL", env.CORTAI_STT_MODEL);
    vi.stubEnv("CORTAI_STT_API_KEY", env.CORTAI_STT_API_KEY);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ text: "quais clientes chamam Leandro" }), { status: 200 }),
      ),
    );
    estado.configurada = false; // sem LOVABLE_API_KEY: ainda assim funciona
    const r = await transcreverComandoDeVoz({
      tenantId: "t1",
      userId: "u1",
      audioBase64: audioOk(),
      mimeType: "audio/webm",
    });
    expect(r).toEqual({ texto: "quais clientes chamam Leandro" });
    expect(estado.chamadas).toHaveLength(0);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("provedor próprio sem crédito (402) é dito com clareza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("CORTAI_STT_BASE_URL", env.CORTAI_STT_BASE_URL);
    vi.stubEnv("CORTAI_STT_MODEL", env.CORTAI_STT_MODEL);
    vi.stubEnv("CORTAI_STT_API_KEY", env.CORTAI_STT_API_KEY);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota", { status: 402 })),
    );
    const r = await transcreverComandoDeVoz({
      tenantId: "t1",
      userId: "u1",
      audioBase64: audioOk(),
      mimeType: "audio/webm",
    });
    expect(r).toEqual({ texto: null, motivo: "sem_credito" });
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
