import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck, X } from "lucide-react";

import { getNotificacoes, type Notificacao, type TomNotificacao } from "@/lib/notificacoes.functions";

const CHAVE = "cortai:notificacoes-lidas";

function lidas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function gravar(ids: string[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ids.slice(-300)));
  } catch {
    /* preferência local é opcional */
  }
}

const COR: Record<TomNotificacao, string> = {
  sucesso: "bg-sage",
  atencao: "bg-gold",
  erro: "bg-brick",
  info: "bg-mute2",
};

const ROTULO_CATEGORIA: Record<Notificacao["categoria"], string> = {
  agendamento: "Agenda",
  pagamento: "Pagamento",
  equipe: "Equipe",
  estoque: "Estoque",
  sistema: "Avisos",
};

function relativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(Math.abs(diff) / 60000);
  const futuro = diff < 0;
  const texto = min < 1 ? "agora" : min < 60 ? `${min} min` : min < 1440 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`;
  if (min < 1) return "agora";
  return futuro ? `em ${texto}` : `há ${texto}`;
}

/** Sino do Cortaí: badge só quando existe algo novo e real para ver. */
export function SinoDeNotificacoes() {
  const [aberto, setAberto] = useState(false);
  const [vistas, setVistas] = useState<string[]>(() => (typeof window === "undefined" ? [] : lidas()));
  const { data, isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => getNotificacoes(),
    staleTime: 60_000,
    retry: false,
  });

  const itens = data?.itens ?? [];
  const naoLidas = itens.filter((i) => !vistas.includes(i.id));

  function marcar(ids: string[]) {
    const novo = Array.from(new Set([...vistas, ...ids]));
    setVistas(novo);
    gravar(novo);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={naoLidas.length ? `Notificações: ${naoLidas.length} não lidas` : "Notificações"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-mute transition-colors hover:text-paper active:bg-ink2"
      >
        <Bell size={18} />
        {naoLidas.length ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-ink" aria-hidden />
        ) : null}
      </button>

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAberto(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notificações"
            className="cortai-splash flex max-h-[80vh] w-full max-w-[440px] flex-col rounded-t-2xl border border-line bg-ink2 sm:rounded-2xl"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-paper">Notificações</h2>
                <p className="mt-0.5 truncate text-xs text-mute">
                  {naoLidas.length ? `${naoLidas.length} não lidas` : "Tudo em dia"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {naoLidas.length ? (
                  <button
                    type="button"
                    onClick={() => marcar(itens.map((i) => i.id))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-gold transition-colors active:bg-ink3"
                  >
                    <CheckCheck size={14} />
                    Marcar todas
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setAberto(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-mute transition-colors hover:text-paper active:bg-ink3"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-mute">Carregando…</p>
              ) : !itens.length ? (
                <p className="py-10 text-center text-sm text-mute">Nada por aqui ainda.</p>
              ) : (
                <ul>
                  {itens.map((item) => {
                    const lida = vistas.includes(item.id);
                    const conteudo = (
                      <span className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-4 text-left">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${lida ? "bg-line2" : COR[item.tom]}`} aria-hidden />
                        <span className="min-w-0">
                          <span className={`block text-sm ${lida ? "text-mute" : "font-semibold text-paper"}`}>{item.titulo}</span>
                          <span className="mt-0.5 block truncate text-xs text-mute2">{item.detalhe}</span>
                          <span className="mt-1 block text-[10px] uppercase tracking-wide text-mute2">
                            {ROTULO_CATEGORIA[item.categoria]} · {relativo(item.quando)}
                          </span>
                        </span>
                      </span>
                    );
                    return (
                      <li key={item.id} className="border-b border-line last:border-0">
                        {item.destino ? (
                          <Link
                            to={item.destino as never}
                            onClick={() => {
                              marcar([item.id]);
                              setAberto(false);
                            }}
                            className="block transition-colors active:bg-ink3"
                          >
                            {conteudo}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => marcar([item.id])} className="block w-full transition-colors active:bg-ink3">
                            {conteudo}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
