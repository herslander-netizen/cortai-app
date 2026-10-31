// Copiado de flow-bot@eebd25a por scripts/sincronizar-flow-bot.sh. Não edite aqui: altere no flow-bot e sincronize.
export {
  casarCuringa,
  corresponder,
  similaridade,
  type ResultadoDaCorrespondencia,
} from "./correspondencia";
export { processar, TETO_ABSOLUTO_DE_PASSOS } from "./motor";
export { normalizar } from "./normalizar";
export { compilar, FluxoInvalido, type NoDoPlano, type Plano } from "./plano";
export {
  novaSessao,
  type Acao,
  type Contato,
  type Evento,
  type Passo,
  type Resultado,
  type Sessao,
  type StatusDaSessao,
  type Valor,
} from "./sessao";
export {
  ArquivoDeCenarios,
  Cenario,
  simular,
  type PassoSimulado,
  type RelatorioDoCenario,
} from "./simulador";
export { escolherPorPeso, sorteioComSemente, type Sorteio } from "./sorteio";
export { preencher, valorDaVariavel } from "./variaveis";
