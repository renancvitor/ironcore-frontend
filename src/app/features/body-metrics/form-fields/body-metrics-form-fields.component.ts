import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { BodyMetricsForm } from '../body-metrics.form';

type MeasurementName = Exclude<keyof BodyMetricsForm['controls'], 'notes'>;

interface MeasurementField {
  name: MeasurementName;
  label: string;
  unit: string;
  required?: boolean;
}

const MAIN_FIELDS: readonly MeasurementField[] = [
  { name: 'weightKg', label: 'Peso', unit: 'kg', required: true },
  { name: 'heightCm', label: 'Altura', unit: 'cm', required: true },
];

const CIRCUMFERENCE_FIELDS: readonly MeasurementField[] = [
  { name: 'neckCm', label: 'Pescoço', unit: 'cm' },
  { name: 'chestCm', label: 'Peitoral', unit: 'cm' },
  { name: 'shoulderCm', label: 'Ombros', unit: 'cm' },
  { name: 'armCm', label: 'Braço', unit: 'cm' },
  { name: 'forearmCm', label: 'Antebraço', unit: 'cm' },
  { name: 'waistCm', label: 'Cintura', unit: 'cm' },
  { name: 'hipCm', label: 'Quadril', unit: 'cm' },
  { name: 'thighCm', label: 'Coxa', unit: 'cm' },
  { name: 'calfCm', label: 'Panturrilha', unit: 'cm' },
];

@Component({
  selector: 'app-body-metrics-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './body-metrics-form-fields.component.html',
  styleUrl: './body-metrics-form-fields.component.scss',
})
export class BodyMetricsFormFieldsComponent {
  readonly form = input.required<BodyMetricsForm>();
  readonly section = input.required<'main' | 'circumferences' | 'notes'>();
  readonly layout = input<'grid' | 'rows'>('grid');

  get fields(): readonly MeasurementField[] {
    return this.section() === 'main' ? MAIN_FIELDS : CIRCUMFERENCE_FIELDS;
  }

  errorMessage(name: MeasurementName): string {
    const control = this.form().controls[name];
    if (!control.touched || !control.errors) return '';

    if (control.hasError('required')) {
      return name === 'weightKg' ? 'Informe o peso.' : 'Informe a altura.';
    }
    if (control.hasError('positive')) {
      if (name === 'weightKg') return 'O peso deve ser maior do que zero.';
      if (name === 'heightCm') return 'A altura deve ser maior do que zero.';
      return 'Informe uma medida maior que zero.';
    }
    if (control.hasError('max')) {
      if (name === 'weightKg') return 'O peso não pode ultrapassar 500 kg.';
      if (name === 'heightCm') return 'A altura não pode ultrapassar 300 cm.';
      return 'A medida não pode ultrapassar 300 cm.';
    }
    return 'Informe um valor válido.';
  }
}
