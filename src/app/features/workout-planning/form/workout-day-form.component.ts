import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { WEEK_DAY_LABELS } from '../workout-planning.labels';
import { WeekDay, WorkoutDayDetailResponse } from '../workout-planning.models';
import { WorkoutDayForm } from '../workout-day.form';

@Component({
  selector: 'app-workout-day-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './workout-day-form.component.html',
  styleUrl: './workout-day-form.component.scss',
})
export class WorkoutDayFormComponent {
  readonly form = input.required<WorkoutDayForm>();
  readonly mode = input.required<'create' | 'edit' | 'reorder'>();
  readonly day = input<WorkoutDayDetailResponse | null>(null);
  readonly days = input.required<WorkoutDayDetailResponse[]>();
  readonly saving = input(false);
  readonly submitted = output<void>();
  readonly cancelled = output<void>();
  readonly weekDayLabels = WEEK_DAY_LABELS;
  readonly weekDays = Object.keys(WEEK_DAY_LABELS) as WeekDay[];

  positions(): number[] {
    const target = this.form().controls.weekDay.value;
    const count = this.days().filter(
      (day) => day.weekDay === target && day.id !== this.day()?.id,
    ).length;
    return Array.from({ length: count + 1 }, (_, index) => index + 1);
  }

  changeWeekDay(): void {
    this.form().controls.sortOrder.setValue(1);
  }

  submit(): void {
    if (!this.saving()) this.submitted.emit();
  }
}
