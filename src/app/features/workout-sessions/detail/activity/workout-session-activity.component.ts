import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { executionFieldError, executionNotes, validateExecutionNumberInput } from '../../workout-session-execution.form';
import { SessionActivityEditor, SessionSetEditor, WorkoutSessionEditorState } from '../workout-session-editor-state.service';
import { WorkoutSessionSetFormComponent } from '../set/workout-session-set-form.component';

@Component({
  selector: 'app-workout-session-activity',
  imports: [DecimalPipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTooltipModule, ButtonComponent, WorkoutSessionSetFormComponent],
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
  executionOpen = false;
  setsOpen = false;
  durationOpen = false;
  notesOpen = false;
  modeOpen = false;

  activityAttention(): boolean {
    const model = this.activity();
    return this.editor.activityPending(model) || !!model.error || model.conflict || model.form.invalid;
  }

  durationAttention(): boolean {
    const model = this.activity();
    return !!model.error || model.conflict || model.form.controls.actualDurationMinutes.invalid ||
      model.form.controls.actualDistanceKm.invalid ||
      model.form.controls.actualDurationMinutes.value !== model.baseline.actualDurationMinutes ||
      model.form.controls.actualDistanceKm.value !== model.baseline.actualDistanceKm;
  }

  notesAttention(): boolean {
    const model = this.activity();
    return !!model.error || model.conflict || model.form.controls.notes.invalid ||
      executionNotes(model.form.controls.notes.value) !== model.baseline.notes;
  }

  cancelActivity(): void {
    const collapse = () => {
      this.durationOpen = false;
      this.notesOpen = false;
    };
    if (this.activityAttention()) this.editor.discardActivity(this.activity(), collapse);
    else collapse();
  }

  setsAttention(): boolean {
    const model = this.activity();
    return model.modeConflict || this.editor.modePending(model) || model.rows.some((row) =>
      this.editor.setPending(row) || !!row.error || row.conflict || !!row.uncertain || row.form.invalid);
  }

  executionAttention(): boolean { return this.activityAttention() || this.setsAttention(); }

  keepOpen(event: Event, required: boolean): boolean {
    const details = event.target as HTMLDetailsElement;
    if (required) details.open = true;
    return details.open;
  }

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
          ? `execution-${model.confirmed.id}-${next.key}-edit` : `${this.prefix()}-add-set`);
        (target?.querySelector<HTMLElement>('button') ?? target)?.focus();
      });
    });
  }
}
