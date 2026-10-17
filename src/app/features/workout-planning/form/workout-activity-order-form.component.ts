import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { WorkoutActivityDetailResponse } from '../workout-planning.models';
import { WorkoutActivityOrderForm } from '../workout-activity.form';

@Component({
  selector: 'app-workout-activity-order-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, ButtonComponent],
  templateUrl: './workout-activity-order-form.component.html',
  styleUrl: './workout-activity-form.component.scss',
})
export class WorkoutActivityOrderFormComponent {
  readonly form = input.required<WorkoutActivityOrderForm>();
  readonly exerciseName = input.required<string>();
  readonly activities = input.required<WorkoutActivityDetailResponse[]>();
  readonly saving = input(false);
  readonly submitted = output<void>();
  readonly cancelled = output<void>();

  submit(): void {
    if (!this.saving()) this.submitted.emit();
  }
}
