import { cycleDetail, cyclePage } from './workout-planning.testing';

describe('Workout planning test fixtures', () => {
  it('isolates page item mutations from the detail fixture and subsequent pages', () => {
    const original = structuredClone(cycleDetail);
    const page = cyclePage();

    page.cycles.content[0].workoutStatus = 'NOT_STARTED';

    expect(cycleDetail).toEqual(original);
    expect(cyclePage().cycles.content[0]).toEqual(original);
  });

  it('isolates nested fixture data between page items and pages', () => {
    const original = structuredClone(cycleDetail);
    const page = cyclePage();
    const anotherPage = cyclePage();
    // Page results expose summaries; inspect their full test projections here.
    const first = page.cycles.content[0] as typeof cycleDetail;
    const second = page.cycles.content[1] as typeof cycleDetail;

    first.trainingGoal.name = 'Objetivo alterado';
    first.days[0].activities[0].exercise.muscleGroups[0].name = 'Grupo alterado';

    expect(cycleDetail).toEqual(original);
    expect(anotherPage.cycles.content[0]).toEqual(original);
    expect(second.trainingGoal).toEqual(original.trainingGoal);
    expect(second.days).toEqual(original.days);
  });
});
