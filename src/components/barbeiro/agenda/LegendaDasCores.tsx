import { DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

/** Cada cor dos cartões da Agenda e o estado do cliente que ela mostra (tokens `--estado-*`). */
export const CORES_DOS_ESTADOS = [
  { nome: "Agendado", token: "--estado-agendado" },
  { nome: "Confirmado", token: "--estado-confirmado" },
  { nome: "Chegou", token: "--estado-chegou" },
  { nome: "Na cadeira", token: "--estado-na-cadeira" },
  { nome: "Finalizado", token: "--estado-finalizado" },
  { nome: "Faltou", token: "--estado-faltou" },
  { nome: "Remarcado", token: "--estado-remarcado" },
  { nome: "Cancelado", token: "--estado-cancelado" },
  { nome: "Encaixe", token: "--estado-encaixe" },
] as const;

/** Legenda discreta no fim do menu "…" da Agenda: a cor da barrinha de cada cartão. */
export function LegendaDasCores() {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="pb-1 text-xs font-semibold text-mute">
        Cores dos cartões
      </DropdownMenuLabel>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-2 pb-2 text-xs text-paper">
        {CORES_DOS_ESTADOS.map(({ nome, token }) => (
          <li key={nome} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-4 w-1 shrink-0 rounded-full"
              style={{ background: `var(${token})` }}
            />
            {nome}
          </li>
        ))}
      </ul>
    </>
  );
}
