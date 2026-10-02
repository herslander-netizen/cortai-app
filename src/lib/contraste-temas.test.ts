import { describe, expect, it } from "vitest";

import { contraste, CORES_AGENDAMENTO } from "./cor-marca";
import { agendamentoStyle, configPadrao, TEMAS, type TemaId } from "./pagina-config";

const DESTAQUES = Object.keys(
  CORES_AGENDAMENTO.destaques,
) as (keyof typeof CORES_AGENDAMENTO.destaques)[];

function escopo(tema: TemaId, corDestaque: (typeof DESTAQUES)[number] = "azul") {
  const base = configPadrao();
  const config = { ...base, tema, cores: TEMAS[tema].cores, chat: { ...base.chat, corDestaque } };
  return agendamentoStyle(config) as Record<string, string>;
}

describe.each(Object.keys(TEMAS) as TemaId[])("contraste da confirmação no tema %s", (tema) => {
  const s = escopo(tema);
  const texto = s["--chat-page-text"]!;
  const auxiliar = s["--chat-texto-auxiliar"]!;
  const fundos = {
    pagina: s["--chat-page"]!,
    cartao: s["--chat-page"]!,
    "hover (ink3)": s["--chat-superficie-2"]!,
    "ativo (ink2)": s["--chat-superficie-1"]!,
  };

  it.each(Object.entries(fundos))(
    "texto de outline/ghost/secondary sobre %s ≥ 4,5:1",
    (_, fundo) => {
      expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(Object.entries(fundos))("texto auxiliar sobre %s ≥ 4,5:1", (_, fundo) => {
    expect(contraste(auxiliar, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(DESTAQUES)("botão principal com destaque %s ≥ 4,5:1", (destaque) => {
    const d = escopo(tema, destaque);
    expect(contraste(d["--chat-primary-foreground"]!, d["--chat-primary"]!)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
