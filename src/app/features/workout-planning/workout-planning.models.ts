import { PageResult } from '../../shared/models/page-result.model';

export type WorkoutStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkoutOrigin = 'MANUAL' | 'AGENT';
export type WeekDay =
  'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface TrainingGoalResponse {
  id: number;
  code: string;
  name: string;
}

export interface CreateWorkoutCycleRequest {
  name: string;
  trainingGoalId: number;
  desiredDurationMonths?: number | null;
  weekStartsOn?: WeekDay | null;
  notes?: string | null;
}

export interface UpdateWorkoutCycleRequest {
  name: string;
  trainingGoalId: number;
  desiredDurationMonths?: number | null;
  weekStartsOn?: WeekDay | null;
  notes?: string | null;
}

export interface CreateWorkoutCycleResponse {
  id: number;
  personId: number;
  name: string;
  trainingGoalId: number;
  desiredDurationMonths: number | null;
  weekStartsOn: WeekDay;
  workoutStatus: WorkoutStatus;
  workoutOrigin: WorkoutOrigin;
  notes: string | null;
  createdAt: string;
}

export interface UpdateWorkoutCycleResponse {
  id: number;
  name: string;
  trainingGoalId: number;
  startDate: string | null;
  workoutStatus: WorkoutStatus;
  workoutOrigin: WorkoutOrigin;
  desiredDurationMonths: number | null;
  weekStartsOn: WeekDay;
  notes: string | null;
  updatedAt: string;
}

export interface ListWorkoutCyclesRequest {
  workoutStatus?: WorkoutStatus;
  trainingGoalId?: number;
  startDate?: string;
  endDate?: string;
  name?: string;
}

export interface TrainingGoalItemResponse {
  id: number;
  name: string;
}

export interface ListWorkoutCyclesItemResponse {
  id: number;
  name: string;
  workoutStatus: WorkoutStatus;
  trainingGoal: TrainingGoalItemResponse;
  startDate: string | null;
  endDate: string | null;
  desiredDurationMonths: number | null;
}

export interface ListWorkoutCyclesResponse {
  cycles: PageResult<ListWorkoutCyclesItemResponse>;
}

export interface TrainingGoalDetailResponse {
  id: number;
  name: string;
}

export interface GetWorkoutCycleDetailResponse {
  id: number;
  name: string;
  workoutStatus: WorkoutStatus;
  trainingGoal: TrainingGoalDetailResponse;
  startDate: string | null;
  endDate: string | null;
  desiredDurationMonths: number | null;
  weekStartsOn: WeekDay;
  notes: string | null;
  days: WorkoutDayDetailResponse[];
}

export interface StartWorkoutCycleResponse {
  id: number;
  trainingGoalId: number;
  startDate: string;
  workoutStatus: WorkoutStatus;
}

export interface CompleteWorkoutCycleResponse {
  id: number;
  trainingGoalId: number;
  startDate: string;
  endDate: string;
  workoutStatus: WorkoutStatus;
}

export interface CancelWorkoutCycleResponse {
  id: number;
  trainingGoalId: number;
  workoutStatus: WorkoutStatus;
}

export interface CreateWorkoutDayRequest {
  workoutCycleId: number;
  weekDay: WeekDay;
  title: string;
}

export interface UpdateWorkoutDayRequest {
  title: string;
}

export interface ReorderWorkoutDayRequest {
  weekDay: WeekDay;
  sortOrder: number;
}

export interface CreateWorkoutDayResponse {
  id: number;
  workoutCycleId: number;
  weekDay: WeekDay;
  title: string;
  sortOrder: number;
  createdAt: string;
}

export interface UpdateWorkoutDayResponse {
  id: number;
  workoutCycleId: number;
  weekDay: WeekDay;
  title: string;
  sortOrder: number;
  updatedAt: string;
}

export interface WorkoutDayDetailResponse {
  id: number;
  weekDay: WeekDay;
  title: string;
  sortOrder: number;
  activities: WorkoutActivityDetailResponse[];
}

export interface ExerciseDetailResponse {
  id: number;
  name: string;
  muscleGroups: MuscleGroupDetailResponse[];
}

export interface MuscleGroupDetailResponse {
  id: number;
  name: string;
}

export interface CreateWorkoutActivityRequest {
  workoutDayId: number;
  exerciseId: number;
  sets?: number | null;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  targetLoadKg?: number | null;
  targetLoadText?: string | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  intensityText?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface UpdateWorkoutActivityRequest {
  exerciseId: number;
  sets?: number | null;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  targetLoadKg?: number | null;
  targetLoadText?: string | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  intensityText?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface CreateWorkoutActivityResponse {
  id: number;
  workoutDayId: number;
  exerciseId: number;
  orderIndex: number;
  sets: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  targetLoadKg: number | null;
  targetLoadText: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  intensityText: string | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string;
}

export interface UpdateWorkoutActivityResponse {
  id: number;
  workoutDayId: number;
  exerciseId: number;
  orderIndex: number;
  sets: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  targetLoadKg: number | null;
  targetLoadText: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  intensityText: string | null;
  restSeconds: number | null;
  notes: string | null;
  updatedAt: string;
}

export interface WorkoutActivityDetailResponse {
  id: number;
  orderIndex: number;
  sets: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  targetLoadKg: number | null;
  targetLoadText: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  intensityText: string | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: ExerciseDetailResponse;
}

export interface ReorderWorkoutActivityRequest {
  orderIndex: number;
}
