import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export type VersaoDaPagina = { id: string; versao: number; criado_em: string };

export function SecaoVersoes({
  versions,
  busy,
  restaurar,
}: {
  versions: VersaoDaPagina[];
  busy: boolean;
  restaurar: (id: string) => void;
}) {
  return (
            <ul>
              {versions.length ? (
                versions.map((version) => (
                  <li
                    key={version.id}
                    className="flex items-center justify-between border-b border-line py-3"
                  >
                    <span className="text-xs text-mute">
                      Versão {version.versao} ·{" "}
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                        new Date(version.criado_em),
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => restaurar(version.id)}
                    >
                      <RotateCcw />
                      Restaurar
                    </Button>
                  </li>
                ))
              ) : (
                <li className="text-sm text-mute">
                  As versões aparecem após a primeira publicação.
                </li>
              )}
            </ul>
  );
}
