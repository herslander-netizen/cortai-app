import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ExperienciaDoLink, PaginaConfig } from "@/lib/pagina-config";
import type { SetPagina } from "./tipos";

type Opcao = {
  id: ExperienciaDoLink;
  nome: string;
  ajuda: string;
  chips: string[];
};

const OPCOES: Opcao[] = [
  {
    id: "direta",
    nome: "Direta",
    ajuda: "O cliente marca em poucos toques.",
    chips: ["Serviços", "Profissional", "Horário"],
  },
  {
    id: "vitrine",
    nome: "Vitrine",
    ajuda: "Sua página completa, com botão de agendar sempre à mão.",
    chips: ["Capa", "Serviços", "Equipe", "Galeria", "Avaliações", "+4"],
  },
  {
    id: "conversa",
    nome: "Conversa",
    ajuda: "Uma recepção que guia por botões.",
    chips: ["Recepção", "Botões", "Resumo"],
  },
];

/** Desenho esquemático de cada experiência (só formas, sem texto). */
function Miniatura({ id }: { id: ExperienciaDoLink }) {
  const bloco = "rounded-sm bg-line2";
  return (
    <span
      aria-hidden
      className="flex h-20 w-14 shrink-0 flex-col gap-1 rounded-md border border-line bg-ink3 p-1.5"
    >
      {id === "direta" ? (
        <>
          <i className={`${bloco} h-2 w-6`} />
          <i className={`${bloco} h-3`} />
          <i className={`${bloco} h-3`} />
          <i className={`${bloco} h-3`} />
          <i className="mt-auto h-2.5 rounded-sm bg-gold" />
        </>
      ) : id === "vitrine" ? (
        <>
          <i className={`${bloco} h-6`} />
          <i className={`${bloco} h-2 w-8`} />
          <span className="flex gap-1">
            <i className={`${bloco} h-3 flex-1`} />
            <i className={`${bloco} h-3 flex-1`} />
          </span>
          <i className="mt-auto h-2.5 rounded-sm bg-gold" />
        </>
      ) : (
        <>
          <i className={`${bloco} h-3 w-9`} />
          <i className="ml-auto h-3 w-7 rounded-sm bg-gold" />
          <i className={`${bloco} h-3 w-10`} />
          <span className="mt-auto flex gap-1">
            <i className={`${bloco} h-2.5 flex-1`} />
            <i className={`${bloco} h-2.5 flex-1`} />
          </span>
        </>
      )}
    </span>
  );
}

export function SecaoExperiencia({
  config,
  setPagina,
}: {
  config: PaginaConfig;
  setPagina: SetPagina;
}) {
  return (
    <div>
      <div className="grid gap-2" role="group" aria-label="Experiência do link">
        {OPCOES.map((opcao) => {
          const ativa = config.experiencia === opcao.id;
          return (
            <Button
              key={opcao.id}
              type="button"
              variant="ghost"
              size="bloco"
              aria-pressed={ativa}
              onClick={() => setPagina("experiencia", opcao.id)}
              className={`flex min-h-12 items-start gap-3 whitespace-normal rounded-lg border p-3 text-left ${ativa ? "border-gold bg-gold/10" : "border-line"}`}
            >
              <Miniatura id={opcao.id} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between text-sm font-semibold text-paper">
                  {opcao.nome}
                  {ativa ? <Check size={16} className="text-gold" aria-hidden /> : null}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-mute">{opcao.ajuda}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {opcao.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-mute"
                    >
                      {chip}
                    </span>
                  ))}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
      {config.experiencia === "vitrine" ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-mute">Ao tocar Agendar</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Ao tocar Agendar">
            {(
              [
                ["tradicional", "Passo a passo"],
                ["conversa", "Conversa"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                className={`h-12 ${config.chat.modo === id ? "border-gold bg-gold/10" : ""}`}
                aria-pressed={config.chat.modo === id}
                onClick={() => setPagina("chat", { ...config.chat, modo: id })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-mute">Nada muda para seus clientes até você publicar.</p>
    </div>
  );
}
