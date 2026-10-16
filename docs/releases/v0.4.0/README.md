# v0.4.0 - Exercise Catalog

## Resumo

`v0.4.0` registra a entrega frontend do catálogo de exercícios sobre os fluxos de autenticação, conta e avaliação corporal existentes. Ela permite localizar exercícios por busca e filtros combinados, percorrer a listagem paginada e consultar classificações e músculos-alvo no detalhe.

Este documento prepara o conteúdo do pre-release correspondente ao [milestone v0.4.0](https://github.com/renancvitor/ironcore-frontend/milestone/4), com fechamento documental pela [Issue #68](https://github.com/renancvitor/ironcore-frontend/issues/68). A preparação não publica uma GitHub Release, cria tag ou disponibiliza artefatos.

## Principais Mudanças

- Feature `features/exercise` com modelos e serviço HTTP para o catálogo global de exercícios.
- Integração dos catálogos auxiliares de atividade, equipamento, grupo e subgrupo muscular.
- Listagem com paginação do backend, busca por nome e filtros combinados por classificações e papel muscular.
- Opções de subgrupo condicionadas aos grupos escolhidos, com limpeza dos subgrupos ao alterar o grupo.
- Consulta por critérios aplicados, mantendo alterações pendentes do formulário separadas da paginação.
- Preservação em memória da busca, página e tamanho ao abrir um detalhe e voltar ao catálogo.
- Rotas protegidas `/exercises` e `/exercises/:id`, carregadas sob demanda no AppShell.
- Acesso ao catálogo pelo header e sidebar; no mobile, acesso pelo menu lateral.
- Detalhe com situação, atividade, equipamento, unilateral, composto, descanso sugerido e músculos-alvo.
- Apresentação de subgrupos, grupos correspondentes e badges de Primário, Secundário e Estabilizador a partir dos papéis retornados.
- Loading, estados vazios, diálogo para erros de consulta e retry para falhas dos catálogos auxiliares.
- Formulários responsivos, tabela com rolagem horizontal, abertura de linhas por teclado e ações com labels e tooltips.
- Ajuste de quebra de conteúdo nos cards-resumo existentes da Home.
- Documentação da feature, visão geral, arquitetura, estrutura, ações mobile e índices atualizados.

## Notas Técnicas

- `ExerciseService` utiliza `API_BASE_URL` e a base `/api/exercise-catalog`, com a infraestrutura de sessão por cookie existente.
- As classificações auxiliares expõem `id`, `code` e `name`; subgrupos acrescentam `muscleGroupId`. A interface apresenta os nomes da API.
- A listagem recebe `exercises`, com `content`, `page`, `size`, `totalElements`, `totalPages` e `last`. A consulta inicial envia página `0` e tamanho `20`; o paginator oferece 10, 20, 50 e 100 itens.
- Busca e filtros são enviados ao backend. O frontend preserva a ordenação recebida, por nome e ID ascendentes, e não reproduz regras de consulta dos exercícios.
- O serviço suporta consulta de subgrupos por `muscleGroupId`; a tela carrega todos e restringe as opções visíveis localmente. Isso organiza as opções do formulário, sem filtrar os resultados de exercícios no navegador.
- `ExerciseCatalogStateService` preserva os filtros aplicados e a paginação durante a navegação. Voltar do detalhe refaz a consulta com esse contexto; recarregar a aplicação reinicia a busca. Esse comportamento é uma escolha de UX confirmada pelo mantenedor.
- Aplicar ou limpar todos os filtros reinicia na página `0` e mantém o tamanho atual. A limpeza individual modifica somente o formulário até uma nova aplicação.
- O detalhe consulta exercício e grupos musculares independentemente. Falhar a consulta auxiliar não remove as informações recebidas do exercício e permite tentar os grupos novamente.
- `TargetRole` representa os valores de `TargetRoleType`: `PRIMARY`, `SECONDARY` e `STABILIZER`. Labels e badges identificam esses valores sem inferir regras musculares adicionais.
- Descanso não informado é apresentado como `—`; valores presentes usam segundos. As flags unilateral e composto vêm do backend.
- ID de rota inválido retorna ao catálogo sem consulta. Um `404` abre diálogo e retorna após seu fechamento. Erros de listagem retornam ao início depois do diálogo; `401` também segue o interceptor global.
- A implementação funcional foi integrada pelo [PR #69](https://github.com/renancvitor/ironcore-frontend/pull/69), commit `075994b`; `6feb8ef` padronizou o detalhe como `/exercises/:id`.
- A conferência do contrato considerou o backend em `93b2df2`. A documentação textual do backend ainda descreve filtros singulares; os parâmetros utilizados foram conferidos nos DTOs, mapper, Specifications e testes. As referências estão em [Catálogo de Exercícios](../../exercises/README.md#fontes-e-conferência-com-o-backend).

## Limitações Conhecidas

Não houve itens classificados como limitações pelo mantenedor nesta revisão. A preservação da busca ao voltar e sua limpeza ao recarregar são comportamentos intencionais, descritos nas notas técnicas.

## Não Incluído Nesta Release

- Criação, edição ou exclusão de exercícios, classificações auxiliares ou associações musculares, conforme o escopo das Issues #65, #66 e #67 e os contratos de consulta do backend.
- Planejamento e execução de treinos na interface, nem integração do card de treinos da Home.
- Deploy, publicação de artefatos, criação de tag ou publicação efetiva do pre-release.

## Validação Local

```bash
npm test -- --watch=false
npm run build
```

Na revisão de 15/10/2026, os 431 testes passaram em 46 arquivos. O build de produção concluiu sem avisos.

A suíte cobre serviço HTTP, formulário, filtros aplicados, paginação, restauração da busca, grupos/subgrupos, estados, erros, retry, detalhe, papéis musculares, rotas e navegação global. Os testes do frontend usam respostas simuladas; a conferência do backend foi por leitura dos contratos, implementação e testes, sem nova execução autenticada da API ou verificação visual em navegador nesta etapa.

Esta revisão não verificou a automação do GitHub Project. O workflow de CI existente permanece responsável por build e testes em pushes e pull requests para `main`.

<p align="right"><a href="../README.md">Voltar para releases</a></p>
