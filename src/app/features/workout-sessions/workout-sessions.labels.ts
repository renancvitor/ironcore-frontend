import { WorkoutSessionCloseReason, WorkoutSessionStatus } from './workout-sessions.models';

export const WORKOUT_SESSION_STATUS_LABELS: Record<WorkoutSessionStatus, string> = {
  IN_PROGRESS: 'Em andamento',
  CLOSED: 'Encerrada',
};

export const WORKOUT_SESSION_CLOSE_REASON_LABELS: Record<WorkoutSessionCloseReason, string> = {
  MANUAL: 'Encerramento manual',
  AUTO_EXPIRED: 'Encerrada automaticamente por expiração',
};
