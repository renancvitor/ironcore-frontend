# Catálogo de Exercícios

## Escopo Implementado

O Exercise Catalog permite consultar o catálogo global de exercícios, aplicar busca e filtros combinados, percorrer resultados paginados e abrir o detalhe com classificações e músculos-alvo. A feature está em `src/app/features/exercise` e compõe a entrega frontend `v0.4.0`.

O catálogo é controlado pelo sistema. A interface consome consultas autenticadas; a manutenção de exercícios, classificações e associações musculares pertence ao backend, conforme sua [documentação do catálogo](https://github.com/renancvitor/ironcore-backend/blob/main/docs/exercises/README.md). Não há operações de cadastro, edição ou exclusão nesta feature.

## Estrutura e Responsabilidades

| Arquivo ou área                             | Responsabilidade                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `exercise.models.ts`                        | Contratos das classificações, filtros, página, detalhe e músculos-alvo; representação de papel muscular. |
| `exercise.service.ts`                       | Consultas HTTP do catálogo, serialização dos parâmetros e uso de `API_BASE_URL`.                         |
| `catalog/exercise-catalog.component`        | Formulário, carregamento das opções, consulta paginada, estados e navegação para o detalhe.              |
| `catalog/exercise-catalog-state.service.ts` | Filtros aplicados, página e tamanho preservados em memória durante a navegação.                          |
| `catalog/detail/exercise-detail.component`  | Consulta por ID, informações gerais, músculos-alvo, resolução dos nomes dos grupos e retorno.            |

`ExerciseService` centraliza o acesso à API e não guarda resultados em cache. As telas mantêm dados e estados de carregamento em signals locais. `ExerciseCatalogStateService`, fornecido na raiz da aplicação, preserva somente o contexto da consulta. A feature reutiliza HTTP, sessão, componentes de feedback e paginator existentes, sem acrescentar infraestrutura a `core` ou regras de catálogo a `shared`.

## Rotas e Navegação

| Rota             | Conteúdo                              |
| ---------------- | ------------------------------------- |
| `/exercises`     | Busca, filtros e listagem paginada.   |
| `/exercises/:id` | Detalhe do exercício e músculos-alvo. |

As duas rotas usam `loadComponent` dentro do AppShell protegido por `authGuard`. A sidebar oferece acesso ao catálogo; o header também oferece um atalho, oculto no mobile, onde o acesso permanece pelo menu lateral.

As linhas da tabela abrem o detalhe por clique, Enter ou Space. O botão de retorno do detalhe navega para `/exercises`.

A busca aplicada, a página e o tamanho permanecem em memória ao abrir um detalhe e voltar ao catálogo. O catálogo é consultado novamente nesse retorno, utilizando o contexto preservado. Alterações no formulário ainda não aplicadas não substituem essa busca. Recarregar a aplicação limpa o estado e reinicia na página `0`, com tamanho `20` e sem filtros. Essa é uma escolha de navegação: voltar preserva; recarregar reinicia. Os filtros não são gravados na URL ou em armazenamento persistente.

O detalhe lê o ID da rota na inicialização. Valores que não sejam inteiros positivos retornam ao catálogo sem consultar exercício ou grupos musculares. A rota vigente é `/exercises/:id`, conforme a padronização posterior ao PR #69.

## Contratos HTTP

Todos os caminhos da tabela são relativos a `/api/exercise-catalog`, configurado por `ExerciseService` a partir de `API_BASE_URL`. As consultas exigem sessão por cookie e seguem o interceptor e o tratamento de `401` descritos em [Arquitetura](../architecture/README.md).

| Método | Caminho             | Entrada                                | Resposta de sucesso                                     |
| ------ | ------------------- | -------------------------------------- | ------------------------------------------------------- |
| `GET`  | `/activity-types`   | Sem parâmetros.                        | Array de tipos de atividade.                            |
| `GET`  | `/equipment-types`  | Sem parâmetros.                        | Array de equipamentos.                                  |
| `GET`  | `/muscle-groups`    | Sem parâmetros.                        | Array de grupos musculares.                             |
| `GET`  | `/muscle-subgroups` | `muscleGroupId` opcional.              | Array de subgrupos, com vínculo ao grupo.               |
| `GET`  | `/exercises`        | `page`, `size`, nome e classificações. | Objeto `exercises` com página de exercícios.            |
| `GET`  | `/exercises/{id}`   | ID do exercício.                       | Exercício com classificações, situação e músculos-alvo. |

### Catálogos Auxiliares

`ActivityTypeItemResponse`, `EquipmentTypeItemResponse` e `MuscleGroupItemResponse` contêm `id`, `code` e `name`. `MuscleSubgroupItemResponse` acrescenta `muscleGroupId`. Os nomes apresentados vêm da API; não há listas locais de classificações nem IDs fixos no frontend.

Os documentos de domínio do backend usam `displayName`, mas os DTOs REST consumidos pela interface expõem esse texto como `name`. Campos internos como `sortOrder`, datas e disponibilidade não fazem parte desses DTOs auxiliares. A tela preserva a ordem recebida.

Ao entrar no catálogo, a aplicação inicia a listagem e as quatro consultas auxiliares independentemente. Cada seletor fica desabilitado até sua consulta concluir com sucesso. Uma falha é identificada por catálogo em uma área com `role="alert"`; as opções que carregaram e os resultados da listagem continuam disponíveis.

`Tentar carregar filtros novamente` consulta os quatro catálogos novamente. O botão permanece desabilitado enquanto há carregamento auxiliar pendente. O estado de carregamento possui indicação textual com `role="status"`.

O serviço suporta `getMuscleSubgroups(muscleGroupId?)`. A tela de catálogo carrega todos os subgrupos sem esse parâmetro e restringe apenas as opções visíveis conforme os grupos escolhidos. Essa organização das opções não substitui a filtragem dos exercícios no backend.

### Listagem e Paginação

`ListExercisesResponse.exercises` usa `PageResult<ListExercisesItemResponse>`:

```text
exercises
  content[]
  page
  size
  totalElements
  totalPages
  last
```

Cada item contém `id`, `name`, `equipmentType`, `activityType`, `unilateral`, `compound` e `suggestedRestSeconds`. Tipos de atividade e equipamento são objetos com `id`, `code` e `name`.

A consulta inicial envia `page=0&size=20`, a partir do estado do catálogo. O paginator usa os metadados devolvidos e oferece tamanhos de 10, 20, 50 e 100. O backend aceita página a partir de zero e tamanho entre 1 e 100, com ordenação por nome ascendente e ID ascendente no desempate. O frontend apresenta a ordem recebida e não pagina os resultados localmente.

A tabela apresenta nome, atividade, equipamento, unilateral, composto e descanso sugerido. Booleanos usam `Sim` ou `Não`; descanso usa segundos (`s`) e, quando `null`, o marcador `—`.

- Durante a consulta, a área de resultados apresenta loading.
- `totalElements=0` apresenta `Nenhum exercício encontrado.`.
- Uma página sem itens, mas com total maior que zero, apresenta `Nenhum exercício disponível nesta página.` e mantém o paginator.
- Uma falha de listagem abre diálogo com a mensagem da API ou fallback local. Ao fechar o diálogo, a aplicação navega para o início.

### Busca e Filtros Combinados

O formulário envia os critérios ao acionar `Aplicar filtros` ou submeter pelo teclado. A busca não é enviada a cada alteração de campo. O nome é aparado nas extremidades e omitido quando vazio.

| Critério da tela  | Parâmetro utilizado na consulta |
| ----------------- | ------------------------------- |
| Nome              | `name`                          |
| Tipo de atividade | `activityTypeIds`               |
| Equipamento       | `equipmentTypeIds`              |
| Grupo muscular    | `muscleGroupIds`                |
| Subgrupo muscular | `muscleSubgroupIds`             |
| Papel muscular    | `targetRoles`                   |

O serviço usa `HttpParams`, omite listas vazias e remove valores repetidos antes do envio. Ele também suporta os parâmetros singulares `activityTypeId`, `equipmentTypeId`, `muscleGroupId`, `muscleSubgroupId` e `targetRole`. O backend rejeita o envio simultâneo das formas singular e plural do mesmo critério; o formulário utiliza os parâmetros da tabela.

Aplicar filtros reinicia na página `0` e preserva o tamanho atual. A paginação seguinte utiliza os últimos filtros aplicados, mesmo quando o formulário contém alterações pendentes. `Limpar filtros` reinicia os campos, restaura as opções de subgrupo e consulta a primeira página com o tamanho atual. Os ícones de limpeza de cada classificação alteram apenas o formulário; limpar grupos também limpa subgrupos. Essas ações individuais não enviam uma consulta até a aplicação dos filtros.

Aplicar e limpar todos os filtros ficam bloqueados durante o carregamento da listagem. As consultas HTTP das telas são encerradas quando seus componentes são destruídos.

A busca e a combinação dos critérios são executadas pelo backend. O código consultado confirma busca parcial por nome sem distinção de maiúsculas/minúsculas, com escape de caracteres de `LIKE`, e interseção entre os critérios informados. Grupo, subgrupo e papel são avaliados sobre a mesma associação muscular ativa do exercício. O frontend não deduz músculos, não altera papéis e não filtra localmente a página de exercícios retornada.

### Dependência entre Grupo e Subgrupo

Sem grupo escolhido, todos os subgrupos carregados ficam disponíveis. Com grupo informado, as opções visíveis são restringidas pelo `muscleGroupId` de cada subgrupo.

Toda alteração de grupo pelo seletor limpa os subgrupos escolhidos, inclusive os que continuariam compatíveis, e atualiza as opções visíveis. Limpar o filtro de grupo também limpa os subgrupos e volta a apresentar todas as opções. O subgrupo pode ser informado sem grupo; não há exigência local de escolher um grupo antes.

Esse comportamento organiza o formulário. A consulta efetiva de exercícios continua sendo enviada à API com os critérios aplicados.

## Detalhe e Músculos-Alvo

`GetExerciseByIdResponse` contém os campos da listagem, `active` e `muscleTargets`. A tela apresenta situação, nome, atividade, equipamento, unilateral, composto e descanso sugerido. Ela não calcula descanso nem infere classificações.

Cada `ExerciseMuscleTargetItemResponse` contém `muscleSubgroup` e `targetRole`. O subgrupo inclui seu nome e `muscleGroupId`; a tela consulta `/muscle-groups` separadamente para resolver o nome do grupo, sem depender de uma visita anterior ao catálogo.

O carregamento dos grupos tem estado próprio. Se falhar, as informações do exercício, os subgrupos e seus papéis permanecem disponíveis; a tela apresenta erro com `Tentar novamente`. O retry não duplica uma requisição de grupos pendente. Após sucesso, um grupo ausente da resposta usa `Grupo indisponível`.

Quando `muscleTargets` está vazio, a tela apresenta `Nenhum músculo alvo foi relacionado a este exercício.`. A lista preserva a ordem da API e não cria associações adicionais.

### Representação de `TargetRoleType`

O enum do backend `TargetRoleType` é representado no frontend pela união TypeScript `TargetRole`:

| Valor da API | Rótulo apresentado | Distinção visual no detalhe                            |
| ------------ | ------------------ | ------------------------------------------------------ |
| `PRIMARY`    | Primário           | Fundo elevado, texto em destaque e borda mais espessa. |
| `SECONDARY`  | Secundário         | Badge com borda contínua padrão.                       |
| `STABILIZER` | Estabilizador      | Badge com borda tracejada.                             |

Os mesmos rótulos são usados no filtro de papel muscular. A apresentação identifica exclusivamente o papel recebido da API. O método de rótulo do detalhe mantém o texto recebido como fallback caso não reconheça o valor.

### Recurso Não Encontrado e Erros

Um `404` na consulta do exercício utiliza o mesmo fluxo de diálogo dos demais erros de detalhe: mensagem retornada pelo backend, ou `Não foi possível carregar o exercício.` quando ausente, e retorno ao catálogo depois de fechar o diálogo. Não há uma página separada de exercício inexistente.

Erros dos catálogos auxiliares têm recuperação na própria tela. Listagem e detalhe tratam seus erros de consulta com diálogo e navegação. Respostas `401` também seguem o tratamento global de sessão do interceptor.

## Responsividade e Acessibilidade

Os filtros usam três colunas no desktop, duas no tablet e uma no mobile. A tabela mantém suas seis colunas com rolagem horizontal no próprio container. O detalhe apresenta dois cards lado a lado no desktop e uma coluna no tablet/mobile, permitindo quebra de nomes longos.

Os formulários e cabeçalhos mobile reutilizam os mixins de `_actions.scss`. O retorno e os ícones de limpeza possuem labels acessíveis e tooltips. A tabela oferece foco nas linhas e abertura por teclado; o paginator tem label próprio e recebe a configuração em português do AppShell. Os papéis musculares têm rótulos textuais e diferenças de borda/peso, além da apresentação visual.

## Revisão do Milestone

O [milestone v0.4.0](https://github.com/renancvitor/ironcore-frontend/milestone/4) reúne as seguintes entregas:

| Issue                                                             | Entrega conferida                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [#65](https://github.com/renancvitor/ironcore-frontend/issues/65) | Modelos, catálogos auxiliares, papel muscular, serviço e consulta de subgrupos por grupo.               |
| [#66](https://github.com/renancvitor/ironcore-frontend/issues/66) | Listagem paginada, busca, filtros combinados, dependência entre grupos/subgrupos e abertura do detalhe. |
| [#67](https://github.com/renancvitor/ironcore-frontend/issues/67) | Detalhe, classificações, músculos-alvo, papéis, estados e retorno ao catálogo.                          |
| [#68](https://github.com/renancvitor/ironcore-frontend/issues/68) | Revisão documental e preparação do registro da release.                                                 |

As entregas funcionais foram integradas pelo [PR #69](https://github.com/renancvitor/ironcore-frontend/pull/69), commit `075994b`. A revisão considera também `6feb8ef`, que padronizou a rota de detalhe como `/exercises/:id`. Referências atuais ao catálogo como funcionalidade futura foram atualizadas; as releases anteriores mantêm seu recorte histórico.

### Fontes e Conferência com o Backend

Foram conferidos os contratos, componentes, templates, estilos e testes da feature, suas rotas, navegação global e o diff do milestone. No backend local, a referência consultada foi o commit `93b2df2`, que já contém a atualização de filtros do PR #298.

As documentações de [exercícios](https://github.com/renancvitor/ironcore-backend/blob/main/docs/exercises/README.md) e [filtragem](https://github.com/renancvitor/ironcore-backend/blob/main/docs/filtering/README.md) ainda descrevem os parâmetros singulares. Para os parâmetros efetivamente consumidos pela tela, foram conferidos diretamente:

- [DTO de filtros REST](https://github.com/renancvitor/ironcore-backend/blob/93b2df2/src/main/java/com/ironcore/interfaces/rest/exercise/dto/ListExercisesRequest.java).
- [Mapper REST e validação dos parâmetros](https://github.com/renancvitor/ironcore-backend/blob/93b2df2/src/main/java/com/ironcore/interfaces/rest/exercise/mapper/ExerciseRestMapper.java).
- [Specifications de exercícios](https://github.com/renancvitor/ironcore-backend/blob/93b2df2/src/main/java/com/ironcore/infrastructure/persistence/exercise/specification/ExerciseSpecifications.java).
- [Testes do contrato de listagem](https://github.com/renancvitor/ironcore-backend/blob/93b2df2/src/test/java/com/ironcore/interfaces/rest/exercise/ListExercisesControllerTest.java).

Os DTOs e controllers do backend também confirmam os nomes dos campos, endpoints auxiliares, detalhe e limites de paginação. Esta revisão altera somente a documentação do frontend.

## Testes e Validação Local

Os testes da feature cobrem endpoints, parâmetros, campos opcionais, propagação de erros, envio do formulário, paginação com filtros aplicados, restauração do contexto, limpeza de filtros e dependência muscular. Também verificam loading, estados vazios, recuperação de catálogos auxiliares, abertura por mouse/teclado e cancelamento na destruição.

Os testes do detalhe verificam ID inválido, resposta completa, descanso ausente, grupos, badges, ausência de targets, erro auxiliar com retry, `404`, falha técnica e retorno. Rotas, header e sidebar possuem verificações do acesso ao catálogo.

```bash
npm test -- --watch=false
npm run build
```

Na revisão de 15/10/2026, passaram 431 testes em 46 arquivos e o build de produção concluiu sem avisos. Os testes HTTP usam respostas simuladas. A conferência de contratos com o backend foi feita pela leitura da implementação e dos testes; não foi executado um novo teste autenticado contra a API real nem uma nova verificação visual em navegador nesta etapa documental.

O registro para o pre-release está em [v0.4.0 — Exercise Catalog](../releases/v0.4.0/README.md).

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
