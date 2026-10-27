import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { catchError, defer, EMPTY, finalize, Observable, Subject, take, takeUntil } from 'rxjs';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import {
  ActivityExecutionValues, activityExecutionValue, buildSessionSetPatch, createSessionActivityForm,
  createSessionSetForm, executionChanges, executionNotes, hasSetExecution, SessionActivityForm,
  SessionSetForm, SetExecutionValues, setExecutionValue,
} from '../workout-session-execution.form';
import {
  ActualLoadMode, CreateWorkoutSessionSetRequest, GetWorkoutSessionDetailResponse,
  WorkoutSessionActivityDetailResponse, WorkoutSessionSetDetailResponse,
} from '../workout-sessions.models';
import { WorkoutSessionsService } from '../workout-sessions.service';

export interface ExecutionFeedback {
  error: string;
  message: string;
  conflict: boolean;
}

export interface SessionSetEditor extends ExecutionFeedback {
  key: string;
  setNumber: number;
  persisted: WorkoutSessionSetDetailResponse | null;
  baseline: SetExecutionValues;
  form: SessionSetForm;
  removed: boolean;
  uncertain: { request: CreateWorkoutSessionSetRequest; reviewed: boolean } | null;
}

export interface SessionActivityEditor extends ExecutionFeedback {
  confirmed: WorkoutSessionActivityDetailResponse;
  baseline: ActivityExecutionValues;
  form: SessionActivityForm;
  selectedMode: FormControl<ActualLoadMode | null>;
  modeConflict: boolean;
  removed: boolean;
  rows: SessionSetEditor[];
}

const feedback = (): ExecutionFeedback => ({ error: '', message: '', conflict: false });
const changed = <T extends object>(value: T, baseline: T) =>
  Object.keys(executionChanges(value, baseline)).length > 0;

@Injectable()
export class WorkoutSessionEditorState {
  private readonly service = inject(WorkoutSessionsService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contextChanged = new Subject<void>();
  private localKey = 0;

  readonly session = signal<GetWorkoutSessionDetailResponse | null>(null);
  readonly activities = signal<SessionActivityEditor[]>([]);
  readonly revision = signal(0);
  readonly operation = signal<string | null>(null);
  readonly confirming = signal(false);
  readonly busy = computed(() => this.operation() !== null || this.confirming());
  readonly needsRefresh = signal(false);
  readonly loadError = signal('');
  readonly notFound = signal(false);
  readonly recoveryMessage = signal('');
  readonly notesForm = new FormGroup({ notes: new FormControl('', { nonNullable: true }) });
  readonly notes = this.notesForm.controls.notes;
  readonly notesFeedback = feedback();
  isBlocked: () => boolean = () => false;
  readonly canWrite = computed(() => this.session()?.status === 'IN_PROGRESS' &&
    !this.busy() && !this.needsRefresh() && !this.loadError() && !this.notFound() && !this.isBlocked());
  readonly hasUncertainCreation = computed(() => {
    this.revision();
    return this.activities().some((activity) => activity.rows.some((row) => !!row.uncertain));
  });
  readonly hasPending = computed(() => {
    this.revision();
    return this.notesPending() || this.notesFeedback.conflict || this.activities().some((activity) =>
      this.activityPending(activity) || activity.conflict || this.modePending(activity) || activity.modeConflict ||
      activity.rows.some((row) => this.setPending(row) || !!row.uncertain || row.conflict));
  });

  constructor() {
    this.notes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.touch());
  }

  reset(): void {
    this.contextChanged.next();
    this.session.set(null);
    this.activities.set([]);
    this.operation.set(null);
    this.confirming.set(false);
    this.needsRefresh.set(false);
    this.loadError.set('');
    this.notFound.set(false);
    this.recoveryMessage.set('');
    this.notes.reset('', { emitEvent: false });
    Object.assign(this.notesFeedback, feedback());
    this.touch();
  }

  notesPending(): boolean {
    return executionNotes(this.notes.value) !== executionNotes(this.session()?.notes ?? null);
  }

  activityPending(activity: SessionActivityEditor): boolean {
    return changed(activityExecutionValue(activity.form), activity.baseline);
  }

  setPending(row: SessionSetEditor): boolean {
    return changed(setExecutionValue(row.form), row.baseline);
  }

  modePending(activity: SessionActivityEditor): boolean {
    return activity.confirmed.actualLoadMode !== null &&
      activity.selectedMode.value !== activity.confirmed.actualLoadMode;
  }

  reconcile(session: GetWorkoutSessionDetailResponse): void {
    const previous = this.session();
    if (previous && previous.id !== session.id) return;
    session = { ...session, activities: session.activities.map((activity) => ({
      ...activity, sets: activity.sets.map((set) => ({ ...set })),
    })) };
    const oldNotes = executionNotes(previous?.notes ?? null);
    const localNotes = executionNotes(this.notes.value);
    const incomingNotes = executionNotes(session.notes);
    if (localNotes === oldNotes || localNotes === incomingNotes) this.notes.setValue(session.notes ?? '', { emitEvent: false });
    else if (incomingNotes !== oldNotes && incomingNotes !== localNotes) this.notesFeedback.conflict = true;

    const existing = this.activities();
    const next = session.activities.map((incoming) => {
      const activity = existing.find((value) => value.confirmed.id === incoming.id);
      if (!activity) return this.createActivity(incoming, session.status === 'IN_PROGRESS');
      const previousMode = activity.confirmed.actualLoadMode;
      if (previousMode !== incoming.actualLoadMode) {
        if (incoming.actualLoadMode !== null && activity.selectedMode.value !== incoming.actualLoadMode &&
          (activity.rows.some((row) => this.setPending(row) && row.form.controls.actualLoadKg.value !== null) ||
            this.modePending(activity))) activity.modeConflict = true;
        if (incoming.actualLoadMode !== null &&
          (activity.selectedMode.value === previousMode || !this.modePending(activity))) {
          activity.selectedMode.setValue(incoming.actualLoadMode, { emitEvent: false });
        }
      }
      this.mergeActivity(activity, incoming);
      activity.confirmed = incoming;
      activity.removed = false;
      activity.rows = this.mergeRows(activity, incoming, session.status === 'IN_PROGRESS');
      if (activity.error && !activity.conflict && !this.activityPending(activity) && !this.modePending(activity)) {
        activity.error = '';
        activity.message = 'Dados conferidos no servidor.';
      }
      return activity;
    });
    for (const activity of existing) {
      if (!next.includes(activity) && (this.activityPending(activity) ||
        activity.rows.some((row) => this.setPending(row) || !!row.uncertain))) {
        activity.removed = true;
        activity.conflict = true;
        activity.error = 'Esta atividade não está mais disponível. Revise ou descarte os rascunhos.';
        next.push(activity);
      }
    }
    this.session.set(session);
    if (this.notesFeedback.error && !this.notesFeedback.conflict && !this.notesPending()) {
      this.notesFeedback.error = '';
      this.notesFeedback.message = 'Relato conferido no servidor.';
    }
    this.activities.set(next);
    this.needsRefresh.set(false);
    this.loadError.set('');
    this.notFound.set(false);
    this.recoveryMessage.set('');
    this.touch();
  }

  private createActivity(confirmed: WorkoutSessionActivityDetailResponse, active: boolean): SessionActivityEditor {
    const form = createSessionActivityForm(confirmed);
    const activity: SessionActivityEditor = {
      ...feedback(), confirmed, form, baseline: activityExecutionValue(form),
      selectedMode: new FormControl<ActualLoadMode | null>(confirmed.actualLoadMode),
      modeConflict: false, removed: false, rows: [],
    };
    this.watch(form.valueChanges);
    this.watch(activity.selectedMode.valueChanges);
    activity.rows = this.mergeRows(activity, confirmed, active);
    return activity;
  }

  private createRow(number: number, persisted: WorkoutSessionSetDetailResponse | null = null): SessionSetEditor {
    const form = createSessionSetForm(persisted ?? undefined);
    this.watch(form.valueChanges);
    return {
      ...feedback(), key: `line-${++this.localKey}`, setNumber: number, persisted, form,
      baseline: setExecutionValue(form), removed: false, uncertain: null,
    };
  }

  private mergeActivity(activity: SessionActivityEditor, incoming: WorkoutSessionActivityDetailResponse): void {
    const local = activityExecutionValue(activity.form);
    const remote: ActivityExecutionValues = { actualDurationMinutes: incoming.actualDurationMinutes,
      actualDistanceKm: incoming.actualDistanceKm, notes: executionNotes(incoming.notes) };
    for (const key of Object.keys(remote) as (keyof ActivityExecutionValues)[]) {
      if (local[key] === activity.baseline[key] || local[key] === remote[key]) {
        if (key === 'notes') activity.form.controls.notes.setValue(incoming.notes ?? '', { emitEvent: false });
        else activity.form.controls[key].setValue(remote[key], { emitEvent: false });
      } else if (remote[key] !== activity.baseline[key] && remote[key] !== local[key]) activity.conflict = true;
    }
    activity.baseline = remote;
  }

  private mergeRows(activity: SessionActivityEditor, incoming: WorkoutSessionActivityDetailResponse, active: boolean): SessionSetEditor[] {
    const rows: SessionSetEditor[] = [];
    for (const persisted of incoming.sets) {
      const row = activity.rows.find((value) => value.persisted?.id === persisted.id) ??
        activity.rows.find((value) => value.setNumber === persisted.setNumber);
      if (!row) { rows.push(this.createRow(persisted.setNumber, persisted)); continue; }
      if (row.persisted && row.persisted.id !== persisted.id && this.setPending(row)) {
        row.conflict = true;
        row.error = 'Esta posição foi substituída por outro registro no servidor. Revise antes de aplicar seu rascunho ao registro recuperado.';
      }
      const local = setExecutionValue(row.form);
      const remote: SetExecutionValues = { actualLoadKg: persisted.actualLoadKg,
        actualReps: persisted.actualReps, notes: executionNotes(persisted.notes) };
      if (!row.persisted && hasSetExecution(local) && changed(local, remote)) row.conflict = true;
      if (row.uncertain) {
        const sent = row.uncertain.request;
        if (persisted.actualLoadKg !== (sent.actualLoadKg ?? null) ||
          persisted.actualLoadMode !== (sent.actualLoadMode ?? null) ||
          persisted.actualReps !== (sent.actualReps ?? null) ||
          executionNotes(persisted.notes) !== executionNotes(sent.notes ?? null)) row.conflict = true;
      }
      for (const key of Object.keys(remote) as (keyof SetExecutionValues)[]) {
        if (local[key] === row.baseline[key] || local[key] === remote[key]) {
          if (key === 'notes') row.form.controls.notes.setValue(persisted.notes ?? '', { emitEvent: false });
          else row.form.controls[key].setValue(remote[key], { emitEvent: false });
        } else if (remote[key] !== row.baseline[key] && remote[key] !== local[key]) row.conflict = true;
      }
      row.baseline = remote;
      row.persisted = persisted;
      row.removed = false;
      if (row.uncertain) {
        row.message = 'Registro encontrado no servidor. Revise os valores recuperados.';
        row.error = '';
        row.uncertain = null;
      }
      if (row.error && !row.conflict && !this.setPending(row)) {
        row.error = '';
        row.message = 'Registro conferido no servidor.';
      }
      rows.push(row);
    }
    for (const row of activity.rows) {
      if (rows.includes(row)) continue;
      if (row.persisted) {
        if (!this.setPending(row) && !row.conflict) continue;
        row.removed = true;
        row.conflict = true;
        row.error = 'A série foi removida no servidor. Seu rascunho foi preservado; descarte-o após revisar.';
      }
      if (row.uncertain) {
        row.uncertain.reviewed = true;
        row.message = 'A série ainda não apareceu na consulta. A gravação original pode estar em andamento. Consulte novamente ou confirme uma tentativa com o mesmo número.';
      }
      if (active || this.setPending(row) || row.uncertain || row.conflict) rows.push(row);
    }
    if (active) {
      for (let number = 1; number <= (incoming.plannedSetsSnapshot ?? 0); number++) {
        if (!rows.some((row) => row.setNumber === number)) rows.push(this.createRow(number));
      }
    }
    return rows.sort((left, right) => left.setNumber - right.setNumber);
  }

  addSet(activity: SessionActivityEditor): void {
    if (!this.canWrite() || activity.removed) return;
    const number = Math.max(0, ...activity.rows.map((row) => row.setNumber)) + 1;
    if (number > 2147483647) return;
    activity.rows.push(this.createRow(number));
    this.touch();
  }

  saveNotes(): void {
    if (!this.canWrite() || !this.notesPending() || this.notesFeedback.conflict) return;
    if (this.notes.invalid) { this.notes.markAsTouched(); return; }
    const notes = executionNotes(this.notes.value);
    this.write('notes', this.notesFeedback, () => this.service.updateWorkoutSessionNotes(this.session()!.id, { notes }),
      (response) => {
        this.notes.setValue(response.notes ?? '', { emitEvent: false });
        this.reconcile(response);
      }, this.notes);
  }

  saveActivity(activity: SessionActivityEditor): void {
    if (!this.canWrite() || activity.removed || activity.conflict) return;
    if (activity.form.invalid) { activity.form.markAllAsTouched(); return; }
    const patch = executionChanges(activityExecutionValue(activity.form), activity.baseline);
    if (!Object.keys(patch).length) return;
    this.write(`activity:${activity.confirmed.id}`, activity,
      () => this.service.updateWorkoutSessionActivityExecution(this.session()!.id, activity.confirmed.id, patch),
      (response) => {
        activity.form.reset({ actualDurationMinutes: response.actualDurationMinutes,
          actualDistanceKm: response.actualDistanceKm, notes: response.notes ?? '' }, { emitEvent: false });
        activity.baseline = activityExecutionValue(activity.form);
        this.commitActivity(response);
      }, activity.form);
  }

  saveSet(activity: SessionActivityEditor, row: SessionSetEditor): void {
    if (!this.canWrite() || activity.removed || row.removed || row.conflict ||
      activity.modeConflict || this.modePending(activity)) return;
    if (row.form.invalid) { row.form.markAllAsTouched(); return; }
    const value = setExecutionValue(row.form);
    if (!hasSetExecution(value)) {
      if (row.persisted) row.error = 'Uma série registrada não pode ficar vazia. Use Excluir série para remover o registro.';
      this.touch();
      return;
    }
    const mode = activity.confirmed.actualLoadMode ?? activity.selectedMode.value;
    if (value.actualLoadKg !== null && mode === null) {
      row.error = 'Selecione TOTAL ou PER_SIDE no exercício antes de registrar carga.';
      this.touch();
      return;
    }
    const create: CreateWorkoutSessionSetRequest = { setNumber: row.setNumber };
    if (value.actualReps !== null) create.actualReps = value.actualReps;
    if (value.notes !== null) create.notes = value.notes;
    if (value.actualLoadKg !== null) { create.actualLoadKg = value.actualLoadKg; create.actualLoadMode = mode; }
    const patch = buildSessionSetPatch(value, row.baseline, mode);
    if (row.persisted && !Object.keys(patch).length) return;
    const send = () => {
      const persisted = row.persisted;
      this.write(`set:${row.key}`, row,
        () => persisted
          ? this.service.updateWorkoutSessionSet(this.session()!.id, activity.confirmed.id, persisted.id, patch)
          : this.service.createWorkoutSessionSet(this.session()!.id, activity.confirmed.id, create),
        (response) => {
          row.persisted = response;
          row.baseline = { actualLoadKg: response.actualLoadKg, actualReps: response.actualReps, notes: executionNotes(response.notes) };
          row.form.reset({ ...row.baseline, notes: response.notes ?? '' }, { emitEvent: false });
          row.uncertain = null;
          this.commitActivity({ ...activity.confirmed, sets: [
            ...activity.confirmed.sets.filter((set) => set.id !== response.id), response,
          ].sort((a, b) => a.setNumber - b.setNumber) });
        }, row.form, persisted ? undefined : create);
    };
    if (!row.uncertain) send();
    else if (row.uncertain.reviewed) this.confirm(
      'Tentar registrar a série novamente',
      'A consulta não encontrou a série, mas a primeira gravação ainda pode terminar. A tentativa usará o mesmo número; se ele já existir, recuperaremos o registro sem criar outra posição.',
      'Tentar com o mesmo número', send,
    );
  }

  deleteSet(activity: SessionActivityEditor, row: SessionSetEditor, afterDelete?: () => void): void {
    if (!this.canWrite() || activity.removed || !row.persisted || row.removed) return;
    this.confirm('Excluir série', `Excluir a série ${row.setNumber}? O registro e as alterações locais desta série serão removidos.`,
      'Excluir série', () => this.write(`delete:${row.key}`, row,
        () => this.service.deleteWorkoutSessionSet(this.session()!.id, activity.confirmed.id, row.persisted!.id),
        () => {
          const setId = row.persisted!.id;
          activity.rows = activity.rows.filter((value) => value !== row);
          this.commitActivity({ ...activity.confirmed, sets: activity.confirmed.sets.filter((value) => value.id !== setId) });
          activity.message = 'Série excluída.';
          afterDelete?.();
        }, row.form));
  }

  applyMode(activity: SessionActivityEditor): void {
    const mode = activity.selectedMode.value;
    if (!this.canWrite() || activity.removed || mode === null || !this.modePending(activity)) return;
    this.confirm('Reinterpretar cargas registradas',
      `Aplicar ${mode} às séries com carga? TOTAL representa a carga total; PER_SIDE representa a carga por lado, considerando dois lados equivalentes. Os números serão mantidos, sem conversão ou inclusão de barra, corpo ou equipamento. Rascunhos com carga usarão este modo quando forem salvos; não serão salvos agora.`,
      'Aplicar modo', () => this.write(`mode:${activity.confirmed.id}`, activity,
        () => this.service.changeWorkoutSessionActivityLoadMode(this.session()!.id, activity.confirmed.id, { actualLoadMode: mode }),
        (response) => {
          activity.confirmed = { ...activity.confirmed, actualLoadMode: response.actualLoadMode };
          activity.modeConflict = false;
          this.commitActivity(response);
        }, activity.selectedMode));
  }

  acknowledge(feedback: ExecutionFeedback): void {
    if (this.busy() || this.isBlocked()) return;
    feedback.conflict = false;
    feedback.error = '';
    this.touch();
  }

  acknowledgeMode(activity: SessionActivityEditor): void {
    if (this.busy() || this.isBlocked()) return;
    activity.modeConflict = false;
    activity.selectedMode.setValue(activity.confirmed.actualLoadMode, { emitEvent: false });
    this.touch();
  }

  discardNotes(): void {
    if (this.busy() || this.isBlocked()) return;
    this.confirm('Descartar alterações do relato', 'O relato voltará ao último valor confirmado pelo servidor.', 'Descartar alterações', () => {
      this.notes.reset(this.session()?.notes ?? '');
      Object.assign(this.notesFeedback, feedback());
      this.touch();
    });
  }

  discardActivity(activity: SessionActivityEditor): void {
    if (this.busy() || this.isBlocked()) return;
    this.confirm('Descartar alterações da atividade', 'Duração, distância e relato voltarão aos valores confirmados. As séries não serão alteradas.', 'Descartar alterações', () => {
      activity.form.reset({ ...activity.baseline, notes: activity.baseline.notes ?? '' });
      Object.assign(activity, feedback());
      this.touch();
    });
  }

  discardSet(activity: SessionActivityEditor, row: SessionSetEditor): void {
    if (this.busy() || this.isBlocked()) return;
    this.confirm('Descartar rascunho da série',
      'As alterações locais serão descartadas. Isso não exclui nem desfaz uma possível gravação no servidor.', 'Descartar rascunho', () => {
        if (row.removed || !row.persisted && row.setNumber > (activity.confirmed.plannedSetsSnapshot ?? 0)) {
          activity.rows = activity.rows.filter((value) => value !== row);
        } else {
          row.form.reset({ ...row.baseline, notes: row.baseline.notes ?? '' });
          row.uncertain = null;
          Object.assign(row, feedback());
        }
        activity.rows = this.mergeRows(activity, activity.confirmed, this.session()?.status === 'IN_PROGRESS');
        this.touch();
      });
  }

  discardAll(): void {
    const session = this.session();
    if (!session) return;
    this.reset();
    this.reconcile(session);
  }

  recover(): void {
    if (this.busy() || this.isBlocked() || !this.session()) return;
    this.operation.set('refresh');
    this.refresh();
  }

  private commitActivity(response: WorkoutSessionActivityDetailResponse): void {
    const session = this.session();
    if (session) this.reconcile({ ...session, activities: session.activities.map((activity) =>
      activity.id === response.id ? response : activity) });
  }

  private write<T>(key: string, target: ExecutionFeedback, request: () => Observable<T>,
    commit: (response: T) => void, control: AbstractControl,
    uncertainCreate?: CreateWorkoutSessionSetRequest): void {
    if (!this.canWrite()) return;
    target.error = '';
    target.message = '';
    this.operation.set(key);
    control.disable({ emitEvent: false });
    request().pipe(takeUntil(this.contextChanged), takeUntilDestroyed(this.destroyRef),
      finalize(() => { if (control.disabled) control.enable({ emitEvent: false }); this.touch(); }),
    ).subscribe({
      next: (response) => {
        commit(response);
        target.message = 'Salvo.';
        this.needsRefresh.set(true);
        this.recoveryMessage.set('Registro salvo; atualizando o estado da sessão.');
        this.refresh();
      },
      error: (error) => {
        control.enable({ emitEvent: false });
        this.operation.set(null);
        target.error = error.error?.message ?? 'Não foi possível confirmar a gravação. Seus dados foram preservados.';
        for (const field of error.error?.fields ?? []) {
          const fieldControl = control.get(field.field);
          fieldControl?.setErrors({ server: field.message });
          fieldControl?.markAsTouched();
        }
        if (error.status === 401) return;
        if (uncertainCreate && (error.status === 0 || error.status >= 500)) {
          (target as SessionSetEditor).uncertain = { request: uncertainCreate, reviewed: false };
        }
        if ([0, 404, 409].includes(error.status) || error.status >= 500) {
          this.needsRefresh.set(true);
          this.recoveryMessage.set('A operação precisa de conferência. Consultando os registros; nenhuma escrita será repetida automaticamente.');
          this.operation.set('refresh');
          this.refresh();
        }
        this.touch();
      },
    });
  }

  private refresh(): void {
    const id = this.session()!.id;
    this.service.getWorkoutSessionDetail(id).pipe(takeUntil(this.contextChanged),
      takeUntilDestroyed(this.destroyRef), finalize(() => this.operation.set(null)),
    ).subscribe({
      next: (session) => this.reconcile(session),
      error: (error) => {
        if (error.status === 401) return;
        this.needsRefresh.set(true);
        this.recoveryMessage.set('Não foi possível atualizar a sessão. Os dados digitados foram preservados. Use Consultar registros para recuperar o estado antes de gravar ou encerrar.');
        this.touch();
      },
    });
  }

  private confirm(title: string, message: string, primaryAction: string, action: () => void): void {
    this.confirming.set(true);
    defer(() => this.dialog.open({ title, message, primaryAction, secondaryAction: 'Voltar' })).pipe(
      take(1), catchError(() => EMPTY), takeUntil(this.contextChanged), takeUntilDestroyed(this.destroyRef),
      finalize(() => this.confirming.set(false)),
    ).subscribe((accepted) => {
      this.confirming.set(false);
      if (accepted === true && !this.isBlocked()) action();
    });
  }

  private watch(changes: Observable<unknown>): void {
    changes.pipe(takeUntil(this.contextChanged), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.touch());
  }

  private touch(): void { this.revision.update((value) => value + 1); }
}
