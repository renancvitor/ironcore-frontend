import {
  BodyMetricsProgressChartRequest,
  BodyMetricsProgressChartResponse,
  BodyMetricsProgressMetric,
} from '../body-metrics.models';

const CHART_LEFT = 60;
const CHART_WIDTH = 670;
const CHART_CENTER_X = 395;

const CHART_BOTTOM = 260;
const CHART_HEIGHT = 230;

const TICK_COUNT = 5;
const TICK_DIVISIONS = TICK_COUNT - 1;

const SERIES_PALETTE_SLOT: Record<BodyMetricsProgressMetric, number> = {
  [BodyMetricsProgressMetric.WEIGHT_KG]: 0,
  [BodyMetricsProgressMetric.FAT_MASS_KG]: 1,
  [BodyMetricsProgressMetric.LEAN_MASS_KG]: 2,
  [BodyMetricsProgressMetric.BODY_FAT_PERCENTAGE]: 6,
  [BodyMetricsProgressMetric.BMI]: 8,
  [BodyMetricsProgressMetric.NECK_CM]: 0,
  [BodyMetricsProgressMetric.CHEST_CM]: 1,
  [BodyMetricsProgressMetric.SHOULDER_CM]: 8,
  [BodyMetricsProgressMetric.ARM_CM]: 3,
  [BodyMetricsProgressMetric.FOREARM_CM]: 4,
  [BodyMetricsProgressMetric.WAIST_CM]: 5,
  [BodyMetricsProgressMetric.HIP_CM]: 6,
  [BodyMetricsProgressMetric.THIGH_CM]: 7,
  [BodyMetricsProgressMetric.CALF_CM]: 2,
};

export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function defaultProgressPeriod(today = new Date()): BodyMetricsProgressChartRequest {
  const startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  return {
    startDate: localDateString(startDate),
    endDate: localDateString(today),
  };
}

export function progressPeriodError(
  period: BodyMetricsProgressChartRequest,
  today = localDateString(new Date()),
): string {
  const { startDate, endDate } = period;

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return 'Informe datas inicial e final válidas.';
  }

  if (startDate > today || endDate > today) {
    return 'As datas não podem ser futuras.';
  }

  if (startDate > endDate) {
    return 'A data inicial não pode ser maior que a data final.';
  }

  if (endDate > maximumPeriodEndDate(startDate)) {
    return 'O período máximo permitido é de 12 meses.';
  }

  return '';
}

export function monthLabel(period: string): string {
  const year = period.slice(0, 4);
  const month = period.slice(5, 7);

  return `${month}/${year}`;
}

export function buildProgressChart(response: BodyMetricsProgressChartResponse) {
  const firstMonth = monthIndex(response.startDate);
  const lastMonth = monthIndex(response.endDate);

  const xCoordinate = (index: number): number => {
    if (firstMonth === lastMonth) {
      return CHART_CENTER_X;
    }

    const position = (index - firstMonth) / (lastMonth - firstMonth);

    return CHART_LEFT + position * CHART_WIDTH;
  };

  const ceiling = chartCeiling(response);

  const yCoordinate = (value: number): number => CHART_BOTTOM - (value / ceiling) * CHART_HEIGHT;

  const months = buildMonths(firstMonth, lastMonth, xCoordinate);

  const series = response.series
    .filter((item) => item.points.length > 0)
    .map((item) => {
      const points = [...item.points]
        .sort((first, second) => first.period.localeCompare(second.period))
        .map((point) => ({
          ...point,
          label: monthLabel(point.period),
          x: xCoordinate(monthIndex(point.period)),
          y: yCoordinate(point.value),
        }));

      const path = points
        .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'}${point.x},${point.y}`)
        .join(' ');

      const paletteSlot = SERIES_PALETTE_SLOT[item.metric];

      return {
        ...item,
        points,
        path,
        hasLine: points.length > 1,
        color: `var(--ic-chart-series-${paletteSlot + 1})`,
      };
    });

  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => {
    const value = (ceiling * index) / TICK_DIVISIONS;

    return {
      value,
      y: yCoordinate(value),
    };
  });

  return {
    months,
    series,
    ticks,
    unit: series[0]?.unit ?? '',
  };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  if (Number.isNaN(Date.parse(value))) {
    return false;
  }

  return new Date(value).toISOString().slice(0, 10) === value;
}

function maximumPeriodEndDate(startDate: string): string {
  const [year, month, day] = startDate.split('-').map(Number);

  const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();

  const maximumDate = new Date(Date.UTC(year + 1, month - 1, Math.min(day, lastDay)));

  maximumDate.setUTCDate(maximumDate.getUTCDate() - 1);

  return maximumDate.toISOString().slice(0, 10);
}

function monthIndex(period: string): number {
  const [year, month] = period.split('-').map(Number);

  return year * 12 + month - 1;
}

function buildMonths(
  firstMonth: number,
  lastMonth: number,
  xCoordinate: (index: number) => number,
) {
  return Array.from({ length: lastMonth - firstMonth + 1 }, (_, offset) => {
    const index = firstMonth + offset;
    const year = Math.floor(index / 12);
    const month = String((index % 12) + 1).padStart(2, '0');
    const period = `${year}-${month}`;

    return {
      period,
      label: monthLabel(period),
      x: xCoordinate(index),
    };
  });
}

function chartCeiling(response: BodyMetricsProgressChartResponse): number {
  const maxValue = Math.max(
    0,
    ...response.series.flatMap((series) => series.points.map((point) => point.value)),
  );

  return Math.max(1, Math.ceil(maxValue / TICK_DIVISIONS) * TICK_DIVISIONS);
}
