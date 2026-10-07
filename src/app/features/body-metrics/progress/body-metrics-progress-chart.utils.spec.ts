import { BodyMetricsProgressChartType, BodyMetricsProgressMetric } from '../body-metrics.models';
import {
  buildProgressChart,
  defaultProgressPeriod,
  monthLabel,
  progressPeriodError,
} from './body-metrics-progress-chart.utils';

describe('body metrics progress presentation', () => {
  it('uses six calendar months ending today, including a year boundary', () => {
    expect(defaultProgressPeriod(new Date(2026, 1, 15))).toEqual({
      startDate: '2025-09-01',
      endDate: '2026-02-15',
    });
  });

  it.each([
    ['', '2025-01-01', 'válidas'],
    ['2025-02-30', '2025-03-01', 'válidas'],
    ['2025-02-01', '2025-01-01', 'maior'],
    ['2027-01-01', '2027-02-01', 'futuras'],
    ['2025-01-01', '2026-01-01', '12 meses'],
    ['2024-02-29', '2025-02-28', '12 meses'],
  ])('rejects an invalid backend period %s to %s', (startDate, endDate, message) => {
    expect(progressPeriodError({ startDate, endDate }, '2026-10-04')).toContain(message);
  });

  it.each([
    ['2025-01-01', '2025-12-31'],
    ['2024-02-29', '2025-02-27'],
    ['2025-01-31', '2026-01-30'],
    ['2026-10-04', '2026-10-04'],
  ])('accepts the exact backend date boundaries %s to %s', (startDate, endDate) => {
    expect(progressPeriodError({ startDate, endDate }, '2026-10-04')).toBe('');
  });

  it('preserves backend values and connects real points chronologically across missing months', () => {
    // Same monthly weight values as GetBodyMetricsProgressChartUseCaseTest in the backend.
    const points = [
      { period: '2026-03', value: 77 },
      { period: '2026-01', value: 79 },
    ];

    const result = buildProgressChart({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      chartType: BodyMetricsProgressChartType.BODY_COMPOSITION,
      series: [{ metric: BodyMetricsProgressMetric.WEIGHT_KG, label: 'Peso', unit: 'kg', points }],
    });

    expect(result.months.map((month) => month.label)).toEqual(['01/2026', '02/2026', '03/2026']);
    expect(result.series[0].points.map((point) => point.value)).toEqual([79, 77]);
    expect(points[0].period).toBe('2026-03');
    expect(result.series[0].path.match(/[ML]/g)).toEqual(['M', 'L']);
    expect(result.series[0].points).toHaveLength(2);
    expect(result.series[0].points.map((point) => point.x)).toEqual([60, 730]);
    expect(result.series[0].label).toBe('Peso');
    expect(result.unit).toBe('kg');
  });

  it('renders an isolated zero without inventing a second point or dividing by zero', () => {
    const result = buildProgressChart({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      chartType: BodyMetricsProgressChartType.BODY_FAT,
      series: [
        {
          metric: BodyMetricsProgressMetric.BODY_FAT_PERCENTAGE,
          label: 'Gordura corporal',
          unit: '%',
          points: [{ period: '2026-01', value: 0 }],
        },
      ],
    });

    expect(result.series[0].points).toHaveLength(1);
    expect(result.series[0].points[0]).toMatchObject({ value: 0, x: 395, y: 260 });
    expect(result.series[0].path).not.toContain('L');
    expect(result.ticks.every((tick) => Number.isFinite(tick.y))).toBe(true);
  });

  it('joins points across years', () => {
    const result = buildProgressChart({
      startDate: '2025-12-01',
      endDate: '2026-01-31',
      chartType: BodyMetricsProgressChartType.BODY_FAT,
      series: [
        {
          metric: BodyMetricsProgressMetric.BODY_FAT_PERCENTAGE,
          label: 'Gordura corporal',
          unit: '%',
          points: [
            { period: '2025-12', value: 15.5 },
            { period: '2026-01', value: 15.5 },
          ],
        },
      ],
    });

    expect(result.series[0].path.match(/L/g)).toHaveLength(1);
    expect(result.series[0].points[0].y).toBe(result.series[0].points[1].y);
    expect(monthLabel('2025-12')).toBe('12/2025');
  });

  it('draws one chronological line across a missing month without adding values', () => {
    const points = [
      { period: '2026-05', value: 74 },
      { period: '2026-02', value: 78 },
      { period: '2026-01', value: 79 },
      { period: '2026-04', value: 76 },
    ];

    const result = buildProgressChart({
      startDate: '2026-01-01',
      endDate: '2026-05-31',
      chartType: BodyMetricsProgressChartType.BODY_COMPOSITION,
      series: [{ metric: BodyMetricsProgressMetric.WEIGHT_KG, label: 'Peso', unit: 'kg', points }],
    });
    const series = result.series[0];

    expect(series.path.match(/[ML]/g)).toEqual(['M', 'L', 'L', 'L']);
    expect(series.points.map((point) => point.value)).toEqual([79, 78, 76, 74]);
    expect(series.points.map((point) => point.period)).not.toContain('2026-03');
    expect(series.hasLine).toBe(true);
    expect(points[0].period).toBe('2026-05');
  });

  it('connects real points independently for each series, including a valid zero', () => {
    const result = buildProgressChart({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      chartType: BodyMetricsProgressChartType.BODY_COMPOSITION,
      series: [
        {
          metric: BodyMetricsProgressMetric.WEIGHT_KG,
          label: 'Peso',
          unit: 'kg',
          points: [
            { period: '2026-01', value: 80 },
            { period: '2026-02', value: 79 },
            { period: '2026-03', value: 78 },
          ],
        },
        {
          metric: BodyMetricsProgressMetric.FAT_MASS_KG,
          label: 'Massa gorda',
          unit: 'kg',
          points: [
            { period: '2026-01', value: 0 },
            { period: '2026-03', value: 10 },
          ],
        },
      ],
    });

    expect(result.series[0].path.match(/[ML]/g)).toEqual(['M', 'L', 'L']);
    expect(result.series[1].path.match(/[ML]/g)).toEqual(['M', 'L']);
    expect(result.series[1].hasLine).toBe(true);
    expect(result.series[1].points[0].value).toBe(0);
    expect(result.series[1].points).toHaveLength(2);
  });

  it('assigns nine distinct stable colors to circumference measures regardless of missing series', () => {
    const metrics = [
      BodyMetricsProgressMetric.NECK_CM,
      BodyMetricsProgressMetric.CHEST_CM,
      BodyMetricsProgressMetric.SHOULDER_CM,
      BodyMetricsProgressMetric.ARM_CM,
      BodyMetricsProgressMetric.FOREARM_CM,
      BodyMetricsProgressMetric.WAIST_CM,
      BodyMetricsProgressMetric.HIP_CM,
      BodyMetricsProgressMetric.THIGH_CM,
      BodyMetricsProgressMetric.CALF_CM,
    ];

    const response = {
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      chartType: BodyMetricsProgressChartType.CIRCUMFERENCES,
      series: metrics.map((metric) => ({
        metric,
        label: metric,
        unit: 'cm',
        points: [{ period: '2026-06', value: 30 }],
      })),
    };

    const all = buildProgressChart(response);

    expect(new Set(all.series.map((series) => series.color)).size).toBe(9);
    expect(
      all.series.find((series) => series.metric === BodyMetricsProgressMetric.CALF_CM)?.color,
    ).toBe('var(--ic-chart-series-3)');
    expect(
      all.series.find((series) => series.metric === BodyMetricsProgressMetric.ARM_CM)?.color,
    ).toBe('var(--ic-chart-series-4)');

    const withoutNeck = buildProgressChart({
      ...response,
      series: response.series.slice(1),
    });

    expect(withoutNeck.series[0].color).toBe(all.series[1].color);
  });
});
