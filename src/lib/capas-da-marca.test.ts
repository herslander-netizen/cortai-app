import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("capas da marca e imagens padrão (dono, 31/10)", () => {
  it("kit de capas escuras e claras no projeto", () => {
    for (const nome of [
      "flow-escura-quadrada",
      "flow-escura-paisagem",
      "flow-escura-9x16",
      "flow-escura-story",
      "flow-clara-quadrada",
      "flow-clara-paisagem",
      "flow-clara-retrato",
      "flow-clara-story",
    ])
      expect(existsSync(`public/marca/flow/capas/${nome}.webp`)).toBe(true);
  });

  it("compartilhamento usa a capa escura nova, sempre no site que existe", () => {
    expect(existsSync("public/capa-social-flow-v3.jpg")).toBe(true);
    for (const arquivo of [
      "src/routes/login.tsx",
      "src/routes/apresentacao.tsx",
      "src/routes/api/public/capa.$slug.ts",
      "src/lib/agendamento-publico.functions.ts",
    ]) {
      const fonte = readFileSync(arquivo, "utf8");
      expect(fonte).toContain("capa-social-flow-v3.jpg");
      expect(fonte).not.toContain("cortai.dev/capa-social");
    }
  });

  it("logo do negócio redondo no menu lateral, como na Agenda", () => {
    expect(readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8")).toContain(
      'className="!rounded-full border-0 bg-drawer-card"',
    );
  });
});

describe("ícone padrão do Flow no lugar da inicial do negócio (dono, 31/10)", () => {
  it("logo do negócio e avatar do chat usam o ícone do Flow até o negócio personalizar", () => {
    const logo = readFileSync("src/components/marca/LogoBarbearia.tsx", "utf8");
    expect(logo).toContain('import avatarPadrao from "@/assets/flow-avatar-padrao.png.asset.json"');
    expect(logo).not.toContain("inicial");
    const chat = readFileSync("src/components/chat/ChatShell.tsx", "utf8");
    expect(chat).toContain("src={avatarPadrao.url}");
    expect(chat).not.toContain("nomeExibido.slice(0, 1).toUpperCase()");
  });
});
