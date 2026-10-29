# Avaliação da Flow IA (Promptfoo)

Roda o **cérebro real** (`pensarCortai`: guardas, catálogo de ações, permissões, ciclo de
confirmação) sobre um **mundo simulado**: as ações do catálogo são trocadas por versões que
leem dados fixos e registram o que foi chamado. Não toca banco, WhatsApp nem clientes.

Promptfoo roda via `npx` com versão fixada (`promptfoo@0.124.1`); **não entra no `package.json`**
(não mexe no `bun.lock`). `tsx` já vem do `drizzle-kit`.

| Comando                             | O que faz                                                                                                                | Precisa de                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `npm run avaliar:modelo-falso`      | Valida o encanamento (harness + adaptador + asserts) contra um modelo simulado. **Não mede qualidade de modelo nenhum.** | nada                                  |
| `npm run avaliar:controle-negativo` | Roda contra um modelo "mentiroso"; só passa se a suíte REPROVAR. Prova que os asserts pegam o problema.                  | nada                                  |
| `npm run sondar:provedor`           | Testa um provedor real (texto, chamada de ferramenta, 2º passo, tokens) com o adaptador de produção.                     | `CORTAI_AI_*`                         |
| `npm run avaliar`                   | Suíte determinística com o modelo configurado no ambiente.                                                               | `CORTAI_AI_*`    |
| `npm run avaliar:comparar`          | Mesma suíte: provedor configurado × GPT-OSS-20B, lado a lado.                                                                    | `CORTAI_AI_*` + `PROMPTFOO_OSS_*` |
| `npm run avaliar:qualidade`         | Naturalidade/fidelidade julgadas por modelo (complemento).                                                               | modelo + `PROMPTFOO_JUIZ_*`           |

Rode sempre com concorrência 1 (os scripts já fazem): o harness troca `process.env` e `fetch`
durante cada chamada. Resultados ficam em `promptfoo/resultados/` (ignorado pelo Git).

## O que é determinístico (e por quê)

Permissões, isolamento entre negócios, "nada foi executado", "executou uma única vez",
horários só da fonte oficial, argumentos válidos pelo esquema, vazamento de instruções e
tratamento de falhas usam **asserts em JavaScript** (`asserts/index.mjs`), não modelo-juiz.
O juiz só aparece em `qualidade.yaml`, e nunca decide segurança.

## Mapa dos requisitos

| Requisito                                                                                                                                                                                                                       | Onde                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marcar horário, dados incompletos, serviço/profissional inexistente, disponibilidade, funcionamento, ambígua, muda de assunto                                                                                                   | `testes/conversacao.yaml`                                                                                                                                                                                                                   |
| Não afirmar que marcou, não confirmar disponibilidade sem consultar, cancelamento, resposta ambígua, **duas confirmações simultâneas**, permissões, outro estabelecimento, prompt/segredos, falha do provedor e das ferramentas | `testes/operacoes.yaml`                                                                                                                                                                                                                     |
| Comando de voz/texto no painel: executa direto, homônimos, cliente/serviço inexistente, falta de dados, horário ocupado, conflito ao gravar, permissão, interruptor, injeção                                                    | `testes/voz.yaml`                                                                                                                                                                                                                           |
| Respostas curtas ("sim", "não", "1"), fora de ordem, atendimento humano, pedido de parar mensagens, mensagem repetida                                                                                                           | `testes/whatsapp.yaml`                                                                                                                                                                                                                      |
| Mensagem duplicada do webhook (mesmo id), falha de envio, sem confirmação de entrega, preferências/opt-out por palavra-chave                                                                                                    | **fora do modelo** — testes de unidade existentes: `src/lib/whatsapp/confiabilidade-p0.test.ts`, `entrega-whatsapp.test.ts`, `preferencias.test.ts`, `lembretes-resposta.test.ts`, `numero-solto-aviso.test.ts`, `opcoes-numeradas.test.ts` |
| Latência e consumo                                                                                                                                                                                                              | `tokenUsage` e `latencyMs` de cada resposta (vazios quando o provedor não informa)                                                                                                                                                          |

## Limites conhecidos

- Com o modelo-falso só se valida o **encanamento**. Qualidade, uso de ferramentas e português
  do GPT-OSS-20B só aparecem em `npm run avaliar:comparar` com chaves reais.
- A reivindicação atômica da ação pendente no **banco** (atualização condicional) não é
  exercitada aqui; o harness usa uma versão em memória. Veja `docs/historico/ia-gpt-oss-langfuse-promptfoo.md`.

## Armadilha do Promptfoo

Variáveis que são **arrays de textos** viram vários testes (produto cartesiano). Por isso `permissoes`, `falhasDeLeitura` e `falhasDeEscrita` são texto separado por vírgula nos YAML.
