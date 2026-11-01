import { useState } from "react";

const card = "w-full h-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col";

type Servico = [string, string, string];
type Segmento = {
  id: string; label: string; icon: string; logo: string; hero1: string; hero2: string;
  grad: string; accent: string; btn: string; serv: Servico[];
};

const SEGMENTOS: Segmento[] = [
  { id: "barber", label: "Barbearia", icon: "💈", logo: "CORTE&ESTILO", hero1: "Seu estilo,", hero2: "nosso compromisso.", grad: "from-zinc-900 via-zinc-800 to-amber-900", accent: "text-amber-500", btn: "bg-amber-400 text-black", serv: [["✂️","Corte","R$ 50"],["🧔","Barba","R$ 35"],["🔥","Corte+Barba","R$ 75"]] },
  { id: "salao", label: "Salão", icon: "💅", logo: "BELLA STUDIO", hero1: "Realçamos", hero2: "sua beleza natural.", grad: "from-pink-950 via-rose-900 to-fuchsia-900", accent: "text-pink-500", btn: "bg-pink-500 text-white", serv: [["💇‍♀️","Escova","R$ 60"],["💅","Manicure","R$ 45"],["🎨","Coloração","R$ 180"]] },
  { id: "clinica", label: "Clínica", icon: "✨", logo: "ESSENZA", hero1: "Estética avançada", hero2: "e bem-estar.", grad: "from-emerald-950 via-teal-900 to-emerald-900", accent: "text-emerald-500", btn: "bg-emerald-400 text-black", serv: [["🧖","Limpeza Pele","R$ 120"],["💆","Massagem","R$ 150"],["🌿","Drenagem","R$ 130"]] },
  { id: "studio", label: "Studio", icon: "💪", logo: "STUDIO PRIME", hero1: "Agende seu horário,", hero2: "sem espera.", grad: "from-violet-950 via-purple-900 to-indigo-900", accent: "text-violet-400", btn: "bg-white text-black", serv: [["🏋️","Avaliação","Grátis"],["🧘","Pilates","R$ 90"],["💪","Personal","R$ 120"]] },
];

export function SiteMockup() {
  const [seg, setSeg] = useState(1);
  const s = SEGMENTOS[seg]!;
  const partesLogo = s.logo.split("&");
  return (
    <div className={card}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><span className="w-2.5 h-2.5 rounded-full bg-green-400" /></div>
        <div className="flex-1 text-center text-[11px] bg-white border rounded-full px-3 py-1 text-gray-500">🔒 suamarca.com.br</div>
      </div>
      <div className="flex gap-1.5 px-4 pt-3 overflow-hidden">
        {SEGMENTOS.map((item, i) => <button key={item.id} onClick={() => setSeg(i)} className={"text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition " + (i === seg ? "bg-black text-white border-black" : "bg-white text-gray-500")}>{item.icon} {item.label}</button>)}
      </div>
      <div className="flex-1 bg-white">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="font-black text-[15px]">{partesLogo[0]}{partesLogo.length > 1 ? <span className={s.accent}>&</span> : null}{partesLogo[1] || ""}</div>
          <div className="hidden sm:flex gap-3 text-[11px] text-gray-500 font-medium"><span>Serviços</span><span>Profissionais</span><span>Avaliações</span></div>
          <div className="text-[11px] font-bold bg-black text-white px-3 py-1.5 rounded-full">Agendar</div>
        </div>
        <div className={"mx-4 rounded-xl bg-gradient-to-br " + s.grad + " text-white p-5 relative overflow-hidden transition-all"}>
          <div className="text-[10px] tracking-widest text-white/80 font-bold">★ 4.9 • 2.300+ CLIENTES</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{s.hero1}<br />{s.hero2}</div>
          <div className="mt-3 flex gap-2"><div className={"text-[11px] font-bold " + s.btn + " px-3 py-1.5 rounded-full"}>Agendar Horário</div><div className="text-[11px] font-bold border border-white/30 px-3 py-1.5 rounded-full">Ver preços</div></div>
          <div className="absolute -right-6 -bottom-8 text-[90px] opacity-20">{s.icon}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {s.serv.map(([ico, nome, preco]) => <div key={nome} className="border rounded-xl p-2.5 text-center"><div className="text-xl">{ico}</div><div className="text-[11px] font-bold mt-1">{nome}</div><div className="text-[11px] text-gray-900 font-bold">{preco}</div></div>)}
        </div>
      </div>
    </div>
  );
}

type Slot = { h: string; nome: string; serv: string; status: "ok" | "free" | "now" };
export function AgendaMockup() {
  const [sel, setSel] = useState(1);
  const slots: Slot[] = [
    { h: "09:00", nome: "Ana Beatriz", serv: "Escova + Hidratação • Camila", status: "ok" },
    { h: "10:30", nome: "João Pedro", serv: "Corte Masculino • Lucas", status: "ok" },
    { h: "11:30", nome: "Horário Livre", serv: "Toque para agendar online", status: "free" },
    { h: "14:00", nome: "Mariana S.", serv: "Limpeza de Pele • Dra. Paula", status: "now" },
    { h: "15:30", nome: "Carlos H.", serv: "Massagem • Rafael", status: "ok" },
  ];
  return (
    <div className={card + " p-4 bg-gray-50"}>
      <div className="flex items-center justify-between"><div><div className="text-[13px] font-extrabold">Agenda de hoje</div><div className="text-[11px] text-gray-500">Terça • 6 profissionais</div></div><div className="flex items-center gap-1.5 text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> TEMPO REAL</div></div>
      <div className="flex gap-1.5 mt-3">{["S","T","Q","Q","S"].map((d,i) => <div key={i} className={"flex-1 text-center text-[11px] py-1.5 rounded-lg font-bold " + (i === 1 ? "bg-black text-white" : "bg-white text-gray-500 border")}>{d}<br />{12+i}</div>)}</div>
      <div className="mt-3 space-y-2 flex-1 overflow-hidden">{slots.map((s,i) => <button type="button" key={i} onClick={() => setSel(i)} className={"w-full text-left flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition " + (sel === i ? "bg-black text-white border-black" : "bg-white") + (s.status === "now" ? " ring-2 ring-violet-400" : "")}><span className={"text-[12px] font-black " + (sel === i ? "text-violet-300" : "text-gray-900")}>{s.h}</span><span className="flex-1"><span className="block text-[12px] font-bold">{s.nome} {s.status === "now" ? "• Agora" : ""}</span><span className={"block text-[11px] " + (sel === i ? "text-white/70" : "text-gray-500")}>{s.serv}</span></span>{s.status === "free" ? <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-1 rounded-full">Livre</span> : <span className={"w-7 h-7 rounded-full flex items-center justify-center text-[12px] " + (sel === i ? "bg-white/20" : "bg-gray-100")}>👤</span>}</button>)}</div>
    </div>
  );
}

export function AutoMockup() {
  const [confirmado, setConfirmado] = useState(false);
  return (
    <div className="w-full h-full flex gap-3 items-stretch justify-center bg-gradient-to-b from-emerald-50 to-gray-100 p-4 rounded-2xl border shadow-2xl overflow-hidden">
      <div className="w-[260px] max-w-full bg-[#0b141a] rounded-[1.8rem] p-1.5 shadow-xl"><div className="bg-[#e7ddd3] rounded-[1.4rem] overflow-hidden flex flex-col h-[380px]">
        <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">✨</div><div className="flex-1"><div className="text-[12px] font-bold leading-none">Espaço Bella 🤖</div><div className="text-[10px] opacity-80">online • responde na hora</div></div></div>
        <div className="flex-1 p-2.5 space-y-2 text-[11px] leading-snug"><div className="bg-white p-2 rounded-lg rounded-tl-none shadow max-w-[90%]">Olá, Mariana! 👋 Aqui é do <b>Espaço Bella</b>. Seu horário amanhã às <b>14:00</b> com a Paula ainda está de pé?</div>
          <div className="flex gap-1.5"><button type="button" onClick={() => setConfirmado(true)} className="flex-1 bg-white rounded-full py-1.5 font-bold text-green-700 shadow border border-green-200">✅ Confirmar</button><button type="button" className="flex-1 bg-white rounded-full py-1.5 font-bold text-gray-600 shadow">Reagendar</button></div>
          {confirmado ? <><div className="bg-[#d9fdd3] p-2 rounded-lg rounded-tr-none shadow ml-auto max-w-[70%]">Confirmado! ✅</div><div className="bg-white p-2 rounded-lg rounded-tl-none shadow max-w-[90%]">Perfeito! 🎉 Te esperamos amanhã. <br /><span className="text-gray-500">Lembrete automático ativado para 2h antes.</span></div></> : <div className="bg-[#fff3cd] border border-amber-200 p-2 rounded-lg text-[10px]">⏰ Aguardando confirmação... <b>reduz 70% das faltas</b></div>}
        </div><div className="p-2"><div className="bg-white rounded-full px-3 py-2 text-[11px] text-gray-400">Mensagem automática...</div></div>
      </div></div>
      <div className="hidden sm:flex flex-col justify-center gap-2 flex-1">{[["🔔","Lembrete 24h","Qualquer serviço"],["📢","Reativação","Cliente sumido"],["⭐","Avaliação Google","Pós-atendimento"]].map(([i,t,sub]) => <div key={t} className="bg-white rounded-xl p-2.5 border flex items-center gap-2"><div className="text-lg">{i}</div><div className="flex-1 text-[11px] font-bold">{t}<div className="font-normal text-gray-500">{sub}</div></div><div className="text-[9px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full">ON</div></div>)}</div>
    </div>
  );
}

export function FinanceiroMockup() {
  return (
    <div className={card + " p-4"}>
      <div className="flex gap-3"><div className="flex-1 bg-zinc-900 text-white rounded-xl p-3"><div className="text-[10px] opacity-60">FATURAMENTO HOJE</div><div className="text-xl font-black">R$ 1.840</div><div className="text-[10px] text-green-400 font-bold">+18% vs ontem ▲</div></div><div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3"><div className="text-[10px] font-bold text-green-700">PIX RECEBIDO ⚡</div><div className="text-[13px] font-black">R$ 120,00</div><div className="text-[10px] text-gray-500">Atend. #042 • Serviços</div></div></div>
      <div className="mt-3 bg-gray-50 border rounded-xl p-3"><div className="flex items-center justify-between mb-2"><div className="text-[11px] font-extrabold">Fluxo de caixa • semana</div><div className="text-[9px] font-bold bg-white border px-2 py-0.5 rounded-full">Por profissional ▼</div></div><div className="flex items-end gap-1.5 h-20">{[40,65,50,80,95,70,100].map((h,i) => <div key={i} className={"flex-1 rounded-t-md " + (i === 4 ? "bg-violet-500" : "bg-black")} style={{height: h + "%"}} />)}</div><div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SAB</span><span>DOM</span></div></div>
      <div className="mt-2 space-y-1.5">{[["Atend. #043 • Ana","R$ 180 • Pix","pago"],["Atend. #044 • Carlos","R$ 90 • Cartão","aberta"]].map(([t,v,s]) => <div key={t} className="flex items-center justify-between text-[11px] bg-white border rounded-lg px-2.5 py-2"><span className="font-bold">{t}</span><span className="text-gray-500">{v}</span><span className={"text-[9px] font-black px-2 py-0.5 rounded-full " + (s === "pago" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{s === "pago" ? "PAGO" : "ABERTA"}</span></div>)}</div>
    </div>
  );
}

type PessoaFila = { nome: string; tempo: string; cor: string; pos: number };
export function FilaMockup() {
  const [fila, setFila] = useState<PessoaFila[]>([
    { nome: "Ana B.", tempo: "Em atendimento", cor: "bg-green-500", pos: 1 },
    { nome: "Carlos", tempo: "~15 min", cor: "bg-amber-400", pos: 2 },
    { nome: "Mariana", tempo: "~30 min", cor: "bg-gray-300", pos: 3 },
  ]);
  return (
    <div className="w-full h-full bg-zinc-950 text-white rounded-2xl p-4 shadow-2xl border border-white/10 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between"><div><div className="text-[10px] tracking-widest text-violet-300 font-black">🔴 AO VIVO • PAINEL E QR CODE</div><div className="text-[15px] font-extrabold">Fila de Espera Automática</div><div className="text-[11px] opacity-60">Salão • Clínica • Barbearia • Studio</div></div><div className="text-center bg-white text-black rounded-xl px-2.5 py-1.5"><div className="text-[9px] font-bold">AGORA</div><div className="text-lg font-black leading-none">03</div></div></div>
      <div className="mt-3 space-y-2 flex-1">{fila.map((f) => <div key={f.pos} className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-xl p-2.5"><div className="w-8 h-8 rounded-full bg-white text-black font-black flex items-center justify-center">{f.pos}</div><div className="flex-1"><div className="text-[13px] font-bold">{f.nome}</div><div className="text-[11px] opacity-60">{f.tempo}</div></div><div className={"w-2.5 h-2.5 rounded-full " + f.cor + " animate-pulse"} /></div>)}</div>
      <button type="button" onClick={() => setFila((prev) => prev.length > 1 ? prev.slice(1).map((p,i) => ({...p,pos:i+1,tempo:i===0 ? "Em atendimento" : "~" + (i*15) + " min"})) : prev)} className="mt-3 w-full bg-white text-black font-extrabold text-[13px] py-2.5 rounded-xl hover:bg-violet-200 transition">Chamar próximo ⏭️ • Sem app, via QR Code</button>
    </div>
  );
}
