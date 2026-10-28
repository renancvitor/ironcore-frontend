export interface WorkoutSessionAnalyticsPeriod {
  startDate: string;
  endDate: string;
}

export interface WorkoutSessionEvolutionPoint {
  sessionId: number;
  performedOn: string;
  startedAt: string;
  exerciseNameSnapshot: string;
  workoutDayTitleSnapshot?: string;
}

export interface ExerciseStrengthEvolutionPoint extends WorkoutSessionEvolutionPoint {
  maxNormalizedLoadKg: number | null;
  volumeKgReps: number | null;
  registeredSetCount: number;
  loadedSetCount: number;
  volumeSetCount: number;
}

export interface ExerciseStrengthEvolutionResponse {
  exerciseId: number;
  points: ExerciseStrengthEvolutionPoint[];
}

export interface ExerciseCardioEvolutionPoint extends WorkoutSessionEvolutionPoint {
  distanceKm: number | null;
  durationMinutes: number | null;
  averagePaceMinPerKm: number | null;
  averageSpeedKmPerHour: number | null;
  activityCount: number;
  distanceRecordCount: number;
  durationRecordCount: number;
  paceRecordCount: number;
  speedRecordCount: number;
}

export interface ExerciseCardioEvolutionSummary {
  totalDistanceKm: number | null;
  totalDurationMinutes: number | null;
  averagePaceMinPerKm: number | null;
  averageSpeedKmPerHour: number | null;
  distanceRecordCount: number;
  durationRecordCount: number;
  paceRecordCount: number;
  speedRecordCount: number;
}

export interface ExerciseCardioEvolutionResponse {
  exerciseId: number;
  points: ExerciseCardioEvolutionPoint[];
  summary: ExerciseCardioEvolutionSummary;
}

export type ExerciseEvolutionPoint = ExerciseStrengthEvolutionPoint | ExerciseCardioEvolutionPoint;
