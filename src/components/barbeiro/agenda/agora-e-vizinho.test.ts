import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../../../styles.css"), "utf8");
const vizinho = readFileSync(resolve(__dirname, "PreviaDiaVizinho.tsx"), "utf8");
const operacional = readFileSync(resolve(__dirname, "../AgendaOperacional.tsx"), "utf8");

describe("linha agora, pontos e dia vizinho no padrão do Figaro (vídeo e fotos do dono, 31/10)", () => {
  it("linha agora com 2 px; etiqueta do tamanho do Figaro dentro da coluna das horas", () => {
    expect(css).toMatch(/\.agenda-linha-agora \{\s*border-top-width: 2px;/);
    expect(css).toMatch(
      /\.agenda-timeline \.agenda-linha-agora span \{\s*left: -42px;\s*top: -8px;\s*width: 35px;\s*height: 16px;/,
    );
    expect(css).toMatch(/\.agenda-timeline \.agenda-linha-agora::before \{\s*display: none;/);
  });

  it("dia vizinho mostra a coluna das horas inteira (50 px) para a etiqueta deslizar sem corte", () => {
    expect(css).toContain("clip-path: inset(-100000px 0 -100000px -16px);");
    expect(css).not.toMatch(/\.agenda-dia-vizinha \.agenda-linha-agora span \{\s*display: none;/);
  });

  it("ponto de dia com atendimento segue o tertiary do tema (#FFA6BF no escuro)", () => {
    expect(css).toContain("--agenda-ponto-do-dia: var(--figaro-tertiary, #b61055);");
  });

  it("dia vizinho mostra o profissional com o mesmo critério do dia aberto", () => {
    expect(vizinho.match(/mostrarProfissional=\{mostrarProfissional\}/g)).toHaveLength(3);
    expect(operacional).toContain(
      "mostrarProfissional={!profFiltro && profissionais.length > 1}\n          horariosDaSemana={agenda.data?.horarios}\n        />\n      ) : undefined,",
    );
  });

  it("lista com as cores de texto do Figaro nos dois temas (dono pediu também no claro)", () => {
    expect(css).toMatch(
      /\.agenda-lista-cartao \.agenda-lista-servico,[\s\S]*?color: var\(--figaro-on-surface-variant, var\(--mute\)\);/,
    );
    expect(css).not.toContain(":root:not(.light) .agenda-lista-cartao .agenda-lista-servico");
    expect(css).toMatch(
      /\[data-hoje\] \{\s*background: var\(--figaro-primary, var\(--primary\)\);/,
    );
    expect(css).toMatch(
      /\.light \.agenda-botao-agora-principal \{\s*background: var\(--figaro-surface-container-low/,
    );
  });
});

describe("busca da lista no topo da Agenda (captura do dono, 31/10)", () => {
  it("texto de exemplo curto, sem corte no celular; a descrição completa fica no aria-label", () => {
    const cabecalho = readFileSync(resolve(__dirname, "CabecalhoAgenda.tsx"), "utf8");
    expect(cabecalho).toContain('placeholder="Buscar cliente"');
    expect(cabecalho).not.toContain('placeholder="Buscar cliente, telefone ou serviço"');
    expect(cabecalho).toContain(
      'aria-label="Buscar atendimento por cliente, telefone, serviço ou profissional"',
    );
  });
});

describe("lupa do topo da Agenda (dono, 31/10)", () => {
  it("na mesma cor e tamanho do calendário e do sino, não no tom rosado", () => {
    const cabecalho = readFileSync(resolve(__dirname, "CabecalhoAgenda.tsx"), "utf8");
    expect(cabecalho).toContain(
      'className="!size-[27px] text-[var(--figaro-on-surface,var(--paper))]"',
    );
    expect(cabecalho).not.toContain("size-9 text-[var(--figaro-on-surface-variant");
  });
});

describe("nada aparece do nada ao trocar de dia (vídeo do dono, 31/10)", () => {
  it("bloqueios e intervalo do dia anterior não ficam na tela enquanto o novo dia carrega", () => {
    expect(operacional).toContain("const intervaloDoDia = agenda.isPlaceholderData");
    expect(operacional).toContain(
      "(agenda.isPlaceholderData ? [] : (agenda.data?.bloqueiosDoDia ?? []))",
    );
    expect(operacional).not.toContain(
      "intervaloPersonalizado={agenda.data?.intervaloPersonalizado ?? null}",
    );
  });

  it("dia vizinho entra com as listras do horário semanal e o intervalo já com o relógio", () => {
    expect(vizinho).toContain("horarios={data?.horarios ?? horariosDaSemana ?? []}");
    expect(operacional).toContain("horariosDaSemana={agenda.data?.horarios}");
    const timeline = readFileSync(resolve(__dirname, "../AgendaTimeline.tsx"), "utf8");
    expect(timeline.match(/<Clock3 aria-hidden \/>\s*Intervalo ·/g)).toHaveLength(2);
  });
});

describe("dia vizinho desenhado com os mesmos dados do dia aberto (vídeo do dono, 31/10)", () => {
  it("na grade, o vizinho não esconde cancelados/remarcados e traz bloqueios e intervalo do dia", () => {
    const camada = vizinho.slice(vizinho.indexOf("function CamadaVizinha"));
    expect(camada).not.toContain("ENCERRADOS");
    expect(camada).toContain("bloqueiosDoDia={bloqueios}");
    expect(camada).toContain("intervaloPersonalizado={data?.intervaloPersonalizado ?? null}");
    // Só a prévia em lista esconde os encerrados (a lista do dia aberto também esconde).
    expect(vizinho).toContain(".filter((i) => timeline || !ENCERRADOS.has(i.status))");
  });
});
