<!-- Registro histórico reconciliado na Issue #101. Fonte: https://github.com/renancvitor/ironcore-frontend/releases/tag/v1.1.0; publicação: 2026-10-24T21:53:44Z; prerelease: false. Conteúdo oficial preservado abaixo. -->

# v1.1.0 - Início da Semana Configurável no Planejamento de Treinos

## Resumo

A `v1.1.0` introduz a configuração do início da semana nos ciclos de treino do IronCore Frontend.

O usuário agora pode escolher qual dia inicia a apresentação semanal de cada ciclo, permitindo organizar visualmente os treinos a partir de qualquer dia, sem alterar suas datas, dias da semana ou posições persistidas.

A atualização integra o novo contrato do backend, aprimora a interface de planejamento e preserva as funcionalidades existentes de composição e reordenação.

## Principais Mudanças

### Configuração do Ciclo de Treino

- Adição do seletor **Início da semana** ao formulário compartilhado de criação e edição.
- Disponibilização dos sete dias da semana.
- Definição de `SUNDAY` como valor inicial na criação.
- Carregamento do valor persistido durante a edição.
- Envio de `weekStartsOn` nas requisições de criação e atualização.
- Exibição da configuração no card de informações gerais do ciclo.
- Atualização imediata da apresentação após salvar, utilizando a resposta do backend.

### Ordenação Visual dos Dias

- Implementação da ordenação circular baseada em `weekStartsOn`.
- Preservação da sequência semanal natural a partir do dia configurado.
- Manutenção de `sortOrder` entre sessões do mesmo `weekDay`.
- Apresentação exclusiva dos dias que possuem treinos cadastrados.
- Preservação dos valores originais de `weekDay`, `sortOrder` e da composição recebida da API.

Por exemplo, um ciclo configurado para iniciar no sábado segue a sequência:

`SATURDAY → SUNDAY → MONDAY → TUESDAY → WEDNESDAY → THURSDAY → FRIDAY`

### Melhorias na Edição dos Dias

- Renomeação da ação **Reordenar dia** para **Alterar dia ou posição**.
- Preservação da transferência de sessões entre dias da semana.
- Exibição do seletor **Posição no dia** somente quando existem múltiplas posições disponíveis.
- Manutenção da posição `1` quando o dia de destino possui uma única posição possível.
- Preservação da reordenação de atividades e exercícios.

## Integração com o Backend

- Atualização dos contratos TypeScript de `WorkoutCycle`.
- Inclusão de `weekStartsOn` nos requests e responses aplicáveis.
- Integração com os endpoints REST existentes, sem criação de novas rotas.
- Reutilização de `WorkoutPlanningService` e dos componentes de formulário já existentes.
- Responsabilidade da ordenação visual mantida no frontend.
- Normalização de posições, validações de domínio e persistência continuam sob responsabilidade da API.

A funcionalidade utiliza o contrato disponibilizado pelo IronCore Backend `v1.2.0`.

## Decisões Funcionais e Arquiteturais

- O início da semana é configurado individualmente para cada ciclo.
- A configuração não exige a existência de um treino no primeiro dia escolhido.
- Dias sem sessões cadastradas não produzem cartões vazios.
- A ordenação circular não permite uma sequência semanal arbitrária.
- A apresentação utiliza uma cópia dos dias recebidos, sem modificar seus valores persistidos.
- A edição continua disponível somente nos estados permitidos pelo backend.
- Os fluxos anteriores de Workout Planning permanecem disponíveis.

## Testes e Validação

A cobertura automatizada foi ampliada para incluir:

- Valor padrão `SUNDAY`.
- Seleção dos sete dias da semana.
- Criação de ciclos com início personalizado.
- Carregamento e edição de configurações existentes.
- Atualização imediata após salvar.
- Ordenação circular para diferentes dias iniciais.
- Preservação de `sortOrder` e dos dados recebidos.
- Transferência de sessões únicas entre dias.
- Exibição condicional das posições disponíveis.
- Compatibilidade dos contratos HTTP e fluxos de navegação.

Validação automatizada:

- `npm run build`
- `npm test`
- **724 testes aprovados em 61 arquivos.**
- Build e CI aprovados.

A funcionalidade foi validada localmente e em produção, incluindo a persistência da configuração após uma nova autenticação.

## Compatibilidade e Limitações

Ciclos anteriores permanecem configurados para iniciar no domingo, preservando sua apresentação original.

A versão mantém a integração com autenticação, Body Metrics, Exercise Catalog, Home e demais funcionalidades existentes.

Não foram adicionados registro de Workout Sessions, histórico de treinos executados, seleção automática do treino do dia ou geração de treinos por IA.

## Documentação

Documentação técnica atualizada:

- `docs/workout-planning/README.md`

As documentações históricas das releases anteriores permanecem preservadas.

A `v1.1.0` aprimora a organização visual dos ciclos de treino, oferecendo maior flexibilidade ao usuário sem comprometer as regras de negócio ou a integração existente com o IronCore Backend.

Registro reconciliado na Issue #101 a partir da [release oficial v1.1.0](https://github.com/renancvitor/ironcore-frontend/releases/tag/v1.1.0), publicada em 24/10/2026 como versão estável. O conteúdo oficial acima foi preservado; suas validações pertencem àquela publicação.

<p align="right"><a href="../README.md">Voltar para releases</a></p>
