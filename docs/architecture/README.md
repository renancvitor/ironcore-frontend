# Documentação de Arquitetura

## Visão Geral

O IronCore Frontend é uma aplicação Angular standalone. O bootstrap ocorre em `src/main.ts`; `app.config.ts` concentra os providers globais; e o componente raiz apenas hospeda o `router-outlet`.

A aplicação separa infraestrutura transversal em `core`, elementos reutilizáveis em `shared`, composição visual persistente em `layout` e fluxos funcionais em `features`. As features atualmente entregues pertencem aos contextos de autenticação, início e perfil.

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
| `core/guards` | Guard reutilizável aplicado à área autenticada. |
| `core/theme` | Estado e persistência da preferência de tema. |
| `shared/components` | Componentes de interação e feedback sem regra de domínio. |
| `layout` | Application shell, header e sidebar. |
| `features/auth` | Páginas e fluxos de login e primeiro acesso. |
| `features/home` | Página inicial da área autenticada. |
| `features/profile` | Perfil, dados de `Person`, nickname e alteração de senha. |

Uma feature pode usar APIs públicas de `core` e elementos de `shared`, mas não deve acessar detalhes internos de outra feature. `shared` não deve depender de features e `core` não deve depender de `features` ou `layout`.

## Comunicação HTTP e Environments

`provideCoreHttp()` registra o `HttpClient` com `authInterceptor` e fornece `API_BASE_URL` a partir do environment ativo. Serviços devem receber esse token; URLs da API não devem ser repetidas nas features.

O interceptor identifica chamadas para a API por origem e caminho. Somente essas chamadas recebem `withCredentials: true`; chamadas externas permanecem inalteradas. Em uma resposta `401`, o estado local é limpo e o erro continua no fluxo RxJS. Para chamadas que não sejam login, logout, primeiro acesso ou restauração de sessão, também há navegação para `/login`.

| Arquivo | Uso | `apiBaseUrl` |
| --- | --- | --- |
| `src/environments/environment.ts` | configuração padrão e build de produção | vazio, para chamadas relativas à mesma origem |
| `src/environments/environment.development.ts` | `ng serve` e build `development` | `http://localhost:8080` |

`angular.json` substitui o environment padrão pelo de desenvolvimento nessa configuração. Arquivos de environment não devem conter segredos.

## Autenticação

`AuthService` integra os contratos utilizados pelos fluxos entregues:

- `POST /api/auth/login`;
- `GET /api/users/me`, para restaurar a sessão por cookie;
- `POST /api/auth/logout`.
- `POST /api/users/change-initial-password`.

`AuthStateService` guarda apenas o usuário autenticado em um `signal`, com `userId`, e-mail, nickname e o indicador `mustChangePassword`. O token eventualmente retornado no login não é persistido nem usado como credencial pelo frontend; a sessão usa o cookie enviado pelo navegador com `withCredentials`. Ao recarregar a página, a sessão é reconstruída por `GET /api/users/me`. Um `401` nessa restauração representa ausência de sessão e não interrompe a inicialização.

`authGuard` permite navegação somente quando há usuário no estado e, caso contrário, cria uma `UrlTree` para `/login`. Ele está aplicado à rota que monta a área autenticada. Como a restauração ocorre no inicializador, uma entrada direta nessa área é liberada quando `GET /api/users/me` restabelece uma sessão válida antes da avaliação do guard.

## Routing e Application Shell

O routing possui as rotas públicas `/login` e `/first-access`. A rota raiz, composta por `AppShellComponent` e protegida por `authGuard`, contém as rotas-filhas para início, `/profile` e `/change-password`. O shell organiza header, sidebar, área de conteúdo com `.ic-container` e um `router-outlet` interno. Header e sidebar oferecem acesso ao perfil; o header também oferece logout e alternância de tema.

Login envia `POST /api/auth/login`, atualiza o estado de sessão e navega para o início após sucesso. Quando recebe `401` com a mensagem `Troca de senha inicial obrigatória.`, a tela navega para `/first-access` com o e-mail informado. O primeiro acesso envia `POST /api/users/change-initial-password` e retorna para `/login` após sucesso. Essas rotas públicas não possuem redirecionamento automático quando já existe sessão autenticada.

O perfil consome o `User` mantido em `AuthStateService` e busca `Person` por `GET /api/users/me/person`. A separação é intencional: e-mail e nickname pertencem a `User`; nome, sexo e data de nascimento pertencem a `Person`. A alteração de nickname usa `PUT /api/users/me/change-nickname` e atualiza o estado de sessão. A edição dos dados pessoais usa `PATCH /api/users/me/person`. A alteração normal de senha, distinta do primeiro acesso, usa `POST /api/users/me/change-password`.

O logout é acionado no header por `POST /api/auth/logout`. Após sucesso, o estado em memória é limpo e a aplicação navega para `/login`; o frontend não manipula cookies `HttpOnly` diretamente. Se o logout retornar `401`, a navegação para login também ocorre; outros erros mantêm o usuário na tela e exibem feedback.

## Tema, Responsividade e Componentes Compartilhados

Os tokens e temas SCSS centralizam paleta, cores semânticas, espaçamentos, bordas, foco e tipografia. Há suporte a temas claro (`data-theme='light'`) e escuro (padrão), com integração ao Angular Material. `ThemeService` aplica o tema no elemento raiz e persiste a escolha no `localStorage` pela chave `Ironcore-theme`; o toggle no header realiza a alternância. A estratégia responsiva centraliza os breakpoints mobile (`até 600px`), tablet (`601px–960px`) e desktop (`a partir de 961px`), além do container com largura máxima de `1200px`.

Os componentes base entregues são:

- `ButtonComponent`, com variantes primary, secondary, danger e cancel;
- `InputComponent`, integrado a `ControlValueAccessor` e Angular Material;
- `LoadingComponent` e `EmptyStateComponent`;
- `DialogComponent` e `DialogService` para confirmações;
- `ToastComponent` e `ToastService` para sucesso, erro, aviso e informação.

## Recortes Atuais

Não fazem parte do estado atual: métricas corporais, catálogo de exercícios, planejamento ou execução de treinos, deploy ou publicação de artefatos. A regra de troca obrigatória de senha é direcionada pela resposta do login; o `authGuard` verifica somente a existência de usuário no estado local.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
