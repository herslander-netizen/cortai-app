import { describe, expect, it } from "vitest";

import { headDaBarbearia, textoDeCompartilhamento } from "@/lib/previa";

type Meta = {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
};

function metadadosDa(head: ReturnType<typeof headDaBarbearia>) {
  return head.meta as Meta[];
}

function valorMeta(metas: Meta[], tipo: "name" | "property", chave: string) {
  return metas.find((meta) => meta[tipo] === chave)?.content;
}

describe("prévia e compartilhamento públicos", () => {
  it("personaliza título, descrição e imagem social com os dados do negócio", () => {
    const head = headDaBarbearia(
      "studio-aurora",
      {
        nome: "Studio Aurora",
        descricao: "Atendimento acolhedor e serviços personalizados.",
        imagem: "https://cortai.dev/api/public/capa/studio-aurora",
      },
      "/b/studio-aurora",
    );
    const metas = metadadosDa(head);

    expect(metas.find((meta) => meta.title)?.title).toBe("Studio Aurora | Cortaí");
    expect(valorMeta(metas, "property", "og:site_name")).toBe("Cortaí");
    expect(valorMeta(metas, "property", "og:title")).toBe("Studio Aurora | Cortaí");
    expect(valorMeta(metas, "property", "og:description")).toBe(
      "Atendimento acolhedor e serviços personalizados.",
    );
    expect(valorMeta(metas, "property", "og:image")).toBe(
      "https://cortai.dev/api/public/capa/studio-aurora",
    );
    expect(valorMeta(metas, "property", "og:image:alt")).toBe("Imagem de Studio Aurora");
    expect(valorMeta(metas, "name", "twitter:title")).toBe("Studio Aurora | Cortaí");
    expect(valorMeta(metas, "name", "twitter:description")).toBe(
      "Atendimento acolhedor e serviços personalizados.",
    );
    expect(valorMeta(metas, "name", "twitter:image")).toBe(
      "https://cortai.dev/api/public/capa/studio-aurora",
    );
    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://cortai.dev/b/studio-aurora",
    });
  });

  it("usa uma descrição neutra e não publica imagem insegura quando não há prévia configurada", () => {
    const head = headDaBarbearia(
      "negocio-demo",
      { nome: "Negócio Demo", descricao: null, imagem: "http://inseguro.test/capa.jpg" },
      "/agendar/negocio-demo",
      "Agende seu horário",
    );
    const metas = metadadosDa(head);

    expect(valorMeta(metas, "property", "og:description")).toContain("Negócio Demo");
    expect(valorMeta(metas, "property", "og:image")).toBeUndefined();
    expect(valorMeta(metas, "name", "twitter:card")).toBe("summary");
  });

  it("gera uma mensagem de compartilhamento com o nome do estabelecimento", () => {
    expect(textoDeCompartilhamento("Studio Aurora")).toBe(
      "Agende seu horário com Studio Aurora pelo Cortaí. Confira os serviços e horários disponíveis.",
    );
  });

  it("mantém uma mensagem válida quando o nome estiver vazio", () => {
    expect(textoDeCompartilhamento("   ")).toContain("este estabelecimento");
  });
});
