import { PageResult } from '../../shared/models/page-result.model';

interface BodyCircumferencesRequest {
  neckCm: number | null;
  chestCm: number | null;
  shoulderCm: number | null;
  armCm: number | null;
  forearmCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
}

interface BodyCircumferencesResponse {
  neckCm: number | null;
  chestCm: number | null;
  shoulderCm: number | null;
  armCm: number | null;
  forearmCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
}

export interface CreateBodyMetricsRequest {
  weightKg: number;
  heightCm: number;
  circumferences: BodyCircumferencesRequest | null;
  notes: string | null;
}

export interface CreateBodyMetricsResponse {
  id: number;
  personId: number;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  circumferences: BodyCircumferencesResponse | null;
  bmi: number;
  bodyFatPercentage: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  notes: string | null;
}

export interface UpdateBodyMetricsRequest {
  weightKg: number;
  heightCm: number;
  circumferences: BodyCircumferencesRequest | null;
  notes: string | null;
}

export interface UpdateBodyMetricsResponse {
  id: number;
  personId: number;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  circumferences: BodyCircumferencesResponse | null;
  bmi: number;
  bodyFatPercentage: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  notes: string | null;
  updatedAt: string;
}

interface ListBodyMetricsItemResponse {
  id: number;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  notes: string | null;
}

export interface ListBodyMetricsResponse {
  metrics: PageResult<ListBodyMetricsItemResponse>;
}

export interface GetBodyMetricsResponse {
  id: number;
  personId: number;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  circumferences: BodyCircumferencesResponse | null;
  bmi: number;
  bodyFatPercentage: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  notes: string | null;
  updatedAt: string | null;
}

export interface GetLatestBodyMetricsResponse {
  id: number;
  personId: number;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  circumferences: BodyCircumferencesResponse | null;
  bmi: number;
  bodyFatPercentage: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  notes: string | null;
  updatedAt: string | null;
}

export interface BodyMetricsProgressChartRequest {
  startDate: string;
  endDate: string;
}

export enum BodyMetricsProgressChartType {
  BODY_COMPOSITION = 'BODY_COMPOSITION',
  CIRCUMFERENCES = 'CIRCUMFERENCES',
  BODY_FAT = 'BODY_FAT',
}

interface BodyMetricsProgressPointResponse {
  period: string;
  value: number;
}

export enum BodyMetricsProgressMetric {
  WEIGHT_KG = 'WEIGHT_KG',
  FAT_MASS_KG = 'FAT_MASS_KG',
  LEAN_MASS_KG = 'LEAN_MASS_KG',
  BODY_FAT_PERCENTAGE = 'BODY_FAT_PERCENTAGE',
  BMI = 'BMI',
  NECK_CM = 'NECK_CM',
  CHEST_CM = 'CHEST_CM',
  SHOULDER_CM = 'SHOULDER_CM',
  ARM_CM = 'ARM_CM',
  FOREARM_CM = 'FOREARM_CM',
  WAIST_CM = 'WAIST_CM',
  HIP_CM = 'HIP_CM',
  THIGH_CM = 'THIGH_CM',
  CALF_CM = 'CALF_CM',
}

interface BodyMetricsProgressSeriesResponse {
  metric: BodyMetricsProgressMetric;
  label: string;
  unit: string;
  points: BodyMetricsProgressPointResponse[];
}

export interface BodyMetricsProgressChartResponse {
  startDate: string;
  endDate: string;
  chartType: BodyMetricsProgressChartType;
  series: BodyMetricsProgressSeriesResponse[];
}

export interface BodyMetricsProgressChangesRequest {
  startDate: string;
  endDate: string;
}

interface BodyMetricsProgressChangeResponse {
  metric: BodyMetricsProgressMetric;
  label: string;
  unit: string;
  firstDate: string;
  firstValue: number;
  lastDate: string;
  lastValue: number;
  absoluteChange: number;
  percentageChange: number;
}

export interface BodyMetricsProgressChangesResponse {
  startDate: string;
  endDate: string;
  changes: BodyMetricsProgressChangeResponse[];
}
