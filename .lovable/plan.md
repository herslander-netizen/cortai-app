# Painel administrativo da conta Asaas

## Objetivo
Adicionar ao `/admin` uma área exclusiva para configurar, testar e remover manualmente a chave de API do Asaas, sem expor o segredo e sem alterar cobrança, assinaturas ou finanças dos negócios.

## Implementação
- Criar a aba **Conta Asaas** no menu administrativo, responsiva e coerente com o visual atual.
- Criar funções protegidas pelo mesmo controle de administrador da plataforma já usado no painel para:
  - consultar apenas se a chave está configurada e seu ambiente;
  - validar o prefixo e salvar/substituir a chave;
  - testar no servidor a chave armazenada com `GET /myAccount`;
  - remover somente `asaas_api_key` de `chaves_internas`, após confirmação.
- Reutilizar `salvarChaveInterna`, `chaveDoAsaas`, `ambienteDaChave` e `asaas`; acrescentar apenas o helper mínimo de remoção na mesma infraestrutura.
- Usar campo de senha não controlado, limpo após o envio. A chave salva nunca será devolvida, reapresentada ou registrada.
- Mostrar somente **Configurada/Não configurada**, **Produção/Sandbox** e mensagens seguras do teste.
- Usar confirmação destrutiva antes da remoção e botões com alvos adequados para celular.

## Segurança e escopo
- Nenhum endpoint público, log da chave, alteração de webhook, schema novo ou tabela paralela.
- A variável `ASAAS_API_KEY` do ambiente não será modificada nem removida.
- Nenhuma mudança nos fluxos financeiros atuais, Cortay Pay, subcontas, split, checkout ou recebimentos.

## Validação
- Testes das regras de ambiente, retorno mascarado, rejeição de chave inválida e operações administrativas.
- Typecheck, lint dos arquivos alterados, testes relevantes e build da prévia.
- Nada será publicado.
