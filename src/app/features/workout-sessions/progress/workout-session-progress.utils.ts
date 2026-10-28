import { ParamMap, Params } from '@angular/router';
import {
  defaultProgressPeriod,
  progressPeriodError,
} from '../../../shared/utils/progress-period.utils';
import {
  ExerciseCardioEvolutionPoint,
  ExerciseEvolutionPoint,
  ExerciseStrengthEvolutionPoint,
} from '../workout-session-analytics.models';

export type AnalyticsFamily = 'strength' | 'cardio';
export type AnalyticsMetric =
  | 'maxNormalizedLoadKg'
  | 'volumeKgReps'
  | 'distanceKm'
  | 'durationMinutes'
  | 'averagePaceMinPerKm'
  | 'averageSpeedKmPerHour';

export interface AnalyticsIndicator {
  key: AnalyticsMetric;
  family: AnalyticsFamily;
  label: string;
  unit: string;
  color: string;
}

export const ANALYTICS_INDICATORS: readonly AnalyticsIndicator[] = [
  {
    key: 'maxNormalizedLoadKg',
    family: 'strength',
    label: 'Maior carga normalizada executada',
    unit: 'kg',
    color: 'var(--ic-chart-series-1)',
  },
  {
    key: 'volumeKgReps',
    family: 'strength',
    label: 'Volume registrado',
    unit: 'kg·rep',
    color: 'var(--ic-chart-series-2)',
  },
  {
    key: 'distanceKm',
    family: 'cardio',
    label: 'Distância registrada',
    unit: 'km',
    color: 'var(--ic-chart-series-3)',
  },
  {
    key: 'durationMinutes',
    family: 'cardio',
    label: 'Duração registrada',
    unit: 'min',
    color: 'var(--ic-chart-series-4)',
  },
  {
    key: 'averagePaceMinPerKm',
    family: 'cardio',
    label: 'Pace médio',
    unit: 'min/km',
    color: 'var(--ic-chart-series-5)',
  },
  {
    key: 'averageSpeedKmPerHour',
    family: 'cardio',
    label: 'Velocidade média',
    unit: 'km/h',
    color: 'var(--ic-chart-series-6)',
  },
];

export function saoPauloDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function sessionProgressPeriod(endDate = saoPauloDate()) {
  return defaultProgressPeriod(new Date(`${endDate}T12:00:00`));
}

export function positiveQueryId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function readProgressQuery(params: ParamMap, today = saoPauloDate()) {
  let period = sessionProgressPeriod(today);
  const sourceDate = params.get('sourceDate');
  if (params.has('startDate') || params.has('endDate')) {
    period = { startDate: params.get('startDate') ?? '', endDate: params.get('endDate') ?? '' };
  } else if (
    sourceDate &&
    !progressPeriodError({ startDate: sourceDate, endDate: sourceDate }, today) &&
    sourceDate < period.startDate
  ) {
    period = sessionProgressPeriod(sourceDate);
  }
  const family: AnalyticsFamily = params.get('family') === 'cardio' ? 'cardio' : 'strength';
  const indicator =
    ANALYTICS_INDICATORS.find(
      (item) => item.family === family && item.key === params.get('metric'),
    ) ?? ANALYTICS_INDICATORS.find((item) => item.family === family)!;
  return {
    exerciseId: positiveQueryId(params.get('exerciseId')),
    sourceSessionId: positiveQueryId(params.get('sourceSessionId')),
    sourceDate:
      sourceDate && !progressPeriodError({ startDate: sourceDate, endDate: sourceDate }, today)
        ? sourceDate
        : null,
    period,
    family,
    indicator,
    error: progressPeriodError(period, today),
    invalidExercise: params.has('exerciseId') && positiveQueryId(params.get('exerciseId')) === null,
  };
}

export function progressNavigationQuery(params: ParamMap, today = saoPauloDate()): Params {
  const selection = readProgressQuery(params, today);
  if (selection.error || !selection.exerciseId) return {};
  return {
    exerciseId: selection.exerciseId,
    ...selection.period,
    family: selection.family,
    metric: selection.indicator.key,
    sourceSessionId: selection.sourceSessionId,
    sourceDate: selection.sourceDate,
  };
}

export function metricValue(point: ExerciseEvolutionPoint, metric: AnalyticsMetric): number | null {
  return (
    (point as Partial<ExerciseStrengthEvolutionPoint & ExerciseCardioEvolutionPoint>)[metric] ??
    null
  );
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function formatAnalyticsValue(
  value: number | null,
  metric: AnalyticsMetric,
  decimalPace = false,
): string {
  if (value === null) return '—';
  const indicator = ANALYTICS_INDICATORS.find((item) => item.key === metric)!;
  if (metric === 'averagePaceMinPerKm' && !decimalPace) {
    const seconds = Math.round(value * 60);
    return `≈ ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min/km`;
  }
  return `${decimal.format(value)} ${indicator.unit}`;
}

export function executionCoverage(point: ExerciseEvolutionPoint): string {
  if ('registeredSetCount' in point) {
    return `Séries registradas: ${point.registeredSetCount}; com carga: ${point.loadedSetCount}; elegíveis para carga máxima e volume: ${point.volumeSetCount}.`;
  }
  return `Atividades: ${point.activityCount}; registros de distância: ${point.distanceRecordCount}; duração: ${point.durationRecordCount}; pace: ${point.paceRecordCount}; velocidade: ${point.speedRecordCount}.`;
}

export function buildSessionProgressChart(
  points: readonly ExerciseEvolutionPoint[],
  metric: AnalyticsMetric,
) {
  const width = Math.max(760, 120 + Math.max(0, points.length - 1) * 64);
  const right = width - 30;
  const max = points.reduce((maximum, point) => {
    const value = metricValue(point, metric);
    return value === null ? maximum : Math.max(maximum, value);
  }, 0);
  const ceiling = Math.max(metric === 'durationMinutes' ? 4 : 1, Math.ceil(max / 4) * 4);
  const step = points.length > 1 ? (right - 60) / (points.length - 1) : 0;
  const labelEvery = Math.max(1, Math.ceil(100 / (step || 100)));
  const positioned = points.map((point, index) => {
    const value = metricValue(point, metric);
    return {
      ...point,
      value,
      x: points.length === 1 ? (60 + right) / 2 : 60 + index * step,
      y: value === null ? null : 260 - (value / ceiling) * 230,
      label: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
        new Date(point.startedAt),
      ),
      showLabel: index % labelEvery === 0 || index === points.length - 1,
    };
  });
  const segments: { sessionId: number; path: string }[] = [];
  let segment: typeof positioned = [];
  const flush = () => {
    if (segment.length > 1)
      segments.push({
        sessionId: segment[0].sessionId,
        path: segment
          .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
          .join(' '),
      });
    segment = [];
  };
  for (const point of positioned) {
    if (point.value === null) flush();
    else segment.push(point);
  }
  flush();
  return {
    width,
    right,
    points: positioned,
    segments,
    validCount: positioned.filter((point) => point.value !== null).length,
    ticks: Array.from({ length: 5 }, (_, index) => ({
      value: (ceiling * index) / 4,
      y: 260 - (index * 230) / 4,
    })),
  };
}
