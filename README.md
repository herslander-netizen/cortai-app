# Cortaí

Plataforma de gestão para negócios de beleza, com agenda, serviços, profissionais, clientes, pagamentos, notificações e assistente CortAI.

Esta branch contém o trabalho isolado de reconstrução e desacoplamento de serviços externos. Ela não representa um deploy de produção.

## Stack

- TanStack Start, React e TypeScript
- Tailwind CSS e componentes Radix
- Supabase (Auth, Postgres e Storage)
- Cloudflare Workers / Vite
- Vitest para testes

## Desenvolvimento local

Use Bun na versão compatível com o lockfile deste branch.

```sh
bun install
bun run dev
```

## Validação

```sh
bunx tsc --noEmit -p .
bunx vitest run
bunx vite build --outDir /tmp/cortai-build
```

Os comandos exatos de validação automatizada estão definidos em `.github/workflows/validate.yml`.

## Segurança da migração

- Não use o domínio de produção para testes.
- Não mescle esta branch em `main` nem faça deploy sem autorização específica.
- Não aplique migrações a bancos reais nesta etapa.
- Não adicione chaves ou segredos ao repositório; configure-os apenas no ambiente de execução.
- Consulte `docs/PLANO_DESACOPLAMENTO_LOVABLE.md` para o estado das dependências e as validações pendentes.

## MCP

A rota `/mcp` oferece ferramentas de leitura para listar serviços e agendamentos do negócio autenticado. A compatibilidade ponta a ponta com um cliente MCP real e o fluxo OAuth ainda precisam ser verificados antes de uso externo.
