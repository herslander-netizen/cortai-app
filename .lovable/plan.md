# Correções confirmadas de exclusão, segurança e agenda

## 1. Diálogo de exclusão
- Usar a confirmação em portal acima do diálogo do negócio, como folha inferior no celular e janela centralizada no computador.
- Preservar a caixa de confirmação, o retorno de foco e as regras atuais de exclusão.
- Revisar largura, rolagem e separação das seções do detalhe do negócio.

## 2. P0 — segurança e integridade
- Fazer o servidor aceitar o “Desfazer” somente por 5 segundos e de forma atômica, validando a transição anterior e impedindo conflito entre aparelhos.
- Aplicar as permissões existentes às mutações de estado, fila e atendimento; manter autenticação e isolamento por negócio.
- Corrigir somente mutações privilegiadas confirmadas como insuficientemente autorizadas nas áreas prioritárias.
- Preservar `search_path` seguro nas funções de banco tocadas.
- Não alterar os índices de WhatsApp nesta etapa: apesar de haver sobreposição no histórico de migrações, confirmar primeiro o estado real do banco e não fazer mudança sem necessidade operacional comprovada.

## 3. P1 — desempenho sem mudar comportamento
- Agrupar eventos próximos do Realtime para evitar sequências de recarregamentos, mantendo polling de 15 segundos e respostas otimistas.
- Fazer o próximo horário livre reutilizar funcionamento, intervalo, fuso e estados reais já usados pelo motor de disponibilidade.
- Corrigir o início do mês pelo fuso do negócio e melhorar o casamento de avisos da fila sem mudar os totais esperados.

## 4. Validação
- Testar o diálogo no admin em 1280 px e 390 px e conferir os outros pontos de exclusão.
- Executar testes direcionados, todos os testes disponíveis, lint e verificação de tipos.
- Conferir as funções e restrições de banco alteradas; não publicar.
