import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImagePlus } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CORES_AGENDAMENTO } from "@/lib/cor-marca";
import type { PaginaConfig } from "@/lib/pagina-config";
import { CURVA, TEMPO } from "@/lib/movimento-figaro";
import { fieldClass } from "./campos";
import type { SetPagina } from "./tipos";

export function SecaoRecepcao({
  config,
  setPagina,
  avatarRef,
  avatarPreview,
  setAvatarPreview,
  upload,
}: {
  config: PaginaConfig;
  setPagina: SetPagina;
  avatarRef: RefObject<HTMLInputElement | null>;
  avatarPreview: string | null;
  setAvatarPreview: (url: string | null) => void;
  upload: (event: ChangeEvent<HTMLInputElement>, kind: "avatar") => void;
}) {
  const reduzirMovimento = useReducedMotion();
  const transicaoFoto = {
    duration: reduzirMovimento ? 0 : TEMPO.foto,
    ease: CURVA.rapidaParaLenta,
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-mute">Foto da recepção</p>
        <div className="mt-2 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="size-16 overflow-hidden p-0"
            aria-label="Alterar foto da recepção"
            onClick={() => avatarRef.current?.click()}
          >
            <AnimatePresence mode="wait" initial={false}>
              {avatarPreview ? (
                <motion.img
                  key={avatarPreview}
                  src={avatarPreview}
                  alt="Foto atual da recepção"
                  initial={reduzirMovimento ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={transicaoFoto}
                  className="h-full w-full object-cover"
                />
              ) : (
                <motion.span
                  key="sem-foto"
                  initial={reduzirMovimento ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transicaoFoto}
                  className="grid size-full place-items-center"
                >
                  <ImagePlus />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            onClick={() => avatarRef.current?.click()}
          >
            Escolher foto
          </Button>
          {config.chat.avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-12"
              onClick={() => {
                setPagina("chat", { ...config.chat, avatarUrl: null });
                setAvatarPreview(null);
              }}
            >
              Remover
            </Button>
          ) : null}
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => upload(event, "avatar")}
        />
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-mute">Quem recebe o cliente</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["Lisa", "Davi"] as const).map((nome) => (
            <Button
              key={nome}
              type="button"
              variant="ghost"
              className={`min-h-12 border ${config.chat.nomeRecepcao === nome ? "border-gold bg-gold/10 text-paper" : "border-line text-mute"}`}
              aria-pressed={config.chat.nomeRecepcao === nome}
              onClick={() => setPagina("chat", { ...config.chat, nomeRecepcao: nome })}
            >
              <span className="grid size-8 place-items-center rounded-full bg-ink3 text-sm font-extrabold text-paper">
                {nome[0]}
              </span>
              {nome}
            </Button>
          ))}
        </div>
        {!(["Lisa", "Davi"] as string[]).includes(config.chat.nomeRecepcao) ? (
          <p className="mt-2 text-xs text-mute">
            O nome atual “{config.chat.nomeRecepcao}” continua ativo até você escolher outro.
          </p>
        ) : null}
      </fieldset>
      <label className="block text-xs font-medium text-mute">
        Mensagem inicial
        <textarea
          className={`${fieldClass} min-h-24 resize-y`}
          value={config.chat.mensagemInicial}
          onChange={(e) => setPagina("chat", { ...config.chat, mensagemInicial: e.target.value })}
        />
      </label>
      <label className="block text-xs font-medium text-mute">
        Texto final
        <textarea
          className={`${fieldClass} min-h-20 resize-y`}
          value={config.chat.textoFinal}
          onChange={(e) => setPagina("chat", { ...config.chat, textoFinal: e.target.value })}
        />
      </label>
      <fieldset>
        {/* Antes os botões de cor apareciam soltos, sem dizer para que serviam. */}
        <legend className="text-xs font-medium text-mute">Cor de destaque</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["azul", "ciano", "rosa", "areia", "couro"] as const).map((cor) => {
            const marcada = config.chat.corDestaque === cor;
            return (
              <Button
                key={cor}
                type="button"
                variant="ghost"
                className={`h-12 justify-start gap-2 rounded-full border px-3 capitalize ${marcada ? "border-gold bg-gold/10 text-paper" : "border-line text-mute"}`}
                aria-pressed={marcada}
                onClick={() => setPagina("chat", { ...config.chat, corDestaque: cor })}
              >
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ background: CORES_AGENDAMENTO.destaques[cor] }}
                />
                {cor}
              </Button>
            );
          })}
        </div>
      </fieldset>
      {(
        [
          { key: "comemoracao", label: "Comemoração discreta" },
          { key: "salvarCalendario", label: "Salvar no calendário" },
          { key: "listaEspera", label: "Lista de espera" },
        ] as const
      ).map(({ key, label }) => (
        <label key={key} className="flex min-h-12 items-center justify-between gap-4">
          <span className="text-sm text-paper">{label}</span>
          <Switch
            checked={config.chat[key]}
            onCheckedChange={(checked) => setPagina("chat", { ...config.chat, [key]: checked })}
          />
        </label>
      ))}
    </div>
  );
}
