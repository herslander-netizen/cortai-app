# Base de conhecimento do Flow Core

## Objetivo

Alimentar o Flow Core com regras e respostas úteis sem transformar o atendimento em um conjunto de textos repetidos. A base deve guardar apenas conhecimento reutilizável:

- regra operacional;
- pergunta frequente;
- resposta de conversa;
- procedimento do negócio;
- proteção ou limite de segurança.

Dados que mudam diariamente — agenda, disponibilidade, fila, clientes, preços e status do WhatsApp — continuam vindo das ações oficiais do backend. Não devem ser copiados para a base textual.

## Formato de uma entrada

Cada item contém:

- categoria;
- gatilhos ou formas de pedir;
- resposta canônica;
- ação oficial opcional;
- prioridade;
- origem;
- ativo/inativo.

Exemplo:

```json
{
  "categoria": "operacao",
  "gatilhos": ["qual é meu próximo cliente", "quem atendo agora"],
  "resposta": "Vou consultar seu próximo atendimento na agenda.",
  "acao": "minha_agenda",
  "prioridade": 10
}
```

## Compactação

Antes de salvar ou publicar uma entrada:

1. remove acentos, caixa alta, pontuação e espaços duplicados;
2. ordena e deduplica os gatilhos;
3. cria uma chave com categoria, ação, gatilhos e resposta;
4. descarta a entrada se a chave já existir;
5. mantém a primeira regra aprovada em caso de empate;
6. ordena o resultado por prioridade.

A implementação pura fica em `src/lib/brain/base-conhecimento.ts`. Ela pode ser usada em importadores, seeds, testes e futuramente em uma tabela por negócio, sem criar uma fonte paralela para agenda ou pagamentos.

## Regra de ouro

A base explica e roteia. O banco confirma.

O Flow Core nunca deve responder com um horário, preço, cliente, pagamento ou envio apenas porque isso apareceu em um texto salvo. Nesses casos, ele chama a ação oficial, verifica o resultado e só então responde.

## Alimentação recomendada

Novas entradas devem nascer de:

- perguntas reais dos profissionais;
- mensagens que ficaram sem resposta;
- erros de entendimento observados nos logs;
- textos aprovados pelo responsável do negócio;
- procedimentos comuns entre vários segmentos.

Mensagens quase iguais devem compartilhar uma entrada canônica. Se a diferença mudar a ação, a permissão, o público ou a condição, elas são regras distintas e não devem ser fundidas.

## Estado atual

A primeira camada já está conectada ao modo básico do agente para conversas sociais e consultas operacionais. A próxima integração pode ler esta base por tenant e oferecer uma tela de revisão com:

- novas sugestões;
- duplicatas descartadas;
- regras conflitantes;
- origem e data;
- ativação por negócio;
- teste da frase antes de publicar.
