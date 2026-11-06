# 04. Memória e contexto: o que o motor lembra, por quanto tempo e com que força

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.

**Legenda:** **[PROVEN]** = verificado no código ou em fonte lida (link e data). **[HIPÓTESE]** = proposta sem evidência
direta. **[RECOMENDAÇÃO]** = decisão de desenho. **[LACUNA]** = não encontrado. Os valores de prazo são propostas; os
prazos que já existem no código são marcados como [PROVEN].

---

## 1. Princípio: estado no banco, memória de modelo só para entendimento

**[RECOMENDAÇÃO]** A memória que importa para agendamento é **estado de negócio**, não uma memória semântica. Ela mora no
Supabase: agenda, cliente, consentimento, pendência e etapa da conversa. Memória externa (Mem0, Zep, Letta) criaria uma
segunda fonte de verdade e aumentaria custo e exposição de dado pessoal fora do banco (ver `07-projetos-open-source.md`).

**[PROVEN]** O repositório já segue esse princípio parcialmente: o estado do agendamento fica em
`conversas_whatsapp.contexto.agenda`, a pendência da IA em `contexto.cerebro.pendente`, e preferências em
`clientes.preferencias` (ver `01-auditoria-atual.md` §6).

**[RECOMENDAÇÃO]** O modelo de linguagem recebe **um resumo do estado** e o turno atual. Ele não é a fonte de fatos.

---

## 2. As cinco camadas de memória

| Camada | O que guarda | Origem | Validade | Pode virar fato? |
|---|---|---|---|---|
| 1. Turno atual | Mensagem juntada, já normalizada (intenção, serviço, dia, hora, profissional) | Mensagens recebidas no turno | Só o turno | Não, até ser confirmado |
| 2. Pendência | Tarefa em andamento com slots preenchidos, etapa e prazo | Estado da conversa | Prazo por etapa (§5) | Não |
| 3. Fato confirmado | Dado que o cliente confirmou explicitamente, com data e origem | Confirmação na conversa, cadastro, ação oficial | Por tipo (§4) | Sim |
| 4. Suposição | Dado inferido (ex.: "provavelmente a mesma profissional") | Padrão ou palpite | Até usar | **Nunca** como confirmado; sempre perguntar |
| 5. Histórico resumido | Resumo de conversas antigas, com datas | Resumo recente gerado a partir de mensagens | Até nova atualização | Só como contexto, não como fato |

**[PROVEN]** Há hoje duas origens de "fato": o que o cliente disse (texto) e o que o sistema gravou (registro). A
regra deve ser: **para agendar, cancelar ou remarcar, só vale o registro**. O texto da conversa serve para entender, não
para executar.

**[RECOMENDAÇÃO]** Cada fato carrega `origem` (cliente disse, equipe gravou, sistema calculou), `obtido_em`
(no fuso do negócio) e `validade`. Isso dá base para a regra de informação velha (§4).

---

## 3. Estado da conversa: um registro, uma versão

**[PROVEN] Problema atual.** Bot, IA e agenda gravam no mesmo campo JSON `contexto`, regravando o objeto inteiro com
a cópia lida no início do turno (`atender.server.ts:44-50`; `fluxo.server.ts:1150-1153`). Não há lock nem versão.
Dois turnos concorrentes podem se sobrescrever (P24, não reproduzido).

**[RECOMENDAÇÃO] Modelo de estado sugerido (sketch, não código a commitar):**

```ts
// Sketch de contrato. Não é código do repositório.
interface EstadoDaConversa {
  conversaId: string;
  tenantId: string;
  versao: number;                 // controle de concorrência otimista
  modo: "automatico" | "sombra" | "humano" | "silencio" | "encerrado";
  humanoAte: string | null;       // ISO, fuso do negócio; expira sozinho
  silencioAte: string | null;     // para pausas que não são humano
  pendencia: PendenciaDeTarefa | null;
  ultimoTurnoId: string;          // id do evento de entrada processado
  atualizadoEm: string;
}

interface PendenciaDeTarefa {
  tipo: "agendar" | "cancelar" | "remarcar" | "escolher_servico" | "esclarecer";
  etapa: string;                  // ex.: "horario", "confirmar"
  slots: Record<string, SlotPreenchido>;
  expiraEm: string;               // prazo por etapa (§5)
  criadaPorTurnoId: string;
}

interface SlotPreenchido {
  valor: unknown;
  origem: "cliente_disse" | "sistema_calculou" | "cadastro";
  confirmado: boolean;
  obtidoEm: string;
}
```

**[RECOMENDAÇÃO]** Atualização com **versão**: a gravação só acontece se `versao` for a mesma lida no começo do turno
(`UPDATE ... WHERE versao = $lida`). Essa é a mesma técnica que o próprio repositório usa para evitar sobrescrita em
horários especiais (`gravarHorarioSemSobrescrever`, citada em `CONTEXTO.md` §9, item 9). Se a condição falha, o turno
relê e tenta de novo, no máximo uma vez.

---

## 4. Fato confirmado versus suposição, e informação velha

### 4.1 Validade por tipo

| Tipo de dado | Validade proposta | Base |
|---|---|---|
| Horário pedido pelo cliente, ainda não confirmado | 15 min sem resposta | [HIPÓTESE] (LongMemEval, "atualização" e "abstenção" são habilidades avaliadas, sem prazo) |
| Pendência de agendamento (etapa `horario` ou `confirmar`) | Hoje **2 h** (`conduzir.ts:88`) | [PROVEN] código |
| Pendência de confirmação da IA | Hoje **15 min** (`brain/guardas.ts:72-76`) | [PROVEN] código |
| Telefone verificado | Até mudança pelo cliente | [HIPÓTESE] |
| Preferência de profissional | Meses, com data e origem | [HIPÓTESE] |
| Pausa de atendimento humano | Configurável; padrão 120 min (`decisao.ts`, `prazoDoHumano`) | [PROVEN] código |
| Consentimento e supressão | Até evento posterior (ledger append-only) | [PROVEN] `0058` |

**[PROVEN] Divergência interna:** a mesma ideia de "pendência" tem prazo de 2 h na agenda e 15 min na IA. Um cliente que
responde "sim" 40 minutos depois encontra comportamentos diferentes conforme o caminho.

**[RECOMENDAÇÃO]** Um prazo único por tipo de pendência, lido de um só lugar (uma tabela de políticas). O prazo curto
(15 min) vale para a oferta de horário, porque o horário pode ser ocupado por outro cliente. A confirmação de dados já
gravados não expira. O estado de "pessoa no controle" é outro caso e tem prazo próprio (§5).

### 4.2 Regras de uso

**[RECOMENDAÇÃO]**

1. **Antes de usar qualquer fato, comparar com a validade.** Se expirou, não usar; perguntar de novo ou consultar o registro.
2. **Antes de dizer "você tem", "você marcou" ou "já está confirmado", consultar o registro.** Nunca a conversa.
3. **Quando o cliente muda algo, a versão nova substitui a antiga** e a antiga vai para o histórico com data. Essa é a
   "atualização de conhecimento" que o LongMemEval avalia ([arXiv:2410.10813](https://arxiv.org/abs/2410.10813),
   [PROVEN] como habilidade, aplicação ao Flow [HIPÓTESE]).
4. **Suposição nunca vira confirmada.** Ex.: "provavelmente é a mesma profissional da última vez" só pode aparecer como
   pergunta: "Quer com a Ana, como da última vez?"
5. **Abstenção é obrigatória.** Sem dado, o motor diz que não tem a informação, não inventa (LongMemEval também avalia isso,
   [PROVEN] como habilidade).

### 4.3 Exemplos

| Caso | Errado | Certo |
|---|---|---|
| Cliente disse "dia 15" há 3 dias | "Confirmo o dia 15 às 10h" | "Você ainda quer o dia 15? Ou prefere outra data?" |
| Preferência salva há 1 ano | "Vou marcar com a Ana, como sempre" | "Da última vez foi com a Ana. Quer com ela de novo?" |
| Agendamento cancelado ontem | "Seu horário de amanhã está garantido" | Consultar o registro; se cancelado, dizer que não há agendamento |
| Telefone diferente do cadastro | Usar o novo sem perguntar | Perguntar se o telefone é o mesmo, antes de gravar em outra ficha |

---

## 5. Pendências, prazos e silêncio

**[PROVEN]** Hoje o Bot tem `VALIDADE_MS` de 2 h para o estado de agendamento; a IA tem 15 min para a pendência; a pausa
humana do Bot tem `modo_humano_ate` com prazo; `modo_humano` do caminho da IA e do lembrete **não tem prazo** (P1).

**[RECOMENDAÇÃO]** Tabela única de políticas de prazo:

| Estado | Prazo | Ao expirar | Quem é avisado |
|---|---|---|---|
| Oferta de horário | 15 min | Liberar a oferta; nada gravado | Ninguém |
| Confirmação de agendamento | 15 min | Liberar; uma retomada curta (cenário 19) | Ninguém, na primeira vez |
| Escolha de serviço | 15 min | Liberar | Ninguém |
| Pessoa no controle, por pedido de humano | Configurável (padrão 120 min) | **Volta a automático** e a conversa resumida fica para a equipe | Equipe, no início |
| Pessoa no controle, por resposta pelo celular | Configurável (padrão 120 min) | Volta a automático | Ninguém |
| Silêncio do cliente | Sem prazo para o cliente; registro após 24 h | Encerrar a pendência; não cancelar nada gravado | Equipe, se havia agendamento |

**[RECOMENDAÇÃO] Silêncio precisa de saída.** A pessoa no controle deve sempre expirar. Hoje, o único "sem prazo" é o de
`modo_humano`, e ele deixa o cliente sem resposta indefinidamente sem interface para desfazer (P1). A correção é
trocar a leitura para prazo, e dar à equipe uma ação explícita para devolver a conversa ao automático.

**[HIPÓTESE]** Após um pedido explícito de humano, a conversa pode ter uma única mensagem automática de confirmação e
depois silêncio até o prazo. Isso evita que o cliente pense que foi ignorado, sem competir com a equipe.

---

## 6. Limites do histórico enviado ao modelo

**[PROVEN]** Hoje a IA recebe os últimos 17 registros, e `pensarCortaiComTurno` usa `historico.slice(-16)`
(`fluxo.server.ts:1094-1101`; `brain/agente.server.ts:358-360`). A janela é fixa, em registros, não em tokens.

**[PROVEN]** Picadas de uma mesma mensagem juntada entram no histórico como turnos separados (P28). A mensagem atual já
traz o texto juntado.

**[PROVEN, em outro domínio]** Lost in the Middle (TACL 2024): a informação no meio de um contexto longo é usada pior, e o
desempenho cai com o tamanho do contexto ([ACL Anthology](https://aclanthology.org/2024.tacl-1.9/)). Avaliado em QA, não em
agendamento.

**[PROVEN, em outro domínio]** Resumo recursivo funciona junto com janelas grandes e recuperação, avaliado em Multi-Session
Chat e Carecall ([arXiv:2308.15022](https://arxiv.org/abs/2308.15022)).

**[RECOMENDAÇÃO]** Montar o contexto do modelo nesta ordem, com tamanho fixo:

1. **Regras do negócio** (estáveis; ficam no início para aproveitar cache de prefixo): serviços, política, tom.
2. **Estado estruturado** da conversa: pendência, slots e status, no fim do bloco de regras.
3. **Resumo recente** do histórico (quando a conversa é longa).
4. **Últimos 4 a 6 turnos literais**, com o turno juntado (sem picadas).
5. **Turno atual.**

**[HIPÓTESE]** Para agendamento, 4 a 6 turnos literais bastam na maior parte dos casos. Clientes recorrentes precisam mais
de resumo e de recuperação por cliente do que de janela longa. **[LACUNA]** Não há avaliação verificada de janela ideal
em WhatsApp.

**[RECOMENDAÇÃO]** Medir, antes de escolher o tamanho, o tamanho real em tokens por turno com o tokenizador de cada
modelo (a Anthropic afirma que a partir do Claude 4.7 o tokenizador gera cerca de 30% mais tokens para o mesmo texto,
[PROVEN] em [platform.claude.com](https://platform.claude.com/docs/en/about-claude/pricing)).

---

## 7. Memória de cliente: preferências e padrões

**[PROVEN]** O Flow já tem `clientes.preferencias` como ficha de preferências privadas. Pelas decisões do repositório
(`AGENTS.md` da raiz), preferências do cliente **nunca** são lidas pela página pública e **só preenchem campos vazios**;
registros da equipe nunca são sobrescritos.

**[RECOMENDAÇÃO]** Três classes de conhecimento sobre o cliente, com regras diferentes:

| Classe | Exemplo | Regra |
|---|---|---|
| Preferência declarada | "prefiro às terças", "pode ser a Ana" | Guardar com data e origem; validade de meses; mostrar como pergunta |
| Padrão comprovado | 5 de 6 atendimentos às terças às 10h | Só com n mínimo e janela declarada; mostrar como sugestão |
| Hipótese | "parece que cancela muito às sextas" | Não usar com o cliente; só como sinal interno para a equipe |

**[HIPÓTESE]** Padrão comprovado exige n mínimo. Poucas visitas (menos de 3 a 5 por cliente) não sustentam um padrão. O
limite exato não foi pesquisado. Para o Flow, a proposta é começar com **n ≥ 5 e janela de 90 dias**, a confirmar.

**[LACUNA]** Não há avaliação verificada de memória de preferências em agendamento, nem literatura de rotulagem de padrões em
sistemas de recomendação.

**[DECISÃO DO DONO]** Quais tipos de padrão o negócio autoriza a Flow IA a usar com o próprio cliente. A finalidade
(ofertar horário, perfilar, marketing) muda a base legal (ver `08-whatsapp-e-provedores.md` §6).

---

## 8. O que nunca entra na memória

**[RECOMENDAÇÃO]**

- Dado sensível (saúde, origem, convicção religiosa, biometria) só com base própria e necessidade demonstrada. Ex.: uma
  observação de saúde numa ficha de cliente exige avaliação antes de ser guardada.
- Conteúdo de áudio e imagem sem permissão. Mídia guardada é dado pessoal, com prazo de retenção definido pelo negócio.
- Texto de instrução do sistema, chaves, ou qualquer dado de outro cliente nas mensagens enviadas ao modelo.
- Ações executadas com base em texto da conversa, sem registro confirmado.

---

## 9. Lacunas e decisões pendentes

- **[LACUNA]** Padrão industrial para expiração de horário oferecido em conversa: não encontrado.
- **[LACUNA]** Taxa de erro de memória e de abstenção em agendamento: não medida.
- **[LACUNA]** Se `modo_humano_ate` (migração 0055) está aplicada no `cortai-prod` hoje. Conferir antes de depender dele.
- **[DECISÃO DO DONO]** Prazo padrão de pessoa no controle e se, depois do prazo, a IA deve retomar com resumo para a equipe.
- **[DECISÃO DO DONO]** Retenção de áudio e imagem recebidos pelo WhatsApp.
