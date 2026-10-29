import { useEffect } from "react";

import { SeletorDeFoto } from "@/components/fotos/SeletorDeFoto";
import { Campo } from "@/components/marca/editor/campos";
import { textoMinimo } from "./validacao";
import type { PropsDoEditor } from "./editores";
import { GrupoDeCampos, LinhaComSwitch } from "./pecas";

export const MINIMO_DA_FRASE = 8;
const MAXIMO_DA_FRASE = 120;

/**
 * Hero Banner, como no Figaro (`HeroEditorScreen`): grupo "Imagem de fundo" (escolhida na galeria de fotos, sem
 * link) e grupo "Textos" com a frase principal (obrigatória, mínimo de 8 caracteres). Os campos que o Flow tem a
 * mais (sobre, botão e botão fixo) ficam no mesmo grupo.
 */
export function EditorDeHero({ e, reportarErro }: PropsDoEditor) {
  const frase = e.config.frase;
  const erroDaFrase = textoMinimo(frase, MINIMO_DA_FRASE);
  useEffect(() => reportarErro(erroDaFrase), [erroDaFrase, reportarErro]);
  return (
    <>
      <GrupoDeCampos titulo="Imagem de fundo">
        {!e.form.capa_url ? (
          <p className="text-sm leading-relaxed text-mute">
            Escolha uma foto da galeria para ficar ao fundo do topo da página.
          </p>
        ) : null}
        <SeletorDeFoto
          formato="cartao"
          rotulo="Imagem de fundo"
          prefixo="foto"
          temFoto={Boolean(e.form.capa_url)}
          previewUrl={e.coverPreview}
          onEscolher={(foto) => e.escolherCapa(foto.path, foto.url)}
          onRemover={e.removerCapa}
        />
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Textos">
        <Campo
          label="Título principal"
          value={frase}
          placeholder="Ex: Seu estilo é a nossa prioridade"
          onChange={(v) => e.setPagina("frase", v.slice(0, MAXIMO_DA_FRASE))}
        />
        {erroDaFrase ? (
          <p role="alert" className="text-sm text-brick">
            {erroDaFrase}
          </p>
        ) : null}
        <label className="block text-xs font-medium text-mute">
          Sobre {e.vocabulario.comArtigo}
          <textarea
            className="field-control mt-1.5 min-h-32 w-full resize-y"
            maxLength={1200}
            placeholder="Ex: Cuidamos de você com carinho e hora marcada."
            value={e.config.sobre}
            onChange={(ev) => e.setPagina("sobre", ev.target.value)}
          />
        </label>
        <Campo
          label="Texto do botão principal"
          value={e.config.cta}
          placeholder="Ex: Agendar horário"
          onChange={(v) => e.setPagina("cta", v)}
        />
        <LinhaComSwitch
          rotulo="Botão fixo no celular"
          marcado={e.config.botaoFixo}
          onChange={(v) => e.setPagina("botaoFixo", v)}
        />
      </GrupoDeCampos>
    </>
  );
}
