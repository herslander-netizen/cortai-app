import { responderConversa } from "@/lib/whatsapp/atendimento.server";
import { CONFIGURACAO_PADRAO, type ContextoDaConversa } from "@/lib/whatsapp/contrato";

const TENANT = process.env["TENANT_TESTE"]!;
const TELEFONE = "5511999000111";

type Turno = { autor: "cliente" | "atendente"; texto: string };

async function conversa(nome: string, falas: string[], telefone = TELEFONE) {
  const historico: Turno[] = [];
  let contexto: ContextoDaConversa = {};
  console.log(`\n=== ${nome} ===`);
  for (const fala of falas) {
    historico.push({ autor: "cliente", texto: fala });
    console.log(`CLIENTE: ${fala}`);
    const r = await responderConversa({
      ctx: { tenantId: TENANT, externalAgentId: "teste" },
      conversaId: crypto.randomUUID(),
      telefone,
      nomeDaBarbearia: "M.A Barbearia",
      nomeDoAgente: "CortAI",
      config: CONFIGURACAO_PADRAO,
      historico,
      contexto,
      perfil: null,
      houveAtendimentoHumano: false,
    });
    if (!r) { console.log("CORTAI: (sem resposta)"); break; }
    contexto = r.contexto;
    historico.push({ autor: "atendente", texto: r.texto });
    console.log(`CORTAI [${r.intencao ?? "-"}]${r.pedirHumano ? " [HUMANO]" : ""}: ${r.texto}`);
    console.log(`  contexto: ${JSON.stringify({ servico: contexto.servicoNome, prof: contexto.profissionalNome, dia: contexto.dia, opcoes: contexto.opcoes?.map((o) => o.rotulo) })}`);
  }
}

const qual = process.argv[2] ?? "1";
if (qual === "1") {
  await conversa("T1 preço", ["Oi, quanto fica corte e barba?"]);
  await conversa("T2 horário", ["Vocês abrem sábado que horas?"]);
  await conversa("T3 disponibilidade", ["Tem vaga amanhã depois das seis?"]);
} else if (qual === "2") {
  await conversa("T5 'o primeiro' + agendamento", [
    "Oi, queria cortar amanhã depois das seis.",
    "O primeiro.",
    "Meu nome é Cliente de Teste, pode marcar.",
  ]);
} else if (qual === "3") {
  await conversa("T8 fora do roteiro", ["Vocês vendem pomada modeladora? E tem estacionamento?"]);
  await conversa("T15 atendente", ["Quero falar com uma pessoa de verdade"]);
}
