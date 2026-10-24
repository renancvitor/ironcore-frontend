import {
  GetWorkoutCycleDetailResponse,
  ListWorkoutCyclesResponse,
} from './workout-planning.models';

// Shared projections for component and navigation tests.
export const cycleDetail: GetWorkoutCycleDetailResponse = {
  id: 9,
  name: 'Força A',
  workoutStatus: 'IN_PROGRESS',
  trainingGoal: { id: 22, name: 'Objetivo do backend' },
  startDate: '2026-10-01',
  endDate: '2026-12-31',
  desiredDurationMonths: 3,
  weekStartsOn: 'SUNDAY',
  notes: 'Notas do ciclo\nSegunda linha',
  days: [
    {
      id: 30,
      title: 'Treino B',
      weekDay: 'FRIDAY',
      sortOrder: 8,
      activities: [
        {
          id: 40,
          orderIndex: 7,
          sets: 4,
          repRangeMin: 8,
          repRangeMax: 12,
          targetLoadKg: 22.5,
          targetLoadText: 'Carga confortável',
          durationMinutes: 15,
          distanceKm: 2.5,
          intensityText: 'Moderada',
          restSeconds: 90,
          notes: 'Execução controlada',
          exercise: {
            id: 50,
            name: 'Exercício B',
            muscleGroups: [
              { id: 60, name: 'Peitoral' },
              { id: 61, name: 'Tríceps' },
            ],
          },
        },
        {
          id: 41,
          orderIndex: 1,
          sets: null,
          repRangeMin: null,
          repRangeMax: null,
          targetLoadKg: null,
          targetLoadText: null,
          durationMinutes: null,
          distanceKm: null,
          intensityText: null,
          restSeconds: null,
          notes: null,
          exercise: { id: 51, name: 'Exercício A', muscleGroups: [] },
        },
      ],
    },
    { id: 31, title: 'Treino A', weekDay: 'MONDAY', sortOrder: 1, activities: [] },
  ],
};

export function cyclePage(page = 0, size = 20): ListWorkoutCyclesResponse {
  return {
    cycles: {
      content: [
        structuredClone(cycleDetail),
        {
          ...structuredClone(cycleDetail),
          id: 1,
          name: 'Força B',
          startDate: null,
          endDate: null,
          desiredDurationMonths: null,
        },
      ],
      page,
      size,
      totalElements: 120,
      totalPages: Math.ceil(120 / size),
      last: false,
    },
  };
}
