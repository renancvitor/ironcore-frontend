import { WeekDay } from '../workout-planning/workout-planning.models';
import { PageResult } from '../../shared/models/page-result.model';

export interface WorkoutSessionHistoryFilters {
  workoutCycleId?: number;
  workoutDayId?: number;
  startDate?: string;
  endDate?: string;
}

export interface WorkoutSessionHistoryItem {
  id: number;
  workoutCycleId: number | null;
  workoutDayId: number | null;
  workoutCycleNameSnapshot: string;
  workoutDayTitleSnapshot: string;
  weekDaySnapshot: WeekDay;
  performedOn: string;
  startedAt: string;
  finishedAt: string;
  status: 'CLOSED';
  closeReason: WorkoutSessionCloseReason;
}

export interface ListWorkoutSessionsResponse {
  sessions: PageResult<WorkoutSessionHistoryItem>;
}

export type WorkoutSessionStatus = 'IN_PROGRESS' | 'CLOSED';
export type WorkoutSessionCloseReason = 'MANUAL' | 'AUTO_EXPIRED';
export type ActualLoadMode = 'TOTAL' | 'PER_SIDE';

export interface UpdateWorkoutSessionNotesRequest {
  notes: string | null;
}

export interface UpdateWorkoutSessionActivityExecutionRequest {
  actualDurationMinutes?: number | null;
  actualDistanceKm?: number | null;
  notes?: string | null;
}

export interface CreateWorkoutSessionSetRequest {
  setNumber: number;
  actualLoadKg?: number | null;
  actualLoadMode?: ActualLoadMode | null;
  actualReps?: number | null;
  notes?: string | null;
}

export interface UpdateWorkoutSessionSetRequest {
  actualLoadKg?: number | null;
  actualLoadMode?: ActualLoadMode | null;
  actualReps?: number | null;
  notes?: string | null;
}

export interface ChangeWorkoutSessionActivityLoadModeRequest {
  actualLoadMode: ActualLoadMode;
}

export interface StartWorkoutSessionRequest {
  workoutCycleId: number;
  workoutDayId: number;
}

export interface StartWorkoutSessionResponse {
  id: number;
  workoutCycleId: number;
  workoutDayId: number;
  performedOn: string;
  startedAt: string;
  status: WorkoutSessionStatus;
  createdAt: string;
}

export interface CloseWorkoutSessionResponse {
  id: number;
  performedOn: string;
  startedAt: string;
  finishedAt: string;
  status: WorkoutSessionStatus;
  closeReason: WorkoutSessionCloseReason;
  updatedAt: string;
}

export interface GetWorkoutSessionDetailResponse {
  id: number;
  personId: number;
  workoutCycleId: number | null;
  workoutDayId: number | null;
  workoutCycleNameSnapshot: string;
  workoutDayTitleSnapshot: string;
  weekDaySnapshot: WeekDay;
  performedOn: string;
  startedAt: string;
  finishedAt: string | null;
  status: WorkoutSessionStatus;
  closeReason: WorkoutSessionCloseReason | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  activities: WorkoutSessionActivityDetailResponse[];
}

export interface WorkoutSessionActivityDetailResponse {
  id: number;
  workoutActivityId: number | null;
  exerciseId: number | null;
  exerciseNameSnapshot: string;
  activityTypeSnapshot: string;
  orderIndexSnapshot: number;
  plannedSetsSnapshot: number | null;
  plannedRepRangeMinSnapshot: number | null;
  plannedRepRangeMaxSnapshot: number | null;
  plannedTargetLoadKgSnapshot: number | null;
  plannedTargetLoadTextSnapshot: string | null;
  plannedDurationMinutesSnapshot: number | null;
  plannedDistanceKmSnapshot: number | null;
  plannedIntensityTextSnapshot: string | null;
  plannedRestSecondsSnapshot: number | null;
  plannedNotesSnapshot: string | null;
  actualDurationMinutes: number | null;
  actualDistanceKm: number | null;
  actualLoadMode: ActualLoadMode | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  sets: WorkoutSessionSetDetailResponse[];
}

export interface WorkoutSessionSetDetailResponse {
  id: number;
  setNumber: number;
  actualLoadKg: number | null;
  actualLoadMode: ActualLoadMode | null;
  actualReps: number | null;
  normalizedLoadKg: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}
