# Documentação de Arquitetura

## Visão Geral

O IronCore Frontend é uma aplicação Angular standalone. O bootstrap ocorre em `src/main.ts`; `app.config.ts` concentra os providers globais; e o componente raiz apenas hospeda o `router-outlet`.

A foundation separa infraestrutura transversal em `core`, elementos reutilizáveis em `shared` e composição visual persistente em `layout`. Ainda não há `features`, páginas funcionais nem rotas de negócio.

## Bootstrap e Providers

`bootstrapApplication(App, appConfig)` inicia a aplicação. O `appConfig` registra:

- listeners globais de erro do navegador;
- Router com as rotas de `app.routes.ts`;
- `HttpClient`, URL base da API e interceptor pelo `provideCoreHttp()`;
- um `provideAppInitializer` que chama `AuthService.restoreSession()` na inicialização.

## Camadas e Responsabilidades

| Área | Responsabilidade atual |
| --- | --- |
| `core/auth` | Contratos de autenticação, login, logout, restauração de sessão e estado reativo em memória. |
| `core/http` | Provider do `HttpClient` e token `API_BASE_URL`. |
| `core/interceptors` | Inclusão de cookies nas chamadas à API e limpeza de sessão em respostas `401`. |
| `core/guards` | Guard reutilizável para futuras rotas autenticadas. |
| `shared/components` | Componentes de interação e feedback sem regra de domínio. |
| `layout` | Application shell, header e sidebar. |

`features` é uma convenção reservada para fluxos funcionais quando eles existirem. Uma feature pode usar APIs públicas de `core` e elementos de `shared`, mas não deve acessar detalhes internos de outra feature. `shared` não deve depender de features e `core` não deve depender de `features` ou `layout`.

## Comunicação HTTP e Environments

`provideCoreHttp()` registra o `HttpClient` com `authInterceptor` e fornece `API_BASE_URL` a partir do environment ativo. Serviços devem receber esse token; URLs da API não devem ser repetidas nas features.

O interceptor identifica chamadas para a API por origem e caminho. Somente essas chamadas recebem `withCredentials: true`; chamadas externas permanecem inalteradas. Em uma resposta `401`, o estado local é limpo e o erro continua no fluxo RxJS. Não há tratamento global de `403` nesta foundation.

| Arquivo | Uso | `apiBaseUrl` |
| --- | --- | --- |
| `src/environments/environment.ts` | configuração padrão e build de produção | vazio, para chamadas relativas à mesma origem |
| `src/environments/environment.development.ts` | `ng serve` e build `development` | `http://localhost:8080` |

`angular.json` substitui o environment padrão pelo de desenvolvimento nessa configuração. Arquivos de environment não devem conter segredos.

## Autenticação

`AuthService` integra os contratos já preparados:

- `POST /api/auth/login`;
- `GET /api/users/me`, para restaurar a sessão por cookie;
- `POST /api/auth/logout`.

`AuthStateService` guarda apenas o usuário autenticado em um `signal`. O token eventualmente retornado no login não é persistido nem usado como credencial pelo frontend; a sessão usa o cookie enviado pelo navegador com `withCredentials`. Ao recarregar a página, a sessão é reconstruída por `GET /api/users/me`. Um `401` nessa restauração representa ausência de sessão e não interrompe a inicialização.

`authGuard` permite navegação somente quando há usuário no estado e, caso contrário, cria uma `UrlTree` para `/login`. Ele ainda não está ligado a uma rota, pois não há páginas de login ou área protegida entregues.

## Routing e Application Shell

O routing atual possui apenas a rota raiz, composta por `AppShellComponent`, com `children: []`. O shell organiza header, sidebar, área de conteúdo com `.ic-container` e um `router-outlet` interno. A sidebar contém somente o link estrutural para início.

Não foram criadas rotas públicas, rotas protegidas, rota de login, redirecionamentos ou rota inicial de uma feature. Essa estrutura foi deliberadamente adiada até existirem telas funcionais reais; o shell e o guard são pontos de extensão para essa etapa.

## Tema, Responsividade e Componentes Compartilhados

Os tokens e temas SCSS centralizam paleta, cores semânticas, espaçamentos, bordas, foco e tipografia. Há suporte a temas claro (`data-theme='light'`) e escuro (padrão), com integração ao Angular Material. A estratégia responsiva centraliza os breakpoints mobile (`até 600px`), tablet (`601px–960px`) e desktop (`a partir de 961px`), além do container com largura máxima de `1200px`.

Os componentes base entregues são:

- `ButtonComponent`, com variantes primary, secondary, danger e cancel;
- `InputComponent`, integrado a `ControlValueAccessor` e Angular Material;
- `LoadingComponent` e `EmptyStateComponent`;
- `DialogComponent` e `DialogService` para confirmações;
- `ToastComponent` e `ToastService` para sucesso, erro, aviso e informação.

## Recortes Atuais

Não fazem parte do estado atual: telas ou fluxos de domínio, rotas públicas/protegidas completas, UI de login, associação do guard a rotas, autorização por roles, tratamento global de `403`, deploy ou publicação de artefatos.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
