# v0.1.0 - Foundation técnica e visual do frontend

## Resumo

`v0.1.0` registra a primeira foundation técnica e visual do IronCore Frontend. Ela estabelece a aplicação Angular standalone, a organização inicial de código, a integração HTTP e de sessão por cookie, a base visual com Angular Material, componentes reutilizáveis e o application shell responsivo.

Esta não é uma release de MVP nem uma entrega de fluxos de negócio para o usuário.

## Principais Mudanças

- Aplicação Angular 21 com TypeScript, SCSS e componentes standalone.
- CI no GitHub Actions com Node.js 24, `npm ci`, build e testes em pushes e pull requests para `main`.
- Configuração central de `HttpClient`, `API_BASE_URL` e environments de desenvolvimento e produção.
- Interceptor que envia cookies apenas às chamadas da API e limpa a sessão local em `401`.
- Infraestrutura de autenticação com login, logout, restauração de sessão, estado reativo em memória e `authGuard` reutilizável.
- Design tokens, paleta, temas claro e escuro e integração de tema com Angular Material.
- Breakpoints centralizados para mobile, tablet e desktop, além de container responsivo.
- Componentes compartilhados de botão, input, loading, empty state, diálogo de confirmação e toast.
- Application shell com header, sidebar, área de conteúdo e `router-outlet` interno.
- Testes unitários para a infraestrutura, layout e componentes de foundation.

## Notas Técnicas

- O estado de autenticação fica somente em memória; a restauração após recarregamento depende de `GET /api/users/me` e do cookie da API.
- O frontend não persiste o token retornado no contrato de login.
- Em desenvolvimento, a API é configurada como `http://localhost:8080`; na configuração padrão, a URL base é vazia para permitir chamadas relativas à mesma origem.
- A rota raiz monta o application shell, mas ainda não possui rotas-filhas.
- O tema escuro é o padrão; o tema claro pode ser aplicado com `data-theme="light"`.
- A responsividade usa os breakpoints: mobile até `600px`, tablet de `601px` a `960px` e desktop a partir de `961px`.

## Limitações Conhecidas

- Não há telas funcionais, páginas de domínio ou UI de login.
- Não há rotas públicas ou protegidas completas; o `authGuard` ainda não está associado a uma rota.
- A sidebar contém somente a navegação estrutural de início.
- Não há tratamento global de respostas `403`.
- Não há diretório ou módulo de `features`; ele será criado com a primeira responsabilidade funcional concreta.
- A autenticação depende da disponibilidade e da configuração de cookies/CORS do backend.

## Não Incluído Nesta Release

- MVP funcional de pessoa, métricas corporais, catálogo de exercícios ou planejamento de treinos.
- Autorização por roles ou permissões.
- Fluxos completos de login, troca de senha, recuperação de senha ou gerenciamento de perfil.
- Rotas públicas/protegidas definitivas e redirecionamentos de navegação.
- Deploy, publicação de artefatos ou criação de uma GitHub Release.

<p align="right"><a href="../README.md">Voltar para releases</a></p>
