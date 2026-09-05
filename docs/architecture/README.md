# Documentação de Arquitetura

## Visão geral

Este documento descreve a arquitetura inicial implementada no IronCore Frontend. A aplicação usa Angular standalone, com bootstrap em `src/main.ts` e providers globais concentrados em `app.config.ts`.

O objetivo atual é fornecer uma base pequena para a evolução da interface, mantendo infraestrutura transversal em `core` e evitando antecipar features, componentes compartilhados ou layout que ainda não existem.

## Bootstrap e composição da aplicação

`main.ts` inicializa o componente `App` por `bootstrapApplication(App, appConfig)`.

`app.config.ts` registra:

- listeners globais de erro do navegador;
- o Router com as rotas declaradas em `app.routes.ts`;
- a infraestrutura HTTP por `provideCoreHttp()`;
- um `provideAppInitializer` que executa `AuthService.restoreSession()` durante a inicialização.

O componente raiz contém, no momento, um botão de verificação do Angular Material e um `<router-outlet>`. Ele não representa um shell de aplicação: não existem header, sidebar ou navegação principal implementados.

## Estrutura e responsabilidades

### `core`

`src/app/core` concentra infraestrutura global e independente de uma tela específica.

| Área | Responsabilidade implementada |
| --- | --- |
| `auth` | Contratos de autenticação, chamadas de login/logout/restauração de sessão e estado do usuário em memória. |
| `http` | Provider do `HttpClient` e token de injeção para a URL base da API. |
| `interceptors` | Inclusão de credenciais para chamadas destinadas à API e limpeza do estado local após resposta `401`. |
| `guards` | Função de guarda reutilizável para rotas autenticadas. |

Serviços e modelos de negócio de uma futura funcionalidade não pertencem a `core`; eles devem permanecer na feature correspondente quando ela existir.

### `features`, `shared` e `layout`

Esses diretórios **não existem no estado atual do repositório**.

- `features` é a convenção planejada para encapsular fluxos funcionais, telas, componentes, serviços e modelos específicos de cada contexto.
- `shared` é a convenção planejada para recursos realmente genéricos e reutilizáveis, sem dependência de uma feature.
- `layout` é a convenção planejada para a estrutura visual persistente, como shell, cabeçalho e navegação.

Eles não devem ser criados vazios. A criação deve ocorrer quando uma responsabilidade concreta exigir a estrutura.

## Comunicação HTTP

`provideCoreHttp()` registra `HttpClient` com o `authInterceptor` e disponibiliza `API_BASE_URL`, cujo valor vem do environment ativo.

O interceptor determina se uma requisição é destinada à API comparando origem e caminho com `API_BASE_URL`. Para requisições da API, clona a requisição com `withCredentials: true`; requisições externas não recebem essa alteração. Quando uma resposta possui status `401`, o estado local de autenticação é limpo e o erro continua no fluxo RxJS.

O `AuthService` usa `HttpClient` e o token `API_BASE_URL` para os contratos já integrados:

- `POST /api/auth/login` recebe `email` e `password`; após sucesso, mantém somente os dados do usuário no estado local.
- `GET /api/users/me` restaura a sessão por meio do cookie enviado pelo navegador; uma resposta `401` é tratada como ausência de sessão e não interrompe a inicialização.
- `POST /api/auth/logout` encerra a sessão no backend e limpa o estado local após sucesso.

O `LoginResponse` contém campos de token porque esse é o contrato atual da API, mas o frontend não o persiste nem o utiliza como credencial. A autenticação de requisições depende do cookie enviado com `withCredentials`.

## Autenticação e proteção de rotas

`AuthStateService` mantém o usuário autenticado em um `signal`; `currentUser` é exposto somente para leitura e `isAuthenticated` é um valor derivado. O estado não é persistido em `localStorage`, `sessionStorage` ou mecanismo equivalente. Ao recarregar a aplicação, `restoreSession()` consulta a API para reconstruí-lo.

`authGuard` libera uma rota apenas se `isAuthenticated()` for verdadeiro. Caso contrário, redireciona para `/login`. Não há rotas registradas em `app.routes.ts` nem tela de login neste momento; portanto, o guard está implementado, mas ainda não está associado a uma rota.

## Environments

O projeto mantém dois arquivos de ambiente:

| Arquivo | Uso | `apiBaseUrl` atual |
| --- | --- | --- |
| `src/environments/environment.ts` | configuração padrão/produção | string vazia, para chamadas relativas à mesma origem |
| `src/environments/environment.development.ts` | `ng serve` e build `development` | `http://localhost:8080` |

O `angular.json` substitui o arquivo padrão pelo de desenvolvimento na configuração `development`. Valores sensíveis não devem ser adicionados aos arquivos de environment.

## Convenções atuais

- A aplicação usa componentes standalone e providers funcionais do Angular.
- O estilo padrão de componentes é SCSS.
- Serviços globais usam `providedIn: 'root'` quando apropriado.
- Chamadas HTTP ficam em serviços; componentes devem concentrar apresentação e interação.
- O frontend usa contratos do backend, mas não replica validações de domínio, autorização ou ownership.
- Estados de autenticação e dados sensíveis não devem ser persistidos no navegador sem decisão arquitetural e análise de segurança.
- Novas estruturas devem refletir código implementado e esta documentação deve ser atualizada quando a arquitetura mudar.

## Limites do estado atual

Não estão implementados: rotas de negócio, páginas, componentes de feature, shell visual, tratamento global de erros HTTP, recursos reutilizáveis em `shared` e integrações além da infraestrutura de autenticação.

<p align="right"><a href="../README.md">Voltar para o índice de documentação</a></p>
