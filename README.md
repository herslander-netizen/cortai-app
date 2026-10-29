# Flow

Plataforma de gestão para negócios de beleza, com agenda, serviços, profissionais, clientes, pagamentos, notificações e assistente Flow IA.

- Código: branch `cloudflare-workers-migration-2026-10-13` (a `main` é só arquivo do período antigo).
- Prévia: https://previa.cortaiapp.pages.dev (a cada envio). Site principal: https://cortaiapp.pages.dev (pelo "Lançar versão").
- Banco, login e arquivos: Supabase `cortai-prod`.
- Regras para quem trabalha no projeto (pessoas e IAs): `AGENTS.md`, `CLAUDE.md`, `MUSE.md` e `DIARIO.md`.

## Stack

- TanStack Start, React e TypeScript
- Tailwind CSS e componentes Radix
- Supabase (Auth, Postgres e Storage)
- Cloudflare Workers / Vite
- Vitest para testes

## Desenvolvimento local

Use Bun na versão compatível com o lockfile deste branch.

```sh
bun install --frozen-lockfile
bun run dev
```

## Validação

```sh
bunx tsc --noEmit -p .
bunx vitest run
bunx vite build --outDir /tmp/cortai-build
```

Os comandos exatos de validação automatizada estão definidos em `.github/workflows/validate.yml`.

## Segurança

- Não mescle esta branch em `main` nem publique no site principal sem autorização do dono.
- Migrações só de acréscimo, aplicadas pela automação "Aplicar migrações novas", com autorização.
- Não adicione chaves ou segredos ao repositório; configure-os apenas nos segredos do GitHub.

## MCP

A rota `/mcp` oferece ferramentas de leitura para listar serviços e agendamentos do negócio autenticado. O consentimento OAuth fica em `/oauth/consentimento`. A compatibilidade ponta a ponta com um cliente MCP real ainda precisa ser verificada antes de uso externo.
