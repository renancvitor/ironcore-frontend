import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { executionFieldError, validateExecutionNumberInput } from '../../workout-session-execution.form';
import { SessionActivityEditor, SessionSetEditor, WorkoutSessionEditorState } from '../workout-session-editor-state.service';
import { WorkoutSessionSetFormComponent } from '../set/workout-session-set-form.component';

@Component({
  selector: 'app-workout-session-activity',
  imports: [DecimalPipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    ButtonComponent, WorkoutSessionSetFormComponent],
  templateUrl: './workout-session-activity.component.html',
  styleUrl: './workout-session-activity.component.scss',
})
export class WorkoutSessionActivityComponent {
  private readonly document = inject(DOCUMENT);
  private destroyed = false;
  readonly activity = input.required<SessionActivityEditor>();
  readonly blocked = input(false);
  readonly revision = input(0);
  readonly progressRequested = output<number>();
  readonly editor = inject(WorkoutSessionEditorState);
  readonly fieldError = executionFieldError;
  readonly validateNumber = validateExecutionNumberInput;

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; });
  }

  prefix(): string { return `activity-${this.activity().confirmed.id}`; }

  submit(): void {
    const controls = this.activity().form.controls;
    validateExecutionNumberInput(this.document.getElementById(`${this.prefix()}-duration`) as HTMLInputElement | null, controls.actualDurationMinutes);
    validateExecutionNumberInput(this.document.getElementById(`${this.prefix()}-distance`) as HTMLInputElement | null, controls.actualDistanceKm);
    this.editor.saveActivity(this.activity());
    const suffix = controls.actualDurationMinutes.invalid ? 'duration' : controls.actualDistanceKm.invalid ? 'distance' : null;
    if (suffix) this.document.getElementById(`${this.prefix()}-${suffix}`)?.focus();
  }

  deleteSet(row: SessionSetEditor): void {
    const model = this.activity();
    const sessionId = this.editor.session()?.id;
    this.editor.deleteSet(model, row, () => {
      setTimeout(() => {
        if (this.destroyed || this.editor.session()?.id !== sessionId) return;
        const next = model.rows.find((value) => value.setNumber >= row.setNumber);
        const target = this.document.getElementById(next
          ? `execution-${model.confirmed.id}-${next.key}-reps` : `${this.prefix()}-add-set`);
        (target?.querySelector<HTMLElement>('button') ?? target)?.focus();
      });
    });
  }
}
