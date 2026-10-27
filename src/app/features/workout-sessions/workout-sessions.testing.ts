import { GetWorkoutSessionDetailResponse, WorkoutSessionSetDetailResponse } from './workout-sessions.models';

export function sessionSet(overrides: Partial<WorkoutSessionSetDetailResponse> = {}): WorkoutSessionSetDetailResponse {
  return {
    id: 300, setNumber: 1, actualLoadKg: null, actualLoadMode: null, actualReps: 8,
    normalizedLoadKg: null, notes: null, createdAt: '2026-10-27T13:01:00Z', updatedAt: null,
    ...overrides,
  };
}

export const sessionDetail: GetWorkoutSessionDetailResponse = {
  id: 100,
  personId: 7,
  workoutCycleId: 9,
  workoutDayId: 30,
  workoutCycleNameSnapshot: 'Ciclo preservado',
  workoutDayTitleSnapshot: 'Treino preservado',
  weekDaySnapshot: 'FRIDAY',
  performedOn: '2026-10-27',
  startedAt: '2026-10-27T13:00:00Z',
  finishedAt: null,
  status: 'IN_PROGRESS',
  closeReason: null,
  notes: null,
  createdAt: '2026-10-27T13:00:00Z',
  updatedAt: null,
  activities: [
    {
      id: 200,
      workoutActivityId: 40,
      exerciseId: 50,
      exerciseNameSnapshot: 'Exercício preservado',
      activityTypeSnapshot: 'STRENGTH',
      orderIndexSnapshot: 1,
      plannedSetsSnapshot: 3,
      plannedRepRangeMinSnapshot: 8,
      plannedRepRangeMaxSnapshot: 12,
      plannedTargetLoadKgSnapshot: 22.5,
      plannedTargetLoadTextSnapshot: 'Carga moderada',
      plannedDurationMinutesSnapshot: 15,
      plannedDistanceKmSnapshot: 2.5,
      plannedIntensityTextSnapshot: 'Moderada',
      plannedRestSecondsSnapshot: 60,
      plannedNotesSnapshot: 'Orientação histórica',
      actualDurationMinutes: null,
      actualDistanceKm: null,
      actualLoadMode: null,
      notes: null,
      createdAt: '2026-10-27T13:00:00Z',
      updatedAt: null,
      sets: [],
    },
  ],
};
