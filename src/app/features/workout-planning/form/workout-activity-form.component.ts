import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { WorkoutActivityForm } from '../workout-activity.form';

@Component({
  selector: 'app-workout-activity-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './workout-activity-form.component.html',
  styleUrl: './workout-activity-form.component.scss',
})
export class WorkoutActivityFormComponent {
  readonly form = input.required<WorkoutActivityForm>();
  readonly exerciseName = input.required<string>();
  readonly editing = input(false);
  readonly remaining = input(0);
  readonly saving = input(false);
  readonly submitted = output<void>();
  readonly cancelled = output<void>();
  readonly changeExercise = output<void>();
  readonly numericFields = [
    { name: 'sets', label: 'Séries', integer: true },
    { name: 'repRangeMin', label: 'Repetições mínimas', integer: true },
    { name: 'repRangeMax', label: 'Repetições máximas', integer: true },
    { name: 'targetLoadKg', label: 'Carga (kg)', integer: false },
    { name: 'durationMinutes', label: 'Duração (minutos)', integer: true },
    { name: 'distanceKm', label: 'Distância (km)', integer: false },
    { name: 'restSeconds', label: 'Descanso (segundos)', integer: true },
  ] as const;

  submit(): void {
    if (!this.saving()) this.submitted.emit();
  }
}
