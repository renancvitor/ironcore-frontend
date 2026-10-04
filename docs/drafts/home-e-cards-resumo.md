# IronCore — Diretrizes para Home e Cards-Resumo

## Objetivo

Documentar a direção conceitual da Home do IronCore e dos futuros cards-resumo, preservando as decisões atuais sem transformar ideias em regras definitivas antes da evolução do backend.

A Home deve priorizar informações que respondam rapidamente a uma destas perguntas:

- O que importa para mim agora?
- Qual é o meu estado atual?
- Qual é a próxima ação útil?
- Existe algo recente que merece minha atenção?

A Home não deve virar uma segunda versão das telas de histórico, detalhe ou cadastro.

---

## Princípio para criação de cards

Um card-resumo deve existir apenas quando trouxer valor real ao usuário.

Evitar cards criados apenas porque existe um endpoint ou uma entidade disponível.

Cada card deve, idealmente:

1. apresentar poucas informações;
2. destacar estado atual ou informação recente;
3. oferecer uma ação clara;
4. direcionar para a feature responsável pelos detalhes;
5. não duplicar telas completas já existentes.

---

## 1. Última avaliação corporal

### Estado atual

O backend já disponibiliza:

`GET /api/users/me/body-metrics/latest`

Este é o primeiro card-resumo com utilidade real para a Home.

### Conteúdo sugerido

Exibir apenas indicadores resumidos:

- peso;
- IMC;
- percentual de gordura, quando disponível;
- massa magra, quando disponível;
- data da avaliação utilizada.

Não é necessário exibir:

- todas as circunferências;
- altura;
- observações completas;
- identificadores técnicos.

### Ação

`Ver detalhes`

Deve abrir diretamente:

`/body-metrics/{id}`

### Motivo

A Home apresenta o estado físico mais recente sem substituir o histórico ou a tela completa de detalhes.

---

## 2. Treinos em andamento

### Regra de domínio atual

O IronCore permite múltiplos `WorkoutCycle` em status `IN_PROGRESS`.

Isto é intencional.

Um usuário pode manter ciclos separados, por exemplo:

- musculação;
- cardio;
- abdominal;
- mobilidade;
- corrida;
- outros planejamentos independentes.

Portanto, não deve existir no frontend a suposição de que há apenas um “treino atual”.

### Card sugerido

**Treinos em andamento**

Exibir uma pequena lista dos ciclos `IN_PROGRESS`.

Exemplo:

- Hipertrofia
- Corrida 5 km
- Abdômen

Cada item deve poder abrir seu respectivo treino.

A quantidade de itens exibidos no card será definida posteriormente.

### Ação complementar

`Ver todos`

Deve abrir a futura listagem completa dos ciclos de treino.

### Endpoint disponível atualmente

A listagem já permite filtro por status:

`GET /api/users/me/workout-cycles?workoutStatus=IN_PROGRESS`

Não utilizar `size=1` para representar “treino atual”, pois:

- podem existir vários ciclos em andamento;
- a ordenação atual não representa prioridade;
- o backend não define hoje um ciclo singular como “principal”.

---

## 3. Próximo treino / treino de hoje

### Ideia

Um futuro card pode responder qual treino deve ser executado em seguida.

Existem duas nomenclaturas possíveis:

- **Treino de hoje**
- **Próximo treino**

### Preferência conceitual

`Próximo treino` é semanticamente mais seguro enquanto o domínio não possuir uma agenda/calendário explícito.

`Treino de hoje` exige certeza de que o sistema consegue determinar que uma sessão pertence à data corrente.

### Estrutura existente que ajuda

O backend já possui organização por:

- `WorkoutCycle`;
- `WorkoutDay`;
- `WeekDay`;
- ordem dos dias;
- atividades associadas.

Isso pode tornar simples determinar um próximo dia planejado, mas a regra deve ser validada no domínio antes de o frontend assumir este comportamento.

### Possível card futuro

**Próximo treino**

- Treino B — Costas e bíceps
- ciclo: Hipertrofia
- dia planejado
- quantidade de exercícios

Ação:

`Abrir treino`

Quando existir execução real:

`Iniciar treino`

### Questões ainda abertas

Precisamos decidir futuramente:

- como selecionar o próximo treino quando existem vários ciclos `IN_PROGRESS`;
- se dias da semana representam agenda obrigatória ou apenas organização;
- como lidar com treino atrasado;
- como lidar com mais de um treino previsto no mesmo dia;
- como priorizar treino manualmente;
- se haverá calendário real.

---

## 4. Sessões de treino

### Importância futura

O conceito de sessão executada é provavelmente uma das principais evoluções do IronCore.

O rascunho arquitetural prevê `workout_session_logs`, capazes de representar a execução real de um treino.

Informações possíveis:

- data da execução;
- horário de início;
- horário de término;
- status;
- atividades realizadas;
- séries;
- cargas reais;
- repetições reais;
- duração;
- esforço percebido;
- energia;
- dor;
- observações;
- volume;
- aderência.

### Cuidado de UX

Não exigir preenchimento excessivo para registrar uma sessão.

O fluxo mínimo deve poder ser simples:

`Iniciar treino`

→ executar

`Concluir treino`

Os detalhes podem ser opcionais:

- carga;
- repetições;
- RIR;
- esforço;
- energia;
- dor;
- notas.

### Motivo

Quanto maior o atrito de registro, menor a chance de o usuário manter o histórico atualizado.

A captura de dados deve ser progressiva.

---

## 5. Resumo recente de treino

Quando os logs de sessão existirem, um card poderá apresentar informações como:

**Últimos 7 dias**

- quantidade de treinos realizados;
- tempo total treinado;
- aderência ao planejamento;
- última sessão;
- sequência recente.

Possível ação:

`Ver histórico`

Este card deve depender de dados reais de execução, não apenas da existência de ciclos planejados.

---

## 6. Evolução corporal e gráficos

O backend já disponibiliza quatro conjuntos de dados de progresso:

- composição corporal;
- circunferências;
- percentual de gordura;
- diferenças entre medidas.

Esses recursos não precisam necessariamente virar gráficos completos dentro da Home.

### Possível abordagem

Um card chamado:

**Evolução corporal**

Pode oferecer acessos rápidos para:

- Composição corporal
- Circunferências
- Percentual de gordura
- Comparativo

A Home funcionaria como ponto de entrada para essas visualizações.

### Alternativa futura

Mostrar uma única tendência resumida:

- Peso: 66,0 kg
- ↓ 1,2 kg no período

Isso pode ser mais útil do que exibir um gráfico pequeno e comprimido.

### Decisão ainda aberta

Definir posteriormente se:

1. o card será apenas um menu de acesso;
2. mostrará um mini-resumo;
3. mostrará uma tendência;
4. exibirá algum gráfico pequeno.

Evitar colocar quatro gráficos completos diretamente na Home.

---

## 7. Empty states

A Home deve funcionar mesmo quando o usuário ainda não possuir dados.

Os cards podem existir com `empty-state`, desde que o estado vazio ajude o usuário a entender o que fazer.

Exemplos:

### Última avaliação corporal

`Nenhuma avaliação corporal cadastrada.`

Ação:

`Cadastrar avaliação`

### Treinos em andamento

`Nenhum treino em andamento.`

Ação futura:

`Criar treino`

### Próximo treino

`Nenhum próximo treino disponível.`

### Evolução corporal

`Ainda não há dados suficientes para acompanhar evolução.`

Ação:

`Ver medidas corporais`

O `EmptyStateComponent` compartilhado deve ser reaproveitado sempre que fizer sentido.

---

## 8. Estrutura visual da Home

### Desktop

Preferir grid de cards.

Exemplo:

```text
[ Última avaliação corporal ] [ Treinos em andamento ]

[ Evolução corporal         ] [ Próximo treino       ]
```

### Tablet

Grid adaptável, provavelmente duas colunas quando houver espaço suficiente.

### Mobile

Cards em coluna ou scroll horizontal controlado.

Não criar carrossel automático, autoplay ou comportamento decorativo sem necessidade.

O comportamento final deve ser decidido conforme a quantidade real de cards.

---

## 9. Estratégia de implementação atual

Na Issue atual, é aceitável criar os cards previstos mesmo quando alguns ainda não possuem integração definitiva, desde que:

- estados vazios sejam claros;
- funcionalidades inexistentes não sejam simuladas;
- nenhum dado seja inventado;
- ações indisponíveis não pareçam funcionais;
- a estrutura continue simples.

A Home pode inicialmente testar o comportamento visual dos cards e do `EmptyStateComponent`.

### Primeira integração real

**Última avaliação corporal**

### Outros cards inicialmente possíveis

- Treinos em andamento
- Evolução corporal
- Próximo treino

Esses cards podem começar em empty state enquanto as integrações são definidas.

---

## 10. Regra contra overengineering

Não criar agora:

- framework genérico de dashboard;
- sistema complexo de widgets;
- store global apenas para a Home;
- carrossel reutilizável antes de existir necessidade real;
- componentes abstratos demais;
- regras de domínio no frontend.

Os padrões devem surgir conforme o segundo, terceiro e quarto cards demonstrarem necessidades realmente compartilhadas.

---

## Direção atual resumida

A Home deve evoluir para um dashboard enxuto, orientado a estado atual e próximas ações.

Prioridades conceituais:

1. **Última avaliação corporal** — disponível agora.
2. **Treinos em andamento** — múltiplos ciclos `IN_PROGRESS`.
3. **Próximo treino** — depende de regra de priorização/calendário.
4. **Evolução corporal** — acesso resumido aos recursos de progresso.
5. **Resumo de sessões** — quando logs de execução existirem.

A Home não deve antecipar recursos que o domínio ainda não consegue representar com confiança.

O backend continua sendo a fonte de verdade para:

- estado dos ciclos;
- seleção de treino;
- métricas corporais;
- progresso;
- sessões;
- futuras regras de calendário.
