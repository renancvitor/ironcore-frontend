# Documentação de Avaliação Corporal

## Propósito

A feature `body-metrics` oferece cadastro, histórico paginado, consulta detalhada, resumos da última avaliação e evolução na Home, edição, exclusão, evolução completa e comparação de avaliações corporais da pessoa vinculada ao usuário autenticado.

O frontend apresenta os valores retornados pela API. IMC, percentual de gordura, massa gorda, massa magra, agregação mensal e diferenças entre avaliações são responsabilidades do backend.

## Escopo Atual

Implementado:

- Serviço HTTP e modelos TypeScript para os contratos utilizados.
- Rotas protegidas, carregadas sob demanda dentro do application shell.
- Histórico com paginação do backend e navegação por mouse ou teclado.
- Detalhe por ID e edição na própria página.
- Última avaliação em página independente e resumo na Home.
- Resumo de evolução na Home com dados reais do backend e acesso à página completa com retorno contextual.
- Cadastro com campos e validações compartilhados com a edição.
- Exclusão pelo histórico, com confirmação e bloqueio de saída durante a operação.
- Evolução com três tipos de gráfico e comparativo no mesmo seletor de visão.
- Testes de serviços, componentes, apresentação, formulários e integração entre rotas.

## Estrutura e Responsabilidades

| Arquivo/diretório                               | Responsabilidade atual                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `body-metrics.models.ts`                        | Requests, responses e enums conforme os contratos da API.                         |
| `body-metrics.service.ts`                       | Chamadas HTTP a partir de `API_BASE_URL`, sem cache de avaliações.                |
| `body-metrics.form.ts`                          | Factory do formulário reativo usada pelo cadastro e pela edição.                  |
| `body-metrics.validators.ts`                    | Validação de números finitos, positivos e dentro dos limites conhecidos.          |
| `form-fields`                                   | Campos, labels, unidades e mensagens de validação compartilhados.                 |
| `history`                                       | Listagem, paginação, acesso ao detalhe e exclusão; guard de saída durante DELETE. |
| `details`                                       | Consulta por ID, apresentação completa e edição dos campos previstos no PUT.      |
| `latest`                                        | Consulta da última avaliação, loading, ausência de dados e tratamento de erro.    |
| `create`                                        | Cadastro, montagem do POST e navegação após sucesso.                              |
| `progress`                                      | Período aplicado, seleção de visão, consulta, loading, erro e retry.              |
| `progress/chart`                                | Gráfico SVG, seleção de séries e tabela mensal de valores.                        |
| `progress/changes`                              | Referências e variações recebidas do backend.                                     |
| `progress/body-metrics-progress-chart.utils.ts` | Datas, validação do período e coordenadas de apresentação do gráfico.             |
| `features/home/components`                      | Composição dos cards da Home, com resumos de `/latest` e `/progress/changes`.     |

## Rotas e Navegação

Todas as rotas abaixo pertencem à área protegida por `authGuard`:

| Rota                     | Tela                                              |
| ------------------------ | ------------------------------------------------- |
| `/body-metrics`          | Histórico e exclusão.                             |
| `/body-metrics/latest`   | Última avaliação completa, com retorno ao início. |
| `/body-metrics/progress` | Evolução e comparativo, com retorno contextual.   |
| `/body-metrics/create`   | Cadastro, com cancelamento para o histórico.      |
| `/body-metrics/:id`      | Detalhe e edição, com retorno ao histórico.       |

As rotas estáticas são declaradas antes de `:id`. A sidebar oferece histórico e evolução; o header oferece acesso ao histórico. O histórico também possui ações para nova avaliação e evolução.

O card da Home abre `/body-metrics/progress?from=home`; a ação do histórico usa `from=history`. A mesma página completa é reutilizada. Seu botão, label acessível e tooltip indicam retorno ao início quando `from=home`, e ao histórico nos demais casos. Acesso direto, origem ausente ou inválida e acesso pela sidebar usam o histórico como fallback. A origem é lida da URL, inclusive após recarregamento; não há destino arbitrário de retorno. Abrir a evolução pela sidebar remove a origem da Home, mesmo quando a página já está aberta.

## Contratos do Backend

Todos os endpoints usam a base `/api/users/me/body-metrics` e exigem sessão por cookie. O serviço utiliza a infraestrutura HTTP existente; `withCredentials`, restauração de sessão e tratamento de `401` estão descritos em [Arquitetura](../architecture/README.md).

| Método   | Caminho relativo à base      | Entrada                                      | Resposta de sucesso                               |
| -------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `POST`   | base                         | Peso, altura, circunferências e observações. | `201`, avaliação criada.                          |
| `PUT`    | `/{id}`                      | ID e os campos editáveis completos.          | `200`, avaliação recalculada com `updatedAt`.     |
| `DELETE` | `/{id}`                      | ID.                                          | `204`, sem corpo.                                 |
| `GET`    | base                         | `page` e `size` opcionais.                   | `200`, objeto `metrics` com página de avaliações. |
| `GET`    | `/{id}`                      | ID.                                          | `200`, avaliação completa.                        |
| `GET`    | `/latest`                    | Sem parâmetros.                              | `200`, avaliação mais recente.                    |
| `GET`    | `/progress/body-composition` | `startDate` e `endDate`.                     | `200`, séries de peso, massa gorda e massa magra. |
| `GET`    | `/progress/circumferences`   | `startDate` e `endDate`.                     | `200`, séries das circunferências disponíveis.    |
| `GET`    | `/progress/body-fat`         | `startDate` e `endDate`.                     | `200`, série de percentual de gordura.            |
| `GET`    | `/progress/changes`          | `startDate` e `endDate`.                     | `200`, referências e variações por medida.        |

O cliente não envia `personId`, datas de medição/atualização ou indicadores calculados. O backend resolve a pessoa pelo usuário autenticado e define `measuredAt` na criação.

### Campos de Cadastro e Edição

| Campo               | Regra utilizada no formulário                                       |
| ------------------- | ------------------------------------------------------------------- |
| `weightKg`          | Obrigatório, finito, maior que zero e até 500 kg.                   |
| `heightCm`          | Obrigatório, finito, maior que zero e até 300 cm.                   |
| Cada circunferência | Opcional; quando preenchida, finita, maior que zero e até 300 cm.   |
| `notes`             | Texto livre opcional; o formulário não estabelece limite adicional. |

`circumferences` contém `neckCm`, `chestCm`, `shoulderCm`, `armCm`, `forearmCm`, `waistCm`, `hipCm`, `thighCm` e `calfCm`. Campos opcionais vazios são enviados como `null`; quando nenhuma circunferência foi preenchida, o objeto inteiro é `null`.

Exemplo de payload mínimo produzido pelo frontend, válido para POST e PUT:

```json
{
  "weightKg": 82.4,
  "heightCm": 178,
  "circumferences": null,
  "notes": null
}
```

O PUT exige peso e altura. Ele substitui os campos editáveis enviados, inclusive opcionais removidos pelo usuário; não representa um PATCH. `measuredAt` permanece preservado e os cálculos são refeitos pelo backend.

### Respostas e Erros

Criação, edição e consultas completas retornam `id`, `personId`, `measuredAt`, peso, altura, circunferências, `bmi`, `bodyFatPercentage`, `fatMassKg`, `leanMassKg` e `notes`. Edição retorna `updatedAt`; detalhe e última avaliação podem retornar essa data como `null`.

Os indicadores de composição corporal e as circunferências podem estar ausentes. Medições parciais são válidas; o frontend não exige medidas somente para viabilizar um cálculo opcional.

As operações tratam a mensagem de erro da API quando disponível e usam uma mensagem local de fallback. Os contratos incluem erros de validação, sessão, permissão, recurso inexistente e falha técnica; criação, edição e progresso também podem retornar `422`. O frontend não mapeia a lista de erros do backend individualmente para os controles do formulário.

Em `/latest`, `404` é apresentado como ausência de avaliação. No detalhe, avaliação inexistente gera diálogo e retorno ao histórico após seu fechamento. No histórico e em `/latest`, outros erros geram diálogo e navegação para o início; evolução e comparativo mantêm erro na página com ação de retry.

### Referências do Contrato

- [Documentação de avaliação corporal do backend](https://github.com/renancvitor/ironcore-backend/blob/main/docs/body-metrics/README.md).
- [Swagger/OpenAPI do backend](https://github.com/renancvitor/ironcore-backend/blob/main/docs/swagger/README.md).
- [Interface documental REST](https://github.com/renancvitor/ironcore-backend/blob/main/src/main/java/com/ironcore/interfaces/rest/bodymetrics/api/BodyMetricsApi.java).

O OpenAPI é gerado pelo backend em `/v3/api-docs`. Sua descrição do PUT menciona atualização parcial, mas o request exige peso e altura e a implementação substitui os campos editáveis. A descrição acima registra a semântica efetivamente utilizada pelo frontend.

## Histórico e Paginação

A consulta inicial omite `page` e `size`, delegando os padrões à API: página `0` e tamanho `20`. As próximas consultas enviam os parâmetros do paginator; a UI permite tamanhos de 10, 20, 50 e 100. O backend aceita página a partir de zero e tamanho entre 1 e 100.

`metrics` contém `content`, `page`, `size`, `totalElements`, `totalPages` e `last`. Cada item contém ID, data, peso, altura e observações. A tabela preserva a ordenação recebida, definida pelo backend por `measuredAt` decrescente e ID decrescente no desempate.

O paginator usa os metadados retornados e o provider em português do AppShell. Não há paginação exclusivamente no frontend. Quando `totalElements` é zero, a tela apresenta ausência de avaliações; quando só a página solicitada está vazia, a paginação permanece disponível. Linhas abrem detalhes por clique, Enter ou Space; a exclusão não propaga o evento para a linha.

## Detalhe e Última Avaliação

O detalhe valida o ID da rota e consulta `getById`. Exibe peso, altura, IMC, composição corporal, todas as circunferências, observações, data da avaliação e data de atualização quando existente. Valores opcionais ausentes usam indicação visual de ausência, sem inventar números.

`BodyMetricsLatestComponent` consulta `/latest` e mantém seus próprios estados. Sua página completa é independente do detalhe por ID e retorna ao início.

O card da Home reutiliza esse componente com `contentTemplate`, substituindo apenas a apresentação de sucesso. O card exibe data, peso e, quando disponíveis, percentual de gordura, massa gorda e massa magra. Não exibe altura, IMC, circunferências ou observações. A ação `Ver detalhes` abre `/body-metrics/latest`.

## Resumo de Evolução na Home

`BodyMetricsProgressCardComponent` consulta `/progress/changes` pelo mesmo `BodyMetricsService`, usando `defaultProgressPeriod`: do primeiro dia do mês de cinco meses atrás até hoje. O card faz uma consulta própria de comparativo; não carrega os três gráficos na Home.

O resumo seleciona, nesta ordem, peso, percentual de gordura, massa gorda e massa magra quando retornados. Cada medida apresenta a diferença absoluta, a variação relativa percentual e suas próprias datas inicial e final. Valores e diferenças são os recebidos do backend, sem recálculo ou classificação de melhora/piora. A diferença absoluta de percentual de gordura usa pontos percentuais (`p.p.`); sua variação relativa continua em `%`. Medidas ausentes não são inventadas, e circunferências/IMC não fazem parte deste resumo.

Durante a consulta, há loading e indicação acessível de estado. Erros são apresentados no card com `Tentar novamente`, sem redirecionamento; novas tentativas não duplicam uma consulta pendente. Sem medidas elegíveis, o empty state explica a necessidade de pelo menos duas avaliações válidas por medida no período, mesmo que existam mudanças de outras medidas na resposta. A requisição é cancelada quando o card é destruído.

A ação `Ver evolução completa` permanece disponível nos estados de loading, erro, ausência de dados e sucesso. Ela abre `/body-metrics/progress?from=home`, preservando o retorno ao início na mesma página completa utilizada pelo histórico.

## Evolução e Comparativo

### Seleção de Período

A página inicia em composição corporal, do primeiro dia do mês de cinco meses atrás até hoje. O usuário edita datas e aplica o período; mudar o tipo de visão utiliza as últimas datas aplicadas, sem enviar alterações ainda não confirmadas.

As datas usam `YYYY-MM-DD`, são obrigatórias e não podem ser futuras. A inicial não pode superar a final. O limite corresponde a 12 meses a partir da data inicial, menos um dia, conforme o backend. Datas inválidas não geram consulta.

Ao mudar período ou visão, a requisição anterior é cancelada e o resultado antigo é limpo. A requisição pendente também é cancelada na destruição da página.

### Gráficos

As respostas contêm `startDate`, `endDate`, `chartType` e `series`. Cada série contém `metric`, `label`, `unit` e pontos com `period` no formato `YYYY-MM` e `value`.

O backend seleciona o último valor válido de cada medida em cada mês e ignora valores nulos ou não positivos. O frontend ordena os pontos para apresentação, calcula somente coordenadas SVG e mantém os valores recebidos.

As linhas conectam os pontos reais, inclusive entre meses sem dados, sem preencher medições intermediárias. Um ponto isolado permanece visível com aviso de dados insuficientes para traçar uma linha. Ausência de séries com pontos gera empty state.

As séries têm cores estáveis por medida, adaptadas aos temas claro e escuro. A legenda permite ocultá-las no gráfico; a tabela complementar preserva todos os valores recebidos. Gráfico e tabela têm rolagem horizontal em telas pequenas, e a primeira coluna da tabela permanece fixa. Os pontos oferecem tooltips SVG nativos com medida, mês, valor e unidade.

### Comparativo

`Comparativo` é a quarta opção da mesma página e utiliza somente `/progress/changes` para o período aplicado. A resposta contém `startDate`, `endDate` e `changes`.

Cada mudança contém `metric`, `label`, `unit`, `firstDate`, `firstValue`, `lastDate`, `lastValue`, `absoluteChange` e `percentageChange`. O backend seleciona o primeiro e último valor válido de cada medida no período, antes da agregação mensal dos gráficos. São necessárias pelo menos duas avaliações válidas daquela medida; as datas de referência podem variar entre medidas.

A tabela apresenta referências, datas, diferenças absolutas e percentuais. O frontend formata os números e preserva os sinais positivo, negativo e zero, sem recalcular diferenças nem classificá-las como melhora ou piora. Quando `changes` está vazio, a UI explica a necessidade de dados suficientes. A tabela mantém a coluna da medida fixa e permite rolagem horizontal no mobile.

## Cadastro, Edição e Exclusão

### Cadastro

O cadastro reutiliza `createBodyMetricsForm`, os validadores e `BodyMetricsFormFieldsComponent`. Um formulário inválido revela os erros e não envia o POST. Durante a requisição, salvar/cancelar ficam desabilitados e o handler bloqueia reenvios, inclusive por novo evento de submit.

Após sucesso, a aplicação navega para `/body-metrics/{id}` e apresenta o toast somente quando a navegação é concluída. Uma falha mantém os valores preenchidos e permite nova tentativa após o diálogo.

### Edição

A edição ocorre dentro do detalhe já carregado. Ao iniciá-la, os valores salvos preenchem o mesmo formulário usado pelo cadastro; datas, identificadores e indicadores calculados não são editáveis.

Durante o PUT, o formulário fica desabilitado e os handlers bloqueiam salvar novamente, cancelar ou voltar pelo botão da página. Após sucesso, o detalhe utiliza a resposta atualizada, sai da edição e apresenta toast. Após falha, os campos são reabilitados e as alterações são preservadas. Cancelar sem gravar retorna à consulta; uma nova edição é preenchida com os valores salvos.

### Exclusão

A exclusão é oferecida nas linhas do histórico e exige confirmação em `DialogService`. Cancelar não envia DELETE. Durante a operação, `deletingId` bloqueia novas exclusões, paginação, ações locais e saída por navegação Angular através de `bodyMetricsHistoryGuard`.

Após `204`, a lista anterior é removida, um toast é exibido e o histórico é consultado novamente com a paginação padrão do backend. Se essa recarga falhar, a avaliação excluída não reaparece. Após erro no DELETE, a lista é preservada e o bloqueio é liberado. A exclusão não é oferecida na página de detalhe.

## Componentes Compartilhados e Estado

O estado das páginas usa signals locais. `BodyMetricsService` não mantém cache, store global ou invalidação centralizada. Cadastro navega para um detalhe recém-carregado; edição substitui o detalhe pela resposta do PUT; exclusão recarrega o histórico. Histórico, Home, última avaliação, gráficos e comparativo fazem novas consultas ao serem visitados novamente.

Essa estratégia é protegida por testes de integração entre rotas para criação, edição e exclusão. Ela não representa sincronização entre abas ou atualização em tempo real.

Campos e validações de cadastro/edição são compartilhados, mantendo requests e respostas próprios por operação. Botões, loading, empty state, dialogs e toasts usam os componentes existentes. Actions com ícones mantêm `aria-label` e tooltips Material. A formatação usa locale `pt-BR`, unidades `kg` e `cm`, percentual e datas legíveis.

Os padrões de actions mobile estão em [Disposição de ações no mobile](../architecture/mobile-actions.md). A composição da Home usa `SummaryCardComponent`, sem criar outro serviço, store ou sistema de widgets. A Home consulta `/latest` para a última avaliação e `/progress/changes` para o resumo de evolução; ambos são recarregados ao visitá-la novamente.

## Decisões de UX e Escopo

Os comportamentos abaixo são decisões consolidadas para a experiência de avaliação corporal na `v0.3.0`.

- O resumo de evolução da Home usa o período padrão e quatro medidas de composição corporal. Seleção de outro período, gráficos, circunferências e comparativo completo ficam na página de evolução.
- Cadastro e edição bloqueiam suas ações locais durante gravação. A navegação global permanece disponível, sem confirmação de alterações não salvas. O guard de saída é específico da exclusão no histórico.
- As páginas consultam os dados ao serem visitadas novamente. Atualizações em outra aba ou feitas diretamente no backend seguem esse mesmo fluxo de consulta.
- A data da avaliação (`measuredAt`) é definida pelo backend. Cadastro e edição concentram-se nas medidas e observações.
- O comparativo usa o período selecionado e as referências retornadas pelo backend. Comparação por seleção arbitrária de dois IDs, exportação de dados e projeções de tendências ficam fora do escopo entregue.

A composição e as decisões de produto dos cards estão em [Home e Cards-Resumo](../card-resume/README.md), com o comportamento entregue e as diretrizes para integrações futuras identificados separadamente.

## Testes e Validação Local

Os testes cobrem contratos HTTP, paginação, rotas protegidas e carregadas sob demanda, estados de tela, dados opcionais, acessibilidade dos campos, limites de validação, apresentação de gráficos/comparativo e consultas dependentes após mutações. O card de evolução possui testes de medidas elegíveis, diferenças recebidas da API, unidades, estados, retry e cancelamento. A navegação contextual é testada a partir da Home e histórico, em acesso direto/recarregamento, com origem inválida e pela sidebar. O cadastro também possui regressão para reentrada no handler e novo submit durante POST pendente.

Para instalar as dependências a partir do lockfile:

```bash
npm ci
```

Para iniciar a aplicação com o backend disponível em `http://localhost:8080`:

```bash
npm start
```

Para executar os testes locais:

```bash
npm test -- --watch=false
```

Para validar o build de produção:

```bash
npm run build
```

Os testes HTTP do frontend usam respostas simuladas; não são validação de CRUD autenticado em uma API real. O registro técnico desta entrega está em [v0.3.0](../releases/v0.3.0/README.md).

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
