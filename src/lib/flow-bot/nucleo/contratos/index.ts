// Copiado de flow-bot@eebd25a por scripts/sincronizar-flow-bot.sh. Não edite aqui: altere no flow-bot e sincronize.
export {
  CATALOGO,
  ConfigDeCorrespondencia,
  ModoDeCorrespondencia,
  TIPOS_DE_NO,
  ehTipoConhecido,
  portasDoNo,
  type ConfigDe,
  type Correspondencia,
  type EspecDeNo,
  type Porta,
  type TipoDeNo,
} from "./catalog";
export {
  Aresta,
  DeclaracaoDeVariavel,
  DocumentoDeFluxo,
  No,
  PadroesDoFluxo,
  SCHEMA_VERSION,
} from "./flow";
export {
  NomeDeRealidade,
  PerfilDeRealidade,
  realidadeDeExemplo,
  TipoDeFato,
  type Realidade,
  type ValorDeFato,
} from "./realidade";
export {
  problemaDoPadrao,
  TAMANHO_MAXIMO_DO_PADRAO,
  type ProblemaDoPadrao,
} from "./regex-segura";
export {
  VARIAVEIS_DO_SISTEMA,
  ehVariavelDoSistema,
  nomeDeVariavelValido,
  placeholdersDoTexto,
} from "./variables";
export {
  validarFluxo,
  type CodigoDoProblema,
  type OpcoesDaValidacao,
  type Problema,
  type ResultadoDaValidacao,
} from "./validate";
