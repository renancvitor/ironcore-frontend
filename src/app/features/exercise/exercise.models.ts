import { PageResult } from '../../shared/models/page-result.model';

/* === TYPE === */

export type TargetRole = 'PRIMARY' | 'SECONDARY' | 'STABILIZER';

/* === EXERCISE CATALOG === */

export interface ActivityTypeItemResponse {
  id: number;
  code: string;
  name: string;
}

export interface EquipmentTypeItemResponse {
  id: number;
  code: string;
  name: string;
}

export interface MuscleGroupItemResponse {
  id: number;
  code: string;
  name: string;
}

export interface MuscleSubgroupItemResponse {
  id: number;
  code: string;
  muscleGroupId: number;
  name: string;
}

/* === EXERCISE === */

export interface ExerciseMuscleTargetItemResponse {
  muscleSubgroup: MuscleSubgroupItemResponse;
  targetRole: TargetRole;
}

export interface GetExerciseByIdResponse {
  id: number;
  name: string;
  equipmentType: EquipmentTypeItemResponse;
  activityType: ActivityTypeItemResponse;
  unilateral: boolean;
  compound: boolean;
  suggestedRestSeconds: number | null;
  active: boolean;
  muscleTargets: ExerciseMuscleTargetItemResponse[];
}

export interface ListExercisesItemResponse {
  id: number;
  name: string;
  equipmentType: EquipmentTypeItemResponse;
  activityType: ActivityTypeItemResponse;
  unilateral: boolean;
  compound: boolean;
  suggestedRestSeconds: number | null;
}

export interface ListExercisesResponse {
  exercises: PageResult<ListExercisesItemResponse>;
}

export interface ListExercisesRequest {
  name?: string;
  activityTypeId?: number;
  equipmentTypeId?: number;
  muscleGroupId?: number;
  muscleSubgroupId?: number;
  targetRole?: TargetRole;
}
