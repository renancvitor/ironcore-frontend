# Documentação de Arquitetura

## Visão Geral

O IronCore Frontend é uma aplicação Angular standalone. O bootstrap ocorre em `src/main.ts`; `app.config.ts` concentra os providers globais; e `AppComponent` hospeda o `router-outlet` e o fundo visual compartilhado.

A aplicação separa infraestrutura transversal em `core`, elementos reutilizáveis em `shared`, composição visual persistente em `layout` e fluxos funcionais em `features`. As features atualmente entregues pertencem aos contextos de autenticação, avaliação corporal, exercícios, planejamento e sessões de treino, início e perfil.

## Bootstrap e Providers

`bootstrapApplication(AppComponent, appConfig)` inicia a aplicação. O `appConfig` registra:

- listeners globais de erro do navegador;
- Router com as rotas de `app.routes.ts`;
- `HttpClient`, URL base da API e interceptor pelo `provideCoreHttp()`;
- inicialização de `ThemeService` e locale `pt-BR`, com os dados de locale registrados;
- um `provideAppInitializer` que chama `AuthService.restoreSession()` na inicialização.

## Camadas e Responsabilidades

| Área                        | Responsabilidade atual                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `core/auth`                 | Contratos de autenticação, login, logout, restauração de sessão e estado reativo em memória.   |
| `core/http`                 | Provider do `HttpClient` e token `API_BASE_URL`.                                               |
| `core/interceptors`         | Cookies, recuperação após `401`, CSRF e limitação de tentativas em `429`.                      |
| `core/guards`               | Guard reutilizável aplicado à área autenticada.                                                |
| `core/theme`                | Estado e persistência da preferência de tema.                                                  |
| `shared/components`         | Componentes de interação e feedback sem regra de domínio.                                      |
| `layout`                    | Application shell, header e sidebar.                                                           |
| `features/auth`             | Páginas e fluxos de login e primeiro acesso.                                                   |
| `features/body-metrics`     | Contratos, consultas, formulários, exclusão, evolução e comparativo de avaliações corporais.   |
| `features/exercise`         | Contratos e consultas do catálogo, filtros, contexto de navegação e detalhe com músculos-alvo. |
| `features/workout-planning` | Contratos, catálogo, formulários, composição de ciclos/dias/atividades e lifecycle.            |
| `features/workout-sessions` | Execução, recuperação, edição, histórico e evolução por exercício.                             |
| `features/home`             | Composição dos resumos de última avaliação, evolução corporal e planejamento de treinos.       |
| `features/profile`          | Perfil, dados de `Person`, nickname e alteração de senha.                                      |

Uma feature pode usar APIs públicas de `core` e elementos de `shared`, mas não deve acessar detalhes internos de outra feature. `shared` não deve depender de features e `core` não deve depender de `features` ou `layout`.

A composição atual da Home utiliza a API pública de apresentação de `BodyMetricsLatestComponent`, por `contentTemplate`. O componente da feature mantém consulta e estados; o card define apenas o conteúdo resumido de sucesso. Essa reutilização não cria um segundo serviço ou carregamento de `/latest` na Home.

O card de evolução usa `BodyMetricsService.getChanges` e `defaultProgressPeriod`, com estado local e uma consulta de `/progress/changes`. Ele seleciona peso e composição corporal da resposta, preserva diferenças e datas e oferece loading, empty state e retry. Não há outro serviço ou store para a Home, nem duplicação da página completa de evolução. Conteúdo, estados e decisões de produto estão em [Home e Cards-Resumo](../card-resume/README.md).

O card de planejamento usa a API pública de `WorkoutPlanningService`, com consulta e estados próprios. Busca até três ciclos em andamento e consulta não iniciados apenas se a primeira resposta estiver vazia. Os resumos são independentes, sem store ou estado de carregamento global da Home. `TodayWorkoutsCardComponent` acrescenta treinos do dia e sessão em andamento, consultando as APIs públicas de planejamento e sessões.

## Comunicação HTTP e Environments

`provideCoreHttp()` registra o `HttpClient` com `rateLimitInterceptor`, `authInterceptor` e `csrfInterceptor`, nessa ordem, e fornece `API_BASE_URL` a partir do environment ativo. Serviços devem receber esse token; URLs da API não devem ser repetidas nas features.

O interceptor identifica chamadas para a API por origem e caminho. Somente essas chamadas recebem `withCredentials: true`; chamadas externas permanecem inalteradas. Respostas `401` elegíveis acionam `SessionService.recover()`; a limpeza e o redirecionamento dependem do resultado da recuperação, conforme o fluxo abaixo.

| Arquivo                                       | Uso                                     | `apiBaseUrl`                  |
| --------------------------------------------- | --------------------------------------- | ----------------------------- |
| `src/environments/environment.ts`             | configuração padrão e build de produção | `https://api.ironcore.dev.br` |
| `src/environments/environment.development.ts` | `ng serve` e build `development`        | `http://localhost:8080`       |

`angular.json` substitui o environment padrão pelo de desenvolvimento nessa configuração. Arquivos de environment não devem conter segredos.

O `csrfInterceptor` consulta `GET /api/auth/csrf` por meio de `CsrfService` antes das operações de escrita na API e envia o token no header indicado pela resposta. Métodos `GET`, `HEAD` e `OPTIONS` e chamadas externas não passam por essa obtenção de token. A sessão de produção utiliza cookie `HttpOnly`/`Secure` com `SameSite=Lax`, e CORS permite a origem oficial do frontend.

O frontend está publicado no Cloudflare Pages em `https://ironcore.dev.br`, integrado à API de produção. Hospedagem, build e publicação automática estão em [Deploy e Produção](../deploy/README.md).

## Autenticação

`AuthService` integra os contratos utilizados pelos fluxos entregues:

- `POST /api/auth/login`;
- `GET /api/users/me`, para restaurar a sessão por cookie;
- `POST /api/auth/refresh`, pela recuperação coordenada;
- `POST /api/auth/logout`.
- `POST /api/users/change-initial-password`.

`AuthStateService` guarda apenas o usuário autenticado em um `signal`, com `userId`, e-mail, nickname e o indicador `mustChangePassword`. Os contratos de login/refresh retornam `expiresAt`, sem token no corpo; esse campo não alimenta contadores ou renovação antecipada no cliente; a sessão usa o cookie enviado pelo navegador com `withCredentials`. Ao recarregar a página, a sessão é reconstruída por `GET /api/users/me`. Um `401` nessa restauração representa ausência de sessão e não interrompe a inicialização.

`authGuard` permite navegação somente quando há usuário no estado e, caso contrário, cria uma `UrlTree` para `/login`. Ele está aplicado à rota que monta a área autenticada. Como a restauração ocorre no inicializador, uma entrada direta nessa área é liberada quando `GET /api/users/me` restabelece uma sessão válida antes da avaliação do guard.

### Recuperação e Coordenação de Sessão

`SessionService` centraliza recuperação e serializa login, logout, primeiro acesso e alteração de senha com Web Locks (`navigator.locks`) por API. `recover()` compartilha a requisição pendente na aba. Dentro do lock, consulta `GET /api/users/me`; somente após `401`, com Web Locks disponível e sem refresh local incerto, envia `POST /api/auth/refresh` e consulta `/me` novamente. Assim, outra aba pode aproveitar cookies já renovados sem novo refresh. Sem Web Locks, a sondagem continua disponível, mas não há envio automático de refresh.

`authInterceptor` envia credenciais apenas à API e exclui login, refresh, logout, troca inicial, obtenção de CSRF e requisições com `SKIP_SESSION_RECOVERY` da recuperação recursiva. Após recuperação, repete uma vez apenas `GET`/`HEAD`. Para escritas, devolve feedback para o usuário repetir conscientemente a operação, sem reenviar o corpo. Um `401` definitivo pode limpar o estado e levar ao login; a restauração inicial não redireciona por si só. Falhas de rede/servidor não equivalem automaticamente a expiração.

Um refresh com resultado incerto (`0`/`5xx`) é sinalizado para evitar repetição local cega. `BroadcastChannel`, quando disponível, comunica incertezas/renovações e eventos `changed`/`logout`, sem transmitir tokens. `changed` invalida CSRF e estado, consulta novamente o usuário e recarrega a página se uma conta anteriormente conhecida mudou; `logout` limpa e navega para login. Revisões de sessão impedem aceitar respostas antigas após mudança de autenticação. Essas proteções não sincronizam dados de domínio entre abas.

O logout só limpa o estado local e notifica as demais abas após sucesso; falhas são apresentadas pelo header. Primeiro acesso bem-sucedido limpa o estado e retorna ao login. A alteração normal de senha usa `ProfileService` e `SessionService.mutate(..., 'changed')`; em `401`, verifica/recupera a sessão e devolve o erro, sem repetir a alteração. O formulário retorna ao perfil após sucesso. Primeiro acesso e alteração normal antecipam o limite de 72 bytes UTF-8 para nova senha e confirmação, além das validações já existentes; não é um limite de 72 caracteres.

### CSRF, Cookies e Limitação de Tentativas

`CsrfService` compartilha somente a obtenção de token em andamento e invalida esse contexto após mutações de autenticação e eventos entre abas. Não mantém um token permanente em storage. `csrfInterceptor` obtém o token antes de escritas, incluindo login, refresh e logout. O backend emite os cookies e define atributos, rotação, expiração e revogação; Angular não lê cookies `HttpOnly` nem controla a validade dos tokens. Ownership e autorização continuam na API.

`rateLimitInterceptor` trata `429` de POSTs de login, refresh, troca inicial e alteração normal de senha. Com `Retry-After` válido (segundos ou data HTTP futura), guarda um prazo em memória por endpoint e impede novas tentativas locais até esse prazo, apresentando a mensagem correspondente. Sem header válido, preserva o erro recebido. Não há retry automático, contador visual ou aviso antecipado de expiração de sessão.

### Conteúdo e Headers de Segurança

[`public/_headers`](../../public/_headers) declara CSP para o Pages: scripts da própria origem, conexão com a API de produção, fontes/estilos do Google, bloqueio de objetos, frames e formulários externos. Também declara `nosniff`, `DENY`, política de referrer e restrições de câmera, microfone e geolocalização. `style-src` ainda permite `unsafe-inline`; não se trata de eliminar todo conteúdo inline.

O tema inicial usa o arquivo externo [`public/theme-init.js`](../../public/theme-init.js), antes do bootstrap. A otimização de produção mantém scripts/minificação e desativa `inlineCritical`, evitando injeção de script de carregamento de CSS incompatível com `script-src 'self'`. Dados e relatos seguem bindings/interpolação Angular, sem introduzir renderização HTML de conteúdo do usuário ou bypass de sanitização. CSP é proteção complementar contra XSS; sua aplicação em produção depende do host. A revisão documental não verifica headers servidos ao vivo.

## Routing e Application Shell

O routing possui as rotas públicas `/login` e `/first-access`. A rota raiz, composta por `AppShellComponent` e protegida por `authGuard`, contém início, `/profile`, `/change-password` e as rotas de avaliação corporal, exercícios, planejamento e sessões de treino. Os componentes de rota usam `loadComponent` para carregamento sob demanda. O shell organiza header, sidebar, área de conteúdo com `.ic-container` e um `router-outlet` interno. Header e sidebar oferecem acesso ao perfil, histórico corporal, catálogo de exercícios e planejamento de treinos; a sidebar também oferece evolução. O header oferece logout e preferência de tema. No mobile, os atalhos de histórico, exercícios e planejamento do header ficam ocultos, mantendo o acesso pela sidebar.

A avaliação corporal possui `/body-metrics`, `/body-metrics/latest`, `/body-metrics/progress`, `/body-metrics/create` e `/body-metrics/:id`, com rotas estáticas antes de `:id`. A edição ocorre dentro do detalhe. `bodyMetricsHistoryGuard` impede saída do histórico enquanto há exclusão pendente. O provider de `MatPaginatorIntl` em português pertence ao AppShell e é compartilhado com suas páginas carregadas sob demanda.

O catálogo usa `/exercises` e `/exercises/:id` na mesma área protegida. A listagem abre o detalhe por clique ou teclado, e o detalhe retorna ao catálogo com o contexto aplicado preservado em memória. As duas telas reutilizam serviços de HTTP, sessão e feedback existentes.

Workout Planning usa `/workout-planning`, `/workout-planning/create` e `/workout-planning/:id`, com `create` antes de `:id`. Edição, composição e lifecycle ocorrem no detalhe existente. O link individual da Home acrescenta `from=home`; o detalhe retorna para `/` nessa origem e para o catálogo quando ela está ausente ou inválida. O contexto é preservado na URL após recarregamento. `edit=true` abre a edição quando o status permite.

A Home acessa a evolução com `from=home`, e o histórico com `from=history`, na query string de `/body-metrics/progress`. A página lê a origem atual da URL: `home` retorna para `/`; histórico, origem inválida/ausente e acesso direto retornam para `/body-metrics`. A sidebar acessa a rota sem origem, restaurando o fallback inclusive na mesma página. Label e tooltip do botão de retorno acompanham esse contexto. A origem não altera os contratos HTTP, período ou visão inicial e não cria uma segunda tela.

Login envia `POST /api/auth/login`, atualiza o estado de sessão e navega para o início após sucesso. Quando recebe `401` com a mensagem `Troca de senha inicial obrigatória.`, a tela navega para `/first-access` com o e-mail informado. O primeiro acesso envia `POST /api/users/change-initial-password` e retorna para `/login` após sucesso. Essas rotas públicas não possuem redirecionamento automático quando já existe sessão autenticada.

O perfil consome o `User` mantido em `AuthStateService` e busca `Person` por `GET /api/users/me/person`. A separação é intencional: e-mail e nickname pertencem a `User`; nome, sexo e data de nascimento pertencem a `Person`. A alteração de nickname usa `PUT /api/users/me/change-nickname` e atualiza o estado de sessão. A edição dos dados pessoais usa `PATCH /api/users/me/person`. A alteração normal de senha, distinta do primeiro acesso, usa `POST /api/users/me/change-password`.

O logout é acionado no header por `POST /api/auth/logout`. Após sucesso, o estado em memória é limpo e a aplicação navega para `/login`; o frontend não manipula cookies `HttpOnly` diretamente. Falhas, inclusive `401`, exibem feedback no header; esse endpoint não aciona recuperação automática nem garante limpeza local em erro.

## Tema, Responsividade e Componentes Compartilhados

Os tokens e temas SCSS centralizam paleta, cores semânticas, espaçamentos, bordas, foco e tipografia. Há temas claro (`data-theme='light'`) e escuro, com integração ao Angular Material. `ThemeService` oferece preferências `light`, `dark` e `system`, persistidas no `localStorage` pela chave `Ironcore-theme`; o header permite alterná-las. Sem escolha explícita de claro/escuro, a aplicação acompanha `prefers-color-scheme`, usando escuro como fallback quando essa informação não está disponível. O script externo `/theme-init.js`, referenciado por `index.html`, aplica o tema antes do bootstrap e permanece alinhado à inicialização do serviço. Mudanças do sistema são acompanhadas enquanto a preferência é `system`.

A estratégia responsiva centraliza os breakpoints mobile (`até 600px`), tablet (`601px–960px`) e desktop (`a partir de 961px`), além do container com largura máxima de `1200px`. Os mixins de `_actions.scss` organizam cabeçalhos, grupos de ícones e rodapés de formulário no mobile, conforme [Disposição de ações no mobile](mobile-actions.md). Ícones de ações preservam `aria-label` e tooltips; gráficos e tabelas corporais permitem rolagem horizontal quando necessária.

Os componentes base entregues são:

- `ButtonComponent`, com variantes primary, secondary, danger e cancel;
- `InputComponent`, integrado a `ControlValueAccessor` e Angular Material;
- `LoadingComponent` e `EmptyStateComponent`;
- `DialogComponent` e `DialogService` para confirmações;
- `ToastComponent` e `ToastService` para sucesso, erro, aviso e informação.

`SummaryCardComponent` pertence à composição da Home. `BodyMetricsFormFieldsComponent`, a factory do formulário e seus validadores pertencem ao domínio da feature e são reutilizados por cadastro e edição, sem mover regras corporais para `shared`.

## Estado das Avaliações Corporais

`BodyMetricsService` centraliza a comunicação HTTP e não mantém cache ou store global de avaliações. As páginas usam signals locais. Cadastro navega para o detalhe; edição substitui os dados pela resposta do PUT; exclusão limpa e recarrega o histórico. As demais consultas são refeitas ao visitar as telas novamente, comportamento protegido por testes de integração entre rotas.

Evolução e comparativo compartilham um período aplicado e cancelam requisições anteriores ao mudar a consulta ou destruir a página. Gráficos usam SVG e transformações de apresentação; indicadores, agregação mensal e variações permanecem sob responsabilidade do backend. Os fluxos e contratos estão descritos em [Avaliação corporal](../body-metrics/README.md).

## Estado do Catálogo de Exercícios

`ExerciseService` centraliza consultas de exercícios e classificações auxiliares em `/api/exercise-catalog`, sem cache de respostas. Listagem e detalhe mantêm dados e estados locais em signals. `ExerciseCatalogStateService`, fornecido na raiz, guarda os filtros aplicados, a página e o tamanho em memória: abrir um detalhe e voltar refaz a consulta com esse contexto; recarregar a aplicação reinicia a busca. Essa preservação é intencional e não acrescenta persistência em storage ou query string.

O formulário mantém alterações pendentes separadas dos filtros aplicados. A paginação usa a busca aplicada; aplicar ou limpar todos os filtros reinicia na página zero. A dependência entre grupo e subgrupo organiza as opções visíveis no formulário, enquanto busca e filtragem dos exercícios permanecem no backend.

As consultas auxiliares têm carregamento e recuperação próprios. No detalhe, o nome do grupo muscular é resolvido por consulta auxiliar independente; uma falha nessa consulta preserva os dados do exercício e permite retry. Os contratos, estados e a representação de papéis musculares estão em [Catálogo de Exercícios](../exercises/README.md).

`ExerciseCatalogComponent` também expõe modo `select`, com seleção múltipla ou única, IDs indisponíveis e eventos de confirmação/cancelamento. O detalhe do ciclo compõe essa API pública e fornece uma instância local de `ExerciseCatalogStateService`, isolando os filtros da seleção em relação ao catálogo normal. O catálogo não grava atividades nem conhece as regras de lifecycle do ciclo.

## Estado do Workout Planning

`WorkoutPlanningService` centraliza contratos de `TrainingGoal`, `WorkoutCycle`, `WorkoutDay` e `WorkoutActivity`, sem cache de respostas. Catálogo, criação e detalhe mantêm signals locais; `WorkoutCycleCatalogStateService` preserva filtros e paginação em memória. Formulários e componentes de campos pertencem ao domínio, reutilizando os elementos visuais de `shared`.

Os objetivos ativos vêm da API. A seleção de exercícios reutiliza o catálogo e prepara inclusões individuais com prescrição híbrida, sem exclusividade artificial por tipo de atividade. Após mutações de dias e atividades, uma nova consulta apresenta a composição e as posições normalizadas pelo backend. Reorder envia somente a posição desejada e, para dias, o `weekDay` de destino.

A UI reflete permissões por status: edição e composição em `NOT_STARTED`/`IN_PROGRESS`, estados terminais somente para consulta e exclusão de ciclo apenas em `NOT_STARTED`. O backend é autoridade para ownership, pré-condições de início e transições; a interface apresenta suas recusas. A execução é responsabilidade separada de `features/workout-sessions`; não há cálculo de progresso percentual do ciclo. Contratos, feedbacks e decisões estão em [Workout Planning](../workout-planning/README.md).

## Estado do Workout Session

`WorkoutSessionsService` centraliza HTTP e analytics. `WorkoutSessionEditorState`, fornecido pelo detalhe, preserva rascunhos em memória e reconcilia registros confirmados; `WorkoutSessionNavigation` coordena guards de entrada/saída e descarte. `WorkoutSessionHistoryState` mantém filtros e paginação em memória. A evolução reutiliza o catálogo em seleção única e utilitários de período em `shared/utils/progress-period.utils.ts`, também usados por Body Metrics.

As rotas `/workout-sessions`, `/workout-sessions/history`, `/workout-sessions/progress` e `/workout-sessions/:id` ficam sob o shell. Histórico e evolução precedem `:id`; o detalhe possui guards e `runGuardsAndResolvers: 'always'`. Sidebar e catálogo de ciclos oferecem acessos a sessão, histórico e evolução; o destaque da sidebar acompanha a origem contextual do detalhe. Contratos, execução parcial, modos, edição posterior e navegação estão em [Workout Session](../workout-session/README.md).

## Recortes Atuais

Geração por IA/agent, métricas de aderência e progresso percentual de ciclos permanecem planejados. Os quatro cards da Home usam dados reais. A coordenação de autenticação entre abas não constitui atualização em tempo real de avaliações, planejamento ou execução. Formulários corporais e de planejamento não possuem guard próprio de alterações não salvas; o editor de sessão possui essa proteção. A regra de troca obrigatória de senha é direcionada pela resposta do login; o `authGuard` verifica a existência de usuário no estado local.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
