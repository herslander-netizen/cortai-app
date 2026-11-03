import { Aparelho, CabecalhoDemo, cartaoDemo as cartao, suaveDemo as suave } from "./DemoFrame";
import { Check, ChartNoAxesCombined, Clock3, Star, Users } from "lucide-react";

export function DemoWhatsApp() {
  return (
    <Aparelho nome="Exemplo visual de mensagem e confirmação via WhatsApp">
      <div className="w-full max-w-[280px] space-y-4">
        <CabecalhoDemo icone={Clock3} titulo="Mensagem de atendimento" detalhe="Prévia ilustrativa" />
        <div
          className="max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-snug"
          style={{
            background: "color-mix(in oklab, var(--figaro-on-primary) 16%, transparent)",
            color: "var(--figaro-on-primary)",
          }}
        >
          Oi, Ana! Amanhã às 10:30 você tem horário. Confirma?
        </div>
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-br-md px-4 py-3 text-sm font-bold"
            style={{ background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" }}
          >
            Confirmo ✓
          </div>
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAvaliacoes() {
  return (
    <Aparelho nome="Exemplo visual de avaliações e comentários">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Star} titulo="Avaliações" detalhe="Experiência dos clientes" />
        <div className="rounded-2xl p-3" style={cartao}>
          <div className="flex items-center justify-between">
            <div>
              <b className="text-3xl tabular-nums">4,8</b>
              <p style={suave}>Nota média demonstrativa</p>
            </div>
            <div className="text-right">
              <div className="text-lg" style={{ color: "var(--figaro-tertiary)" }}>
                ★★★★★
              </div>
              <p style={suave}>32 avaliações de exemplo</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              ["5 estrelas", "82%"],
              ["4 estrelas", "12%"],
              ["3 estrelas", "6%"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-2 text-[10px]">
                <span className="w-16" style={suave}>
                  {label}
                </span>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)" }}
                >
                  <div className="h-full rounded-full" style={{ width: value, background: "var(--figaro-tertiary)" }} />
                </div>
                <b className="w-7 text-right">{value}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {[
            ["Mariana Costa", "Atendimento excelente!"],
            ["Rafael Lima", "Muito atenciosos e pontuais."],
          ].map(([nome, comentario]) => (
            <div key={nome} className="rounded-xl p-3" style={cartao}>
              <div className="flex items-center justify-between text-[10px]">
                <b>{nome}</b>
                <span style={{ color: "var(--figaro-tertiary)" }}>★★★★★</span>
              </div>
              <p className="mt-1 text-[10px]" style={suave}>
                {comentario}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoDesempenho() {
  return (
    <Aparelho nome="Exemplo visual de indicadores do negócio">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={ChartNoAxesCombined} titulo="Seu negócio" detalhe="Visão geral · Exemplo" />
        <div className="grid grid-cols-2 gap-2">
          {[
            ["1.240", "Visitas na página"],
            ["186", "Agendamentos"],
            ["15%", "Conversão"],
            ["R$ 10,8k", "Faturamento"],
          ].map(([valor, label]) => (
            <div key={label} className="rounded-xl p-3" style={cartao}>
              <b className="block text-lg tabular-nums">{valor}</b>
              <span className="text-[9px]" style={suave}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={cartao}>
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[11px]">Mais procurados</b>
            <span style={suave}>Dados ilustrativos</span>
          </div>
          {["Serviço completo", "Corte e finalização", "Cuidados especiais"].map((item, i) => (
            <div
              key={item}
              className="flex items-center justify-between border-t py-2 text-[10px]"
              style={{ borderColor: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)" }}
            >
              <span>{item}</span>
              <b>{[76, 48, 32][i]}</b>
            </div>
          ))}
        </div>
        <div
          className="flex items-center gap-2 rounded-xl p-2.5 text-[10px]"
          style={{ background: "var(--figaro-primary-container)", color: "var(--figaro-on-primary-container)" }}
        >
          <Check size={13} /> Acompanhe e ajuste seu negócio
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoFila() {
  return (
    <Aparelho nome="Exemplo visual de fila de espera e previsão de atendimento">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Users} titulo="Fila de espera" detalhe="Prévia demonstrativa" />
        <div className="grid grid-cols-3 gap-2">
          {[
            ["03", "Na fila"],
            ["15 min", "Próximo"],
            ["3", "Pessoas"],
          ].map(([valor, rotulo]) => (
            <div key={rotulo} className="rounded-xl p-2 text-center" style={cartao}>
              <b className="block text-sm tabular-nums">{valor}</b>
              <span className="text-[9px]" style={suave}>{rotulo}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-xl p-3" style={cartao}>
          {[
            ["1", "Ana", "Em atendimento"],
            ["2", "Carlos", "Próximo"],
            ["3", "Mariana", "Aguardando"],
          ].map(([ordem, nome, estado]) => (
            <div key={ordem} className="flex items-center gap-2 text-[11px]">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full font-bold"
                style={{ background: "var(--figaro-primary-container)", color: "var(--figaro-on-primary-container)" }}
              >
                {ordem}
              </span>
              <b className="flex-1">{nome}</b>
              <span style={suave}>{estado}</span>
            </div>
          ))}
        </div>
      </div>
    </Aparelho>
  );
}
