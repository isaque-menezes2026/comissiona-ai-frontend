# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Frontend do **Comissiona AI** (Next.js 14, App Router). Consome a API do repositório separado `comissiona-ai-backend` via `NEXT_PUBLIC_API_URL`. Sem SSR/data-fetching no servidor — todas as páginas são client components (`'use client'`) que chamam a API via axios direto do navegador.

## Comandos

```bash
npm run dev     # next dev, localhost:3000
npm run build    # next build — roda type-check completo, quebra o build se houver erro de TS
npm run start    # next start (produção, após build)
```

Sem suite de testes configurada. Deploy é automático via Vercel a cada push na branch `main` (não há CI separado).

**Diferença importante em relação ao backend:** aqui o `next build` faz type-check *antes* de gerar a imagem/deploy — um erro de TypeScript quebra o build no Vercel e o deploy falha, mas a versão anterior continua no ar (o Vercel não promove um build quebrado). No backend (`comissiona-ai-backend`), o equivalente do `tsc` só roda quando o container já subiu (ver o CLAUDE.md de lá) — lá sim um erro de tipo pode derrubar a produção.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API do backend, com o prefixo `/api` (ex: `https://comissiona-ai-backend-production.up.railway.app/api`) |

## Arquitetura

### Roteamento e autenticação

Cada rota autenticada segue o padrão `src/app/<rota>/layout.tsx` envolvendo `AppShell`, e `src/app/<rota>/page.tsx` com o conteúdo (client component). `AppShell` (`src/components/layout/AppShell.tsx`) é o guard de autenticação: se não houver usuário logado, redireciona pra `/auth/login`.

**Gotcha de hidratação:** o estado de autenticação vive num store Zustand com persistência em `localStorage` (`src/store/auth.store.ts`, chave `comissiona_auth`). Essa persistência é reidratada de forma assíncrona depois que o JS carrega. Em qualquer navegação com reload completo (F5, digitar URL direto), o primeiro render acontece com `isAuthenticated` ainda `false`, antes do valor salvo ser lido. `AppShell` espera explicitamente `useAuthStore.persist.hasHydrated()` antes de decidir se redireciona — não remover essa espera, senão usuários logados são jogados pro login à toa a cada reload.

O token JWT é guardado **duas vezes**: dentro do estado persistido do Zustand (`comissiona_auth`) e separadamente em `localStorage['comissiona_token']`, que é o que o interceptor do axios (`src/lib/api.ts`) realmente lê pra montar o header `Authorization`. As duas cópias precisam ficar em sincronia (ver `login`/`logout` em `auth.store.ts`).

Respostas `401` da API disparam limpeza do localStorage e redirect pro login direto no interceptor de resposta do axios (`src/lib/api.ts`) — não é tratado página por página.

### Controle de acesso por papel (menu lateral)

`src/components/layout/Sidebar.tsx` filtra os itens de menu com a flag `adminOnly` comparando `user.role` contra `UNRESTRICTED_ROLES = ['ADMIN', 'SALES_MANAGER', 'FINANCIAL']` — a mesma lista de papéis irrestritos usada no backend (`src/common/scope.util.ts` de lá). Pagamentos, Pessoas, Produtos, Regras, Relatórios e Usuários ficam ocultos pra Vendedor/Parceiro/Colaborador. Isso é só uma camada de UX — o bloqueio de verdade é no backend; se adicionar um item de menu novo restrito, lembrar que também precisa restringir o endpoint correspondente no backend, o frontend sozinho não protege nada.

### Padrão de página de listagem

Toda tela de listagem (Vendas, Comissões, Clientes, etc.) segue o mesmo formato: estado local com `useState`, `useEffect` chamando a API, componente `Table`/`Tr`/`Td` (`src/components/ui/Table.tsx`) pra montar a tabela. `Td` aceita `children` opcional e `colSpan`; `Tr` aceita `className` opcional — isso existe especificamente para permitir linhas de rodapé/totais (ver `src/app/comissoes/page.tsx` para um exemplo: soma de Venda/Comissão da lista visível, respeitando os filtros ativos).

Ao adicionar um filtro numa tela de listagem, o padrão é: estado do filtro em `useState`, uma lista `visibleXxx` derivada (client-side, filtrando o array já carregado) e, se o total exibido precisa refletir o filtro, recalcular o total a partir dessa lista derivada — não do array completo. Ver `comissoes/page.tsx` (`visibleCommissions`, `totalVendaVisivel`, `totalComissaoVisivel`) como referência.

### Mapas de tradução de enum (`src/lib/formatters.ts`)

`commissionStatus`, `saleStatus` e `commissionType` traduzem os enums do Prisma (`CommissionStatus`, `SaleStatus`, `CommissionType`, definidos no backend) para label + cor em português. **Se um enum novo for adicionado no `schema.prisma` do backend, precisa adicionar a entrada correspondente aqui também** — o frontend não deriva isso automaticamente, é uma cópia manual que tem que ser mantida em sincronia com o backend.

### Design system

Tailwind, sem biblioteca de componentes externa. Componentes reutilizáveis ficam em `src/components/ui/` (`Table`, `Badge`, `StatCard`, `Modal`, `EmptyState`, `LoadingSpinner`, `PasswordInput`). Cores customizadas (`brand`, `success`, `warning`, `danger`) definidas em `tailwind.config.ts`. Fonte: Inter (carregada via Google Fonts no `layout.tsx` raiz).


---

# Regras obrigatórias de desenvolvimento

> Lido pelo Claude no início de toda conversa deste projeto (vai no git → vale para qualquer usuário/colega).

## Sempre procure a melhor forma para economizar tokens

## Integridade completa do sistema

Nunca implemente uma funcionalidade de forma isolada.

Antes de alterar qualquer funcionalidade, analise os impactos em todo o sistema, incluindo:

- frontend;
- backend;
- banco de dados;
- APIs;
- autenticação e permissões;
- menus e rotas;
- integrações externas;
- eventos, filas e automações;
- regras de negócio;
- experiência do usuário;
- testes e documentação.

Garanta que todas as dependências, integrações e fluxos relacionados sejam atualizados.

Não deixe: código incompleto; telas desconectadas; APIs sem utilização ou sem tratamento; referências órfãs; rotas quebradas; menus apontando para páginas inexistentes; funcionalidades parcialmente implementadas; inconsistências entre banco de dados, backend e frontend; configurações temporárias em produção; dados simulados ou mocks no fluxo final; regressões em funcionalidades existentes.

Antes de considerar uma tarefa concluída:

1. Revise o impacto global da alteração.
2. Execute os testes existentes.
3. Crie ou atualize os testes necessários.
4. Verifique os fluxos principais e alternativos.
5. Valide tratamento de erros e estados vazios.
6. Confirme permissões e segurança.
7. Verifique integração entre frontend, backend e banco de dados.
8. Confirme que nenhuma funcionalidade existente foi quebrada.

Se identificar uma inconsistência diretamente relacionada à tarefa, trate-a como parte da implementação.

Não declare a tarefa concluída enquanto houver pendências, erros conhecidos, partes simuladas, integrações incompletas ou pontos sem validação.

A solução final deve estar: integrada; consistente; testada; segura; funcional; documentada; pronta para produção.

Ao finalizar cada tarefa, apresente um resumo contendo: arquivos alterados; impactos identificados; testes executados; integrações validadas; riscos ou pendências restantes.

Nunca afirme que o sistema está 100% validado sem ter executado as verificações correspondentes.
