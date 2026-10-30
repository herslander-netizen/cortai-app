# Respostas da Flow IA — Fase 1 (especificação)

**Data:** 30/10/2026 · **Autor:** Claude · **Estado:** especificação para aprovação. Nada implementado, nenhuma
migração criada nem aplicada.
**Base:** `docs/motor-automacao-diagnostico.md` (Fase 0).

## 1. Decisão do dono (30/10/2026)

O plano do dono:
1. Criar um sistema de respostas parecido com o AutoResponder.
2. Alimentá-lo e configurá-lo por negócio.
3. Com isso, a Flow IA passa a ter um comportamento independente.

**Como isso cabe nas regras do projeto:**
- **Não é uma segunda IA.** O motor é a camada determinística da própria Flow IA, no mesmo caminho de entrada e com a mesma persona.
- **A camada de modelo de linguagem continua opcional.** A IA de linguagem (`pensarCortai`) segue sendo o único "cérebro" que usa modelo.
- **"Independente"** quer dizer que a Flow IA responde pelo que o negócio configurou mesmo quando não há modelo de linguagem: provedor desligado, sem crédito, cota esgotada ou canal não liberado.
  - Hoje, nesses casos, a mensagem livre cai na orientação fixa (`fluxo.server.ts`, após `responderComCerebro` devolver `false`).
  - Evidência: `iaDisponivel("whatsapp")` em `responderComCerebro`. Sem `whatsapp` em `CORTAI_AI_CANAIS`, a IA de linguagem não atende o WhatsApp.
- **Regra "não SAC/FAQ" do `CLAUDE.md`:** passa a ter a exceção decidida pelo dono. São respostas configuradas pelo próprio negócio, sobre o próprio negócio, sempre com porteiro, ritmo e janela de 24 h.

## 2. Camadas de resposta (ordem de decisão)

Para cada mensagem de texto recebida, depois dos passos que já existem em `processarMensagemRecebida` (dedupe, códigos, número compartilhado, resposta a lembrete, canal de notificações):

| # | Camada | Fonte | Sai por |
|---|---|---|---|
| L1 | **Regras do negócio** (o "responder") | `regras_de_resposta` | texto configurado, ou "chamar a equipe", ou "não responder", ou "passar para a IA" |
| L2 | **Conhecimento do negócio** (o "alimentar") | dados oficiais (serviços e preços do catálogo, horário, endereço, formas de pagamento) + respostas cadastradas como conhecimento | resposta montada com variáveis seguras |
| L3 | **IA de linguagem** | `pensarCortai` (existente), recebendo as regras e o conhecimento relevantes como fatos | resposta da IA, com as guardas atuais |
| L4 | **Orientação fixa** | comportamento atual | igual a hoje |

**Regras da ordem:**
- A primeira camada que decidir encerra o processamento.
- Uma regra pode mandar seguir adiante (ação "passar para a IA").
- Quando L3 está indisponível, L1 e L2 continuam respondendo. É isso que torna a Flow IA independente.

## 3. Contrato de uma regra

```ts
type RegraDeResposta = {
  id: string;
  tenantId: string;
  nome: string;                 // só para o painel
  ativa: boolean;
  prioridade: number;           // menor = avaliada antes
  tipo: "regra" | "conhecimento"; // conhecimento também alimenta a IA (L3)
  gatilho: {
    modo: "exato" | "contem" | "similar" | "padrao";
    termos: string[];           // 1..20 frases ou palavras; "padrao" = 1 expressão
    todasAsPalavras?: boolean;  // "contem": todas ou qualquer uma
    limiar?: number;            // "similar": 0,5–0,95 (padrão 0,75)
    excecoes?: string[];        // se casar, a regra não vale
  };
  escopo: {
    publico: "todos" | "clientes_conhecidos" | "contatos_novos";
    horario: "sempre" | "aberto" | "fechado"; // no fuso do negócio (horarioDoDia)
    somenteNoSubfluxo?: string | null;        // id da regra-mãe
  };
  acao:
    | { tipo: "responder"; partes: string[]; aleatoria?: boolean } // 1..3 partes; aleatória = uma das variações
    | { tipo: "chamar_equipe"; texto?: string }   // marca modo_humano e avisa no sininho
    | { tipo: "nao_responder" }                    // equivalente ao "###"
    | { tipo: "passar_para_ia"; dica?: string };   // segue para L3 com a regra como fato
  ritmo: {
    atrasoSegundos?: [number, number];  // 0–60, sorteado no intervalo
    pausaPorContato?: { tipo: "minutos" | "mensagens"; valor: number } | null;
  };
  subfluxo?: { expiraEmMinutos: number } | null; // ativa sub-regras por um tempo
};
```

**Limites validados no servidor** (zod e um `CHECK` no banco):
- até 200 regras por negócio;
- até 20 termos por regra, cada termo com até 120 caracteres;
- até 3 partes por resposta, cada parte com até 1000 caracteres;
- padrão (RegEx) com até 200 caracteres.

**Padrões (`modo = "padrao"`):** subconjunto seguro de RegEx.
- Proibidos: referências de volta, `lookbehind`, e quantificador sobre grupo que já tem quantificador (o caso clássico de ReDoS).
- Validado ao salvar, avaliado sobre no máximo 500 caracteres da mensagem, sempre com flag `u` e sem `g`.

**Similaridade:** coeficiente de Dice sobre bigramas do texto normalizado. É determinístico e sem dependência externa; vale só para mensagens de até 120 caracteres.

**Normalização:** a mesma do entendimento atual (`lib/conversa/entender.ts` e `whatsapp/motor/`). Tira acentos e caixa, junta espaços e remove emojis e pontuação nas pontas.

## 4. Conhecimento (o "alimentar")

1. **Automático, sem cadastro:** fatos derivados dos dados oficiais.
   - **Serviços e preços:** catálogo.
   - **Horário:** horário da semana, horário especial e fechamentos.
   - **Endereço, formas de pagamento e link de agendar:** cadastro do negócio.
   - Gatilhos padrão (endereço, horário, preço, pagamento) que o negócio pode desligar. Reaproveitam `SITUACOES.localizacao` e `pagamento` de `conversa-padrao.ts`.
2. **Cadastrado:** regras do tipo `conhecimento`, com perguntas de exemplo e a resposta do negócio. Valem em L1 e L2 (casamento determinístico) e também entram como fatos em L3.
3. **Para L3:** recebe só as entradas de conhecimento que casaram com a mensagem (no máximo 5), nunca a base inteira, para controlar custo e privacidade.

## 5. Ciclo de vida de uma execução

```
recebida ─► avaliada ─┬─► ignorada (motivo: sem regra | escopo | pausa | opt-out | modo humano)
                      ├─► simulada (modo simulação: decide e registra, não envia)
                      └─► agendada ─┬─► enviada
                                    ├─► cancelada (nova mensagem do contato com "cancelar pendentes", modo humano, opt-out)
                                    └─► falhou (registro em falhas-envio; nunca bloqueia a operação)
```

**Persistência e envio:**
- A execução é gravada antes do envio, com chave única (`mensagem_id`, `regra_id`).
- O envio conhece o status e confere de novo, imediatamente antes de sair: cancelamento, porteiro e formato da janela de 24 h.

**Atraso:**
- `atrasoSegundos` entre 0 e 60, executado em segundo plano (`emSegundoPlano`).
- A execução fica gravada como "agendada", com `enviar_em`. Se a instância cair, a varredura de 15 min (`/api/public/whatsapp/automacoes`) envia ou cancela, conforme a validade. Ela descarta o que passou de 10 min, para não responder fora de contexto.

**Concorrência:**
- O subfluxo e a pausa ficam em `conversas_whatsapp.contexto`, com atualização condicional (versão).
- Duas mensagens seguidas do mesmo contato não avançam o subfluxo duas vezes; a perdedora reavalia.

**Anti-loop:**
- `fromMe` já é ignorado na entrada.
- Teto de 20 respostas automáticas por contato por hora e de `TETO_POR_HORA` (`ritmo.ts`) por negócio por hora.
- Uma regra nunca responde ao próprio texto que enviou: o hash das últimas 3 saídas da conversa é conferido.

## 6. Modelo de dados (rascunho — vira migração 0055 só como arquivo, após aprovação)

```sql
CREATE TABLE IF NOT EXISTS public.regras_de_resposta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 80),
  ativa boolean NOT NULL DEFAULT true,
  prioridade integer NOT NULL DEFAULT 100,
  tipo text NOT NULL DEFAULT 'regra' CHECK (tipo IN ('regra','conhecimento')),
  regra_mae_id uuid REFERENCES public.regras_de_resposta(id) ON DELETE SET NULL,
  gatilho jsonb NOT NULL,
  escopo jsonb NOT NULL DEFAULT '{}'::jsonb,
  acao jsonb NOT NULL,
  ritmo jsonb NOT NULL DEFAULT '{}'::jsonb,
  subfluxo jsonb,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(gatilho::text) <= 8000 AND octet_length(acao::text) <= 8000)
);
CREATE INDEX ON public.regras_de_resposta (tenant_id, ativa, prioridade);

CREATE TABLE IF NOT EXISTS public.execucoes_de_regra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid REFERENCES public.conversas_whatsapp(id) ON DELETE SET NULL,
  mensagem_id uuid,                -- mensagens_whatsapp.id da entrada
  regra_id uuid REFERENCES public.regras_de_resposta(id) ON DELETE SET NULL,
  camada text NOT NULL CHECK (camada IN ('regra','conhecimento','ia','fixa','nenhuma')),
  status text NOT NULL CHECK (status IN ('avaliada','ignorada','simulada','agendada','enviada','cancelada','falhou')),
  motivo text NOT NULL,            -- código curto: 'casou_exato', 'pausa_contato', 'fora_do_horario'…
  trecho text,                     -- até 80 caracteres da mensagem, telefone nunca
  enviar_em timestamptz,
  envio_id uuid,                   -- envios_de_whatsapp.id
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (mensagem_id, regra_id)
);
CREATE INDEX ON public.execucoes_de_regra (tenant_id, criado_em DESC);
CREATE INDEX ON public.execucoes_de_regra (status, enviar_em) WHERE status = 'agendada';
```

**RLS:**
- Leitura para membros do negócio.
- Escrita em `regras_de_resposta` só com `configurar_automacoes` (a mesma permissão de `automacoes_de_ia`).
- `execucoes_de_regra` só é escrita pelo servidor (cliente de serviço).

**Interruptor por negócio:**
- `config_atendimento_ia.regras_modo` com os valores `desligado | simulacao | ativo`, padrão `desligado`.
- É uma coluna nova, só de acréscimo.

**Retenção:**
- `execucoes_de_regra` com mais de 90 dias vira só contagem diária.
- A limpeza só começa com autorização (a regra do projeto proíbe DELETE sem autorização). Até lá, o volume é baixo e indexado.

## 7. Variáveis seguras (sintaxe `{{}}` já usada em `conversa-padrao.ts`)

**Liberadas:**
- `{{nome}}` e `{{primeiro_nome}}` (do próprio contato);
- `{{negocio}}`, `{{endereco}}`;
- `{{horario_hoje}}`, `{{proximo_horario_livre}}`;
- `{{servicos}}` (até 8 itens com preço);
- `{{formas_pagamento}}`, `{{link_agendar}}`;
- `{{meu_proximo_horario}}` (só o do próprio telefone).

**Comportamento:**
- Variável sem valor remove a frase inteira que a contém, nunca deixa `{{...}}` na mensagem.
- Nunca há dados de outro cliente nem dados internos.

## 8. Ameaças e mitigação

| Ameaça | Mitigação |
|---|---|
| Vazamento entre negócios | `tenant_id` sempre da conexão; RLS; testes de isolamento em leitura, gravação, execução e simulador |
| ReDoS | Subconjunto seguro de RegEx validado ao salvar; mensagem cortada em 500 caracteres |
| Loop ou rajada | `fromMe`; tetos por contato e por negócio; hash das últimas saídas; `ritmo.ts` |
| Banimento do número (Evolution) | Atraso mínimo de 1 s entre partes; tetos; sem curinga "responder tudo" no modo ativo sem aviso |
| Spam de marketing | Só resposta a mensagem recebida (dentro da janela de 24 h); o motor nunca inicia conversa |
| Opt-out ignorado | Porteiro conferido na avaliação e de novo no envio |
| Dados sensíveis em log | `trecho` limitado e sem telefone; mensagem completa só em `mensagens_whatsapp` (já existe) |
| IA dizendo o que não fez | Guardas atuais (`barrarAfirmacaoSemAcao`); o motor nunca confirma agendamento: só responde texto ou passa para a IA |

## 9. Critérios de aceite da implementação

1. Com `regras_modo = desligado`, o comportamento é idêntico ao de hoje: os testes atuais passam e há um teste de não regressão.
2. Em `simulacao`, decide e registra e nunca chama o gateway: há um teste com mock que falha se for chamado.
3. Em `ativo`, responde só pelas camadas descritas e sempre com porteiro, ritmo e janela de 24 h.
4. Simulador no painel: "testar mensagem" mostra a regra escolhida, o motivo e a resposta montada, sem enviar.
5. Histórico por regra: quantas vezes casou, respondeu, foi ignorada e por quê.
6. Sem IA de linguagem disponível, as regras e o conhecimento continuam respondendo.

## 10. Plano da Fase 2 em diante (commits pequenos)

1. `src/lib/whatsapp/regras/` — puro:
   - `normalizar` (reuso), `casar` (exato, contém, similar, padrão seguro), `avaliar` (prioridade, escopo, exceções, pausa, subfluxo) e `montar` (variáveis seguras).
   - Com testes. Sem banco nem envio.
2. Migração 0055 como arquivo, ensaiada no banco local descartável. Aplicar no banco real só com autorização.
3. Funções do servidor (listar, salvar, reordenar, desligar, simular) com zod e RLS; testes de isolamento.
4. Ligar L1 e L2 em `processarMensagemRecebida`, antes de `responderComCerebro`, em modo simulação.
5. Envio real com atraso e cancelamento, ativado por negócio (primeiro um negócio de teste).
6. L2 → L3: passar o conhecimento casado como fatos para `pensarCortai`, sem mudar o contrato do cérebro além de um campo opcional.
7. Telas (etapa separada, padrão Figaro): lista de regras, editor, conhecimento, simulador, histórico.

## 11. O que ainda depende do dono

- **Mensagem livre do cliente:** o código manda para a Flow IA e o `CLAUDE.md` diz Flow Chat. A especificação segue o código; falta confirmar para corrigir o `CLAUDE.md`.
- **Plano comercial:** em quais planos o recurso entra.
- **Autorização da migração 0055:** quando chegar a hora, aplicar no banco real só com autorização.
