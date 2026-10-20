# Ambiente independente de desenvolvimento

## Fluxo de trabalho

1. Faça alterações apenas na branch `cloudflare-workers-migration-2026-10-13` ou em branches de trabalho derivadas.
2. O workflow `Validate Cortaí` executa TypeScript, testes e build.
3. Quando o workflow passa, o diretório de build é salvo como artefato `cortai-build-<SHA>` por 30 dias. Baixe o artefato na página da execução em GitHub Actions.
4. Para preservar uma versão por mais tempo, use uma release/tag ou baixe o artefato e guarde-o em armazenamento próprio; artefatos de Actions expiram conforme a retenção.

## Preview Cloudflare isolado

O workflow `Deploy isolated preview` é manual e só aceita a branch de reconstrução. Ele exige digitar `PREVIEW` como confirmação e publica somente o Worker `cortai-reconstruction-test-2026`, nunca o domínio de produção.

Antes de executar, configure no repositório GitHub, em **Settings → Secrets and variables → Actions**, os secrets:
- `CLOUDFLARE_API_TOKEN`: token Cloudflare com permissões mínimas necessárias para Workers Scripts no escopo da conta de testes.
- `CLOUDFLARE_ACCOUNT_ID`: ID da conta Cloudflare de testes.

O workflow manual não deve ser executado antes de conferir esses secrets e confirmar que a conta e o Worker de destino são os corretos. Ele não altera DNS nem usa `cortai.dev`.

## Backend

O banco Supabase `cortai-prod` da reconstrução continua sem migrations aplicadas. Não conecte o preview ao projeto `evolution-crm`. Antes de habilitar fluxos reais, revisar e aprovar o plano de migrations, RLS, autenticação e variáveis de ambiente.

## Retorno de versão

- O histórico Git registra o código por commit.
- O artefato registra o build gerado para um commit específico.
- Para voltar a uma versão, identifique o commit validado e reverta ou faça checkout numa branch separada; não reescreva `main` para fazer rollback.
- Deploys Cloudflare têm histórico de versões, mas o rollback de Worker não reverte mudanças no banco. Banco e código precisam de planos de retorno separados.

## Limites atuais

Este fluxo entrega validação, build arquivada e publicação manual isolada. Ainda não é um editor visual/IA como Lovable; previews automáticos por pull request e testes end-to-end no navegador são etapas futuras.
