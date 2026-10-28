import {
  ExerciseCardioEvolutionPoint,
  ExerciseCardioEvolutionResponse,
  ExerciseStrengthEvolutionPoint,
  ExerciseStrengthEvolutionResponse,
} from '../workout-session-analytics.models';

export function strengthPoint(
  overrides: Partial<ExerciseStrengthEvolutionPoint> = {},
): ExerciseStrengthEvolutionPoint {
  return {
    sessionId: 100,
    performedOn: '2025-01-20',
    startedAt: '2025-01-20T13:00:00Z',
    exerciseNameSnapshot: 'Exercício histórico',
    maxNormalizedLoadKg: 40.2,
    volumeKgReps: 120.6,
    registeredSetCount: 4,
    loadedSetCount: 2,
    volumeSetCount: 1,
    ...overrides,
  };
}

export function cardioPoint(
  overrides: Partial<ExerciseCardioEvolutionPoint> = {},
): ExerciseCardioEvolutionPoint {
  return {
    sessionId: 100,
    performedOn: '2025-01-20',
    startedAt: '2025-01-20T13:00:00Z',
    exerciseNameSnapshot: 'Exercício histórico',
    distanceKm: 5,
    durationMinutes: 50,
    averagePaceMinPerKm: 6,
    averageSpeedKmPerHour: 10,
    activityCount: 2,
    distanceRecordCount: 1,
    durationRecordCount: 2,
    paceRecordCount: 1,
    speedRecordCount: 1,
    ...overrides,
  };
}

export function strengthResponse(
  points = [strengthPoint()],
  exerciseId = 50,
): ExerciseStrengthEvolutionResponse {
  return { exerciseId, points };
}

export function cardioResponse(
  points = [cardioPoint()],
  exerciseId = 50,
): ExerciseCardioEvolutionResponse {
  return {
    exerciseId,
    points,
    summary:
      points.length === 0
        ? {
            totalDistanceKm: null,
            totalDurationMinutes: null,
            averagePaceMinPerKm: null,
            averageSpeedKmPerHour: null,
            distanceRecordCount: 0,
            durationRecordCount: 0,
            paceRecordCount: 0,
            speedRecordCount: 0,
          }
        : {
            totalDistanceKm: 6,
            totalDurationMinutes: 60,
            averagePaceMinPerKm: 6.67,
            averageSpeedKmPerHour: 9,
            distanceRecordCount: 2,
            durationRecordCount: 3,
            paceRecordCount: 2,
            speedRecordCount: 2,
          },
  };
}
