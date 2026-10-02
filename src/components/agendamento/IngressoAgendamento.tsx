import { brl } from "@/lib/format";

export function IngressoAgendamento({
  negocio,
  servico,
  profissional,
  data,
  horario,
  duracao,
  valorCentavos,
}: {
  negocio: string;
  servico: string;
  profissional: string;
  data: string;
  horario: string;
  duracao?: number;
  valorCentavos: number;
}) {
  const itens = [
    ["Data", data],
    ["Horário", horario],
    ...(duracao ? [["Duração", `${duracao} min`]] : []),
    ["Valor", brl(valorCentavos)],
  ];
  return (
    <div className="chat-ingresso">
      <div className="px-4 pb-3 pt-4">
        <p className="text-xs font-bold uppercase text-gold">{negocio}</p>
        <p className="mt-1 text-lg font-extrabold text-paper">{servico}</p>
        <p className="text-sm text-mute">{profissional}</p>
      </div>
      <div className="chat-ingresso-corte" aria-hidden />
      <dl className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-xs text-mute">{rotulo}</dt>
            <dd className="font-extrabold text-paper">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
