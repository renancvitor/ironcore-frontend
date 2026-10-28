import { convertToParamMap } from '@angular/router';
import { progressPeriodError } from '../../../shared/utils/progress-period.utils';
import { cardioPoint, strengthPoint } from './workout-session-progress.testing';
import {
  ANALYTICS_INDICATORS,
  buildSessionProgressChart,
  executionCoverage,
  formatAnalyticsValue,
  metricValue,
  progressNavigationQuery,
  readProgressQuery,
  saoPauloDate,
  sessionProgressPeriod,
} from './workout-session-progress.utils';

describe('Workout Session analytics presentation', () => {
  it('uses the Sao Paulo date even when UTC is already tomorrow', () => {
    expect(saoPauloDate(new Date('2026-10-28T01:00:00Z'))).toBe('2026-10-27');
    expect(saoPauloDate(new Date('2026-10-28T03:00:00Z'))).toBe('2026-10-28');
    expect(sessionProgressPeriod('2026-02-15')).toEqual({
      startDate: '2025-09-01',
      endDate: '2026-02-15',
    });
  });

  it.each([
    ['2024-02-29', '2025-02-27', ''],
    ['2025-01-31', '2026-01-30', ''],
    ['2026-10-27', '2026-10-27', ''],
    ['2024-02-29', '2025-02-28', '12 meses'],
    ['2025-10-27', '2026-10-27', '12 meses'],
    ['2025-02-30', '2025-03-01', 'válidas'],
    ['', '2025-03-01', 'válidas'],
    ['2026-10-27', '2026-10-28', 'futuras'],
    ['2026-10-27', '2026-10-26', 'maior'],
  ])('validates the backend period %s to %s', (startDate, endDate, message) => {
    expect(progressPeriodError({ startDate, endDate }, '2026-10-27')).toContain(message);
    if (!message) expect(progressPeriodError({ startDate, endDate }, '2026-10-27')).toBe('');
  });

  it('contextualizes an old session only when there is no explicitly selected period', () => {
    const context = { exerciseId: '50', sourceSessionId: '100', sourceDate: '2024-02-29' };
    expect(readProgressQuery(convertToParamMap(context), '2026-10-27').period).toEqual({
      startDate: '2023-09-01',
      endDate: '2024-02-29',
    });
    expect(
      readProgressQuery(
        convertToParamMap({ ...context, startDate: '2025-01-01', endDate: '2025-02-01' }),
        '2026-10-27',
      ).period,
    ).toEqual({ startDate: '2025-01-01', endDate: '2025-02-01' });
  });

  it.each(['0', '-1', 'abc', '1.5', '1e2', '9007199254740992'])(
    'rejects invalid exercise ID %s',
    (exerciseId) => {
      const query = convertToParamMap({ exerciseId });
      expect(readProgressQuery(query).exerciseId).toBeNull();
      expect(readProgressQuery(query).invalidExercise).toBe(true);
      expect(progressNavigationQuery(query)).toEqual({});
    },
  );

  it('validates dates and accepts only known family/metric and internal navigation fields', () => {
    const params = convertToParamMap({
      exerciseId: '50',
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      family: 'cardio',
      metric: 'volumeKgReps',
      sourceSessionId: '-1',
      sourceDate: 'invalid',
      returnUrl: 'https://example.com',
    });
    expect(progressNavigationQuery(params, '2026-10-27')).toEqual({
      exerciseId: 50,
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      family: 'cardio',
      metric: 'distanceKm',
      sourceSessionId: null,
      sourceDate: null,
    });
    expect(
      readProgressQuery(convertToParamMap({ exerciseId: '50', startDate: '2025-01-01' })).error,
    ).toContain('válidas');
  });

  it('preserves API order and gives same-day sessions and ties their own positions', () => {
    const points = [
      strengthPoint(),
      strengthPoint({ sessionId: 101 }),
      strengthPoint({ sessionId: 102 }),
    ];
    const chart = buildSessionProgressChart(points, 'maxNormalizedLoadKg');
    expect(chart.points.map((point) => point.sessionId)).toEqual([100, 101, 102]);
    expect(new Set(chart.points.map((point) => point.x)).size).toBe(3);
    expect(chart.segments[0].path.match(/[ML]/g)).toEqual(['M', 'L', 'L']);
    expect(points[0]).not.toHaveProperty('x');
  });

  it('breaks the line at null without removing that session or zero', () => {
    const chart = buildSessionProgressChart(
      [
        strengthPoint({ maxNormalizedLoadKg: 0 }),
        strengthPoint({ sessionId: 101 }),
        strengthPoint({ sessionId: 102, maxNormalizedLoadKg: null }),
        strengthPoint({ sessionId: 103 }),
        strengthPoint({ sessionId: 104 }),
      ],
      'maxNormalizedLoadKg',
    );
    expect(chart.points).toHaveLength(5);
    expect(chart.points[0]).toMatchObject({ value: 0, y: 260 });
    expect(chart.points[2]).toMatchObject({ value: null, y: null });
    expect(chart.segments).toHaveLength(2);
    expect(chart.segments.map((segment) => segment.path.match(/[ML]/g))).toEqual([
      ['M', 'L'],
      ['M', 'L'],
    ]);
  });

  it('shows isolated values and does not bridge separate singletons', () => {
    const chart = buildSessionProgressChart(
      [
        strengthPoint(),
        strengthPoint({ sessionId: 101, maxNormalizedLoadKg: null }),
        strengthPoint({ sessionId: 102 }),
      ],
      'maxNormalizedLoadKg',
    );
    expect(chart.segments).toEqual([]);
    expect(chart.validCount).toBe(2);
    const zero = buildSessionProgressChart(
      [strengthPoint({ maxNormalizedLoadKg: 0 })],
      'maxNormalizedLoadKg',
    );
    expect(zero.validCount).toBe(1);
    expect(zero.segments).toEqual([]);
    expect(zero.ticks.every((tick) => Number.isFinite(tick.y))).toBe(true);
  });

  it('preserves all dense points and only thins axis labels', () => {
    const points = Array.from({ length: 365 }, (_, index) =>
      strengthPoint({ sessionId: index + 1 }),
    );
    const chart = buildSessionProgressChart(points, 'volumeKgReps');
    expect(chart.width).toBeGreaterThan(20000);
    expect(chart.points).toHaveLength(365);
    expect(chart.points.filter((point) => point.showLabel).length).toBeLessThan(365);
    expect(chart.segments[0].path.match(/[ML]/g)).toHaveLength(365);
  });

  it.each([
    [null, 'maxNormalizedLoadKg', '—'],
    [0, 'maxNormalizedLoadKg', '0 kg'],
    [120.6, 'volumeKgReps', '120,6 kg·rep'],
    [5.25, 'distanceKm', '5,25 km'],
    [4294967294, 'durationMinutes', '4.294.967.294 min'],
    [6.67, 'averagePaceMinPerKm', '≈ 6:40 min/km'],
    [0, 'averagePaceMinPerKm', '≈ 0:00 min/km'],
    [0.03, 'averagePaceMinPerKm', '≈ 0:02 min/km'],
    [0, 'averageSpeedKmPerHour', '0 km/h'],
    [9.25, 'averageSpeedKmPerHour', '9,25 km/h'],
  ] as const)('formats %s for %s without domain calculations', (value, metric, text) => {
    expect(formatAnalyticsValue(value, metric)).toBe(text);
  });

  it('keeps decimal pace and backend eligibility, even for partial execution and rounded zero', () => {
    expect(formatAnalyticsValue(6.67, 'averagePaceMinPerKm', true)).toBe('6,67 min/km');
    const strength = strengthPoint({
      maxNormalizedLoadKg: null,
      volumeKgReps: null,
      loadedSetCount: 2,
      volumeSetCount: 0,
    });
    expect(metricValue(strength, 'maxNormalizedLoadKg')).toBeNull();
    expect(executionCoverage(strength)).toContain('com carga: 2');
    const cardio = cardioPoint({
      distanceKm: 0,
      averagePaceMinPerKm: null,
      averageSpeedKmPerHour: 0,
    });
    expect(metricValue(cardio, 'averagePaceMinPerKm')).toBeNull();
    expect(metricValue(cardio, 'averageSpeedKmPerHour')).toBe(0);
    expect(new Set(ANALYTICS_INDICATORS.map((item) => item.color)).size).toBe(6);
  });
});
