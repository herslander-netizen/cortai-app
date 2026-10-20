import { afterEach, describe, expect, it, vi } from "vitest";

import { hostPublico, origemPublica, urlPublica } from "@/lib/origem-publica";

describe("origemPublica", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem configuração continua em cortai.dev", () => {
    vi.stubEnv("CORTAI_PUBLIC_BASE_URL", "");
    vi.stubEnv("VITE_CORTAI_PUBLIC_URL", "");
    expect(origemPublica()).toBe("https://cortai.dev");
    expect(urlPublica("/b/minha-loja")).toBe("https://cortai.dev/b/minha-loja");
    expect(hostPublico()).toBe("cortai.dev");
  });

  it("usa a origem do ambiente, sem barra nem caminho no fim", () => {
    vi.stubEnv("CORTAI_PUBLIC_BASE_URL", "https://previa.exemplo.dev/qualquer/");
    expect(origemPublica()).toBe("https://previa.exemplo.dev");
    expect(urlPublica("/agendar/x")).toBe("https://previa.exemplo.dev/agendar/x");
  });

  it("recusa valor inválido ou sem HTTPS e cai na próxima opção", () => {
    vi.stubEnv("CORTAI_PUBLIC_BASE_URL", "http://inseguro.exemplo.dev");
    vi.stubEnv("VITE_CORTAI_PUBLIC_URL", "https://build.exemplo.dev");
    expect(origemPublica()).toBe("https://build.exemplo.dev");
    vi.stubEnv("VITE_CORTAI_PUBLIC_URL", "lixo");
    expect(origemPublica()).toBe("https://cortai.dev");
  });
});
