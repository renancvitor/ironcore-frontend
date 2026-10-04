# IronCore — Home e Cards-Resumo v2

## Objetivo

Documentar a direção atual da Home do IronCore com base no backend implementado, nas decisões de produto já tomadas e nas funcionalidades futuras já previstas.

Este documento substitui o rascunho anterior sobre cards-resumo e deve ser tratado como referência de produto/arquitetura para a evolução da Home.

A Home não deve funcionar como uma segunda tela de listagem, histórico ou detalhe.

Ela deve funcionar como uma **central de situação**, mostrando:

- estado atual relevante;
- informações recentes;
- próximos caminhos úteis;
- atalhos para features importantes.

---

# 1. Princípio dos cards-resumo

Um card da Home deve existir apenas quando trouxer valor real para o usuário.

O fato de uma entidade ou endpoint existir não é motivo suficiente para criar um card.

Cada card deve, preferencialmente:

1. apresentar poucas informações;
2. representar estado real do backend;
3. evitar duplicação de telas completas;
4. oferecer uma ação clara;
5. direcionar para a feature responsável pelos detalhes;
6. possuir empty state apenas quando a ausência de dados for real no domínio.

A Home não deve inventar lógica de negócio.

O backend continua sendo a fonte de verdade para:

- estado de ciclos;
- métricas corporais;
- evolução;
- sessões;
- calendário;
- seleção de próximo treino;
- regras futuras de execução.

---

# 2. Cards aprovados para a estrutura inicial

Foram definidos três cards iniciais:

1. Última avaliação corporal
2. Treinos em andamento
3. Evolução corporal

Esses três cards possuem respaldo real no backend atual.

Outros cards podem surgir posteriormente, mas não devem ser antecipados sem suporte real do domínio.

---

# 3. Última avaliação corporal

## Status

Aprovado para implementação real agora.

## Endpoint

`GET /api/users/me/body-metrics/latest`

## Objetivo

Mostrar rapidamente o estado corporal mais recente do usuário sem obrigá-lo a abrir o histórico completo.

## Conteúdo sugerido

Exibir apenas informações resumidas:

- peso;
- IMC;
- percentual de gordura, quando disponível;
- massa magra, quando disponível;
- data da avaliação utilizada.

## Não exibir no card

- todas as circunferências;
- observações completas;
- identificadores técnicos;
- informações que já pertencem à tela de detalhes.

A altura também pode ser omitida do resumo, pois é um dado de baixa variação e pouco valor contextual na Home.

## Ação

`Ver detalhes`

Navegação:

`/body-metrics/{id}`

## Empty state

Quando `/latest` não encontrar avaliações:

`Nenhuma avaliação corporal cadastrada.`

Ação futura possível:

`Cadastrar avaliação`

Esse empty state representa uma ausência real de dados no backend.

---

# 4. Treinos em andamento

## Status

Aprovado conceitualmente e sustentado pelo backend atual.

## Regra de domínio

O IronCore permite múltiplos `WorkoutCycle` em `IN_PROGRESS`.

Isso é intencional.

Exemplos:

- musculação;
- cardio;
- abdominal;
- corrida;
- mobilidade;
- planejamentos independentes.

O frontend não deve assumir que existe um único “treino atual”.

## Endpoint atual

`GET /api/users/me/workout-cycles?workoutStatus=IN_PROGRESS`

## Estrutura do card

O card deve mostrar uma pequena lista dos ciclos em andamento.

Exemplo:

```text
Treinos em andamento

Hipertrofia
Objetivo: Hipertrofia

Corrida 5 km
Objetivo: Resistência

Abdominais
Objetivo: ...

Ver todos →
```

## Campos disponíveis atualmente

A listagem já retorna:

- id;
- name;
- workoutStatus;
- trainingGoal;
- startDate;
- endDate;
- desiredDurationMonths.

O card não deve exibir todos esses dados.

A preferência atual é por uma apresentação enxuta:

- nome do ciclo;
- objetivo de treino;
- possivelmente data inicial em segundo plano visual.

## Navegação

Cada item deve poder abrir seu respectivo ciclo.

A ação:

`Ver todos`

deve levar à futura listagem completa dos ciclos.

## Quantidade de itens

Ainda será definida.

`3 itens + Ver todos` é um candidato inicial forte, mas não é regra definitiva.

## Empty state

`Nenhum treino em andamento.`

Esse empty state é legítimo porque representa diretamente o resultado da consulta filtrada por `IN_PROGRESS`.

---

# 5. Evolução corporal

## Status

Aprovado como card da Home.

Sua integração completa depende das telas relacionadas às Issues de evolução e comparação.

## Recursos disponíveis no backend

O backend disponibiliza:

`GET /api/users/me/body-metrics/progress/body-composition`

`GET /api/users/me/body-metrics/progress/circumferences`

`GET /api/users/me/body-metrics/progress/body-fat`

`GET /api/users/me/body-metrics/progress/changes`

## Observação importante

Não são quatro gráficos.

Os três primeiros endpoints retornam séries para visualização gráfica.

`/progress/changes` retorna comparação entre valores e diferenças:

- firstValue;
- lastValue;
- absoluteChange;
- percentageChange.

## Estrutura sugerida do card

**Evolução corporal**

Acessos possíveis:

- Composição corporal
- Circunferências
- Percentual de gordura
- Comparativo

## Objetivo

O card funciona como ponto de entrada rápido para os recursos de evolução.

Ele não deve exibir quatro gráficos completos dentro da Home.

## Possível evolução futura

Quando as telas de progresso estiverem prontas, o card poderá incluir um pequeno resumo ou tendência.

Exemplo:

```text
Peso
66,0 kg
↓ 1,2 kg no período
```

Isso deve ser avaliado futuramente.

## Empty state

O empty state deve representar ausência real de dados suficientes para evolução.

Exemplo:

`Ainda não há dados suficientes para acompanhar evolução.`

Não usar empty state para esconder funcionalidades ainda não implementadas.

---

# 6. Treino de hoje / Próximo treino

## Status

Não implementar agora.

## Motivo

O backend possui uma estrutura forte de planejamento:

```text
WorkoutCycle
  └── WorkoutDay
       ├── weekDay
       ├── title
       └── sortOrder
```

Também existe o enum `WeekDay`, cobrindo todos os dias da semana.

Porém, isso ainda não representa um calendário real de execução.

## Limitações atuais

O IronCore permite:

- múltiplos ciclos `IN_PROGRESS`;
- múltiplos `WorkoutDay` no mesmo dia da semana;
- múltiplos ciclos com treinos no mesmo dia.

Exemplo:

```text
Musculação
  Segunda → Peito

Corrida
  Segunda → Corrida leve

Core
  Segunda → Abdômen
```

Portanto, “Treino de hoje” não é necessariamente singular.

## Problema com “Próximo treino”

Sem histórico real de execução, o sistema não sabe se o usuário cumpriu o treino anterior.

Exemplo:

```text
Segunda → Treino A
Quarta  → Treino B
Sexta   → Treino C
```

Se hoje for quinta e o usuário não treinou quarta, o backend atual não consegue decidir corretamente entre:

- Treino B atrasado;
- Treino C como próximo planejamento;
- ambos como pendentes.

## Decisão

Não criar lógica temporária no frontend.

A decisão sobre “Treino de hoje”, “Próximo treino” ou “Próximos treinos” deve ser tomada quando o backend tiver informação de execução real suficiente.

---

# 7. Sessões de treino

## Status

Recurso futuro importante.

O rascunho arquitetural prevê `workout_session_logs`.

A sessão representa a execução real de um treino.

## Dados possíveis

- data da execução;
- início;
- término;
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

## Importância

Quando sessões existirem, o IronCore conseguirá diferenciar:

- planejamento;
- execução;
- treino perdido;
- treino concluído;
- sequência recente;
- aderência;
- volume;
- histórico real.

Isso permitirá cards futuros muito mais úteis.

---

# 8. UX para registro de sessões

O registro de sessão não deve exigir preenchimento excessivo.

O fluxo mínimo deve poder ser:

```text
Iniciar treino
↓
Executar
↓
Concluir treino
```

Os demais dados podem ser opcionais:

- carga;
- repetições;
- RIR;
- dificuldade;
- energia;
- dor;
- observações.

## Motivo

Quanto maior o atrito de preenchimento, menor a chance de o usuário manter o histórico atualizado.

A captura de dados deve ser progressiva.

---

# 9. Cards futuros possíveis

Quando `workout_session_logs` existir, passam a fazer sentido cards como:

## Próximos treinos

Baseado em:

- planejamento;
- dia da semana;
- ciclos ativos;
- sessões realmente executadas.

Pode ser necessário trabalhar no plural.

## Atividade recente

Exemplo:

- último treino realizado;
- duração;
- status;
- ciclo associado.

## Resumo recente

Exemplo:

```text
Últimos 7 dias

3 treinos realizados
4h12 treinadas
85% de aderência
```

## Sequência / frequência

Possíveis dados:

- sessões na semana;
- sequência de dias;
- frequência por ciclo;
- aderência ao planejamento.

Esses cards só devem existir quando os logs reais sustentarem os números.

---

# 10. Empty states

Os cards podem existir vazios, desde que o empty state represente uma condição real.

## Válidos agora

### Última avaliação corporal

`Nenhuma avaliação corporal cadastrada.`

### Treinos em andamento

`Nenhum treino em andamento.`

### Evolução corporal

`Ainda não há dados suficientes para acompanhar evolução.`

## Não válido agora

### Próximo treino

Não usar:

`Nenhum próximo treino disponível.`

enquanto o backend ainda não possuir uma regra real para determinar o próximo treino.

Isso confundiria ausência de funcionalidade com ausência de dados.

---

# 11. Estratégia para a Issue atual

A Issue responsável pelo resumo da última avaliação corporal pode inaugurar a estrutura visual da Home.

## Proposta

Criar os três cards:

- Última avaliação corporal
- Treinos em andamento
- Evolução corporal

## Integração obrigatória nesta Issue

Apenas:

**Última avaliação corporal**

## Outros dois cards

Podem estabelecer:

- composição visual;
- posicionamento;
- responsividade;
- empty states.

As integrações completas podem ser implementadas em Issues próprias.

## Regra

Não simular funcionalidades inexistentes.

Não criar links para rotas que ainda não existem.

Não preencher dados fictícios em produção.

---

# 12. Estrutura conceitual da Home

A Home deve ser entendida como uma central de situação.

Exemplo atual:

```text
HOME

[ Última avaliação corporal ]

[ Treinos em andamento ]

[ Evolução corporal ]
```

Exemplo futuro:

```text
HOME

[ Última avaliação corporal ]

[ Treinos em andamento ]

[ Evolução corporal ]

[ Próximos treinos ]

[ Atividade recente ]
```

A Home cresce conforme o domínio ganha informações realmente úteis.

---

# 13. Layout

## Desktop

Preferir grid de cards.

## Tablet

Grid adaptável conforme largura disponível.

## Mobile

Cards em coluna ou, futuramente, scroll horizontal quando houver quantidade suficiente para justificar.

## Carrossel

Não implementar carrossel automático neste momento.

A necessidade de carrossel deve surgir a partir da quantidade real de cards.

Evitar:

- autoplay;
- navegação decorativa;
- complexidade sem necessidade.

---

# 14. Regra contra overengineering

Não criar agora:

- framework genérico de dashboard;
- sistema de widgets;
- store global apenas para a Home;
- carrossel reutilizável sem necessidade real;
- componente abstrato demais;
- lógica de domínio no frontend;
- seleção artificial de “treino principal”.

Os padrões compartilhados devem surgir conforme a repetição real aparecer.

---

# 15. Decisões consolidadas

## Implementar agora

### Última avaliação corporal

Integração completa usando `/latest`.

### Treinos em andamento

Card aprovado.

Pode começar com empty state e estrutura visual.

Integração completa pode ser feita em Issue própria.

### Evolução corporal

Card aprovado.

Pode funcionar inicialmente como estrutura/empty state.

Integração deve respeitar as futuras telas de evolução e comparação.

---

## Não implementar agora

### Treino de hoje

O backend ainda não possui contexto suficiente para assumir uma única sessão do dia.

### Próximo treino

O backend ainda não consegue determinar com segurança o próximo treino sem histórico real de execução.

### Resumo semanal

Depende de sessões reais.

### Última sessão

Depende de `workout_session_logs`.

### Aderência

Depende de histórico de execução.

### Volume real treinado

Depende de logs de sessão.

---

# Direção final

A Home do IronCore deve crescer com o domínio.

Não deve antecipar recursos apenas para preencher espaço.

A prioridade é mostrar:

1. o que está acontecendo agora;
2. o que o usuário possui em andamento;
3. onde ele pode acessar rapidamente informações relevantes.

A Home deve continuar enxuta, útil e acionável.

A evolução futura deve ser guiada por dados reais de execução, principalmente quando `workout_session_logs` entrar no sistema.
