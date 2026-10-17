import { Component, computed, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { GetWorkoutCycleDetailResponse, TrainingGoalResponse } from '../workout-planning.models';
import { WorkoutCycleForm } from '../workout-cycle.form';

@Component({
  selector: 'app-workout-cycle-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './workout-cycle-form.component.html',
  styleUrl: './workout-cycle-form.component.scss',
})
export class WorkoutCycleFormComponent {
  readonly form = input.required<WorkoutCycleForm>();
  readonly cycle = input<GetWorkoutCycleDetailResponse | null>(null);
  readonly goals = input<TrainingGoalResponse[]>([]);
  readonly saving = input(false);
  readonly goalsLoading = input(false);
  readonly goalsError = input(false);
  readonly submitted = output<void>();
  readonly cancelled = output<void>();
  readonly retryGoals = output<void>();
  readonly currentGoalUnavailable = computed(
    () =>
      this.cycle() &&
      !this.goalsLoading() &&
      !this.goalsError() &&
      !this.goals().some((goal) => goal.id === this.cycle()!.trainingGoal.id),
  );

  submit(): void {
    if (!this.saving()) this.submitted.emit();
  }
}
