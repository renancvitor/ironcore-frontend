import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { GetWorkoutSessionDetailResponse } from '../workout-sessions.models';
import { sessionDetail, sessionSet } from '../workout-sessions.testing';
import { WorkoutSessionEditorState } from './workout-session-editor-state.service';

describe('WorkoutSessionEditorState with HTTP', () => {
  let editor: WorkoutSessionEditorState;
  let http: HttpTestingController;
  let detail: GetWorkoutSessionDetailResponse;
  const url = '/api/users/me/workout-sessions/100';
  const dialog = { open: vi.fn() };

  beforeEach(() => {
    dialog.open.mockReset().mockReturnValue(of(true));
    TestBed.configureTestingModule({ providers: [WorkoutSessionEditorState, provideHttpClient(),
      provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '' },
      { provide: DialogService, useValue: dialog }] });
    editor = TestBed.inject(WorkoutSessionEditorState);
    http = TestBed.inject(HttpTestingController);
    detail = structuredClone(sessionDetail);
    editor.reconcile(detail);
  });
  afterEach(() => http.verify());
  const activity = () => editor.activities()[0];
  const row = () => activity().rows[0];
  function refresh(response = detail) { http.expectOne(url).flush(response); }
  function loaded() {
    detail.activities[0].actualLoadMode = 'TOTAL';
    detail.activities[0].sets = [sessionSet({ actualLoadKg: 20, actualLoadMode: 'TOTAL', normalizedLoadKg: 20 })];
    editor.reconcile(detail);
  }

  it('creates only visual planned rows without touching confirmed sets or HTTP', () => {
    expect(activity().rows.map((value) => value.setNumber)).toEqual([1, 2, 3]);
    expect(activity().rows.every((value) => value.persisted === null)).toBe(true);
    expect(row().form.getRawValue()).toEqual({ actualLoadKg: null, actualReps: null, notes: '' });
    expect(editor.session()?.activities[0].sets).toEqual([]);
    expect(editor.hasPending()).toBe(false);
    editor.saveSet(activity(), row());
    http.expectNone(() => true);
  });

  it('merges persisted historical IDs with prescription and additional positions without duplication', () => {
    detail.activities[0].sets = [sessionSet({ id: 302, setNumber: 2 }), sessionSet({ id: 305, setNumber: 5 })];
    editor.reconcile(detail);
    editor.reconcile(structuredClone(detail));
    expect(activity().rows.map((value) => [value.setNumber, value.persisted?.id ?? null]))
      .toEqual([[1, null], [2, 302], [3, null], [5, 305]]);
    editor.addSet(activity());
    expect(activity().rows.at(-1)?.setNumber).toBe(6);
    http.expectNone(() => true);
  });

  it.each(['reps', 'load', 'notes'] as const)('creates a partial %s set and commits the backend response', (kind) => {
    const expected = kind === 'reps' ? { setNumber: 1, actualReps: 7 }
      : kind === 'load' ? { setNumber: 1, actualLoadKg: 10.25, actualLoadMode: 'PER_SIDE' }
      : { setNumber: 1, notes: 'Somente relato' };
    if (kind === 'reps') row().form.controls.actualReps.setValue(7);
    if (kind === 'load') {
      activity().selectedMode.setValue('PER_SIDE');
      row().form.controls.actualLoadKg.setValue(10.25);
    }
    if (kind === 'notes') row().form.controls.notes.setValue('Somente relato');
    editor.saveSet(activity(), row());
    const request = http.expectOne(`${url}/activities/200/sets`);
    expect(request.request.body).toEqual(expected);
    const persisted = sessionSet({ id: 987, actualReps: kind === 'reps' ? 7 : null,
      actualLoadKg: kind === 'load' ? 10.25 : null, actualLoadMode: kind === 'load' ? 'PER_SIDE' : null,
      normalizedLoadKg: kind === 'load' ? 20.5 : null, notes: kind === 'notes' ? 'Somente relato' : null });
    request.flush(persisted, { status: 201, statusText: 'Created' });
    expect(row().persisted?.id).toBe(987);
    expect(editor.busy()).toBe(true);
    detail.activities[0].sets = [persisted];
    detail.activities[0].actualLoadMode = persisted.actualLoadMode;
    refresh();
    expect(editor.hasPending()).toBe(false);
    expect(row().persisted?.normalizedLoadKg).toBe(persisted.normalizedLoadKg);
    expect(editor.busy()).toBe(false);
  });

  it('requires an explicit load mode even when no planned load exists', () => {
    detail.activities[0].plannedTargetLoadKgSnapshot = null;
    editor.reconcile(detail);
    row().form.controls.actualLoadKg.setValue(0);
    editor.saveSet(activity(), row());
    expect(row().error).toContain('Selecione TOTAL ou PER_SIDE');
    http.expectNone(() => true);
    activity().selectedMode.setValue('TOTAL');
    expect(editor.hasPending()).toBe(true);
    editor.saveSet(activity(), row());
    const request = http.expectOne(`${url}/activities/200/sets`);
    expect(request.request.body).toEqual({ setNumber: 1, actualLoadKg: 0, actualLoadMode: 'TOTAL' });
    request.flush({}, { status: 400, statusText: 'Bad Request' });
  });

  it('keeps a mode-only choice local and does not post empty or whitespace-only rows', () => {
    activity().selectedMode.setValue('PER_SIDE');
    row().form.controls.notes.setValue('   ');
    editor.applyMode(activity());
    editor.saveSet(activity(), row());
    expect(editor.hasPending()).toBe(false);
    http.expectNone(() => true);
  });

  it('uses minimal PATCH with the historical activity and set IDs', () => {
    loaded();
    row().form.controls.actualReps.setValue(9);
    editor.saveSet(activity(), row());
    const request = http.expectOne(`${url}/activities/200/sets/300`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ actualReps: 9 });
    const persisted = sessionSet({ actualLoadKg: 20, actualLoadMode: 'TOTAL', actualReps: 9, normalizedLoadKg: 20 });
    request.flush(persisted);
    detail.activities[0].sets = [persisted];
    refresh();
    expect(editor.hasPending()).toBe(false);
  });

  it('clears load and mode with null without touching reps or notes', () => {
    loaded();
    row().form.controls.actualLoadKg.setValue(null);
    editor.saveSet(activity(), row());
    const request = http.expectOne(`${url}/activities/200/sets/300`);
    expect(request.request.body).toEqual({ actualLoadKg: null, actualLoadMode: null });
    request.flush(sessionSet());
    detail.activities[0].sets = [sessionSet()];
    detail.activities[0].actualLoadMode = null;
    refresh();
    expect(row().persisted?.actualLoadMode).toBeNull();
    expect(activity().confirmed.actualLoadMode).toBeNull();
  });

  it('requires explicit deletion when clearing the last content and rebuilds only the planned placeholder', () => {
    detail.activities[0].sets = [sessionSet({ id: 999 })];
    editor.reconcile(detail);
    row().form.controls.actualReps.setValue(null);
    editor.saveSet(activity(), row());
    expect(row().error).toContain('Excluir série');
    http.expectNone(() => true);
    editor.deleteSet(activity(), row());
    expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({ title: 'Excluir série' }));
    const deletion = http.expectOne(`${url}/activities/200/sets/999`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null, { status: 204, statusText: 'No Content' });
    detail.activities[0].sets = [];
    refresh();
    expect(row().setNumber).toBe(1);
    expect(row().persisted).toBeNull();
    expect(editor.hasPending()).toBe(false);
  });

  it.each([false, undefined])('does not delete when confirmation returns %s', (accepted) => {
    loaded();
    dialog.open.mockReturnValue(of(accepted));
    editor.deleteSet(activity(), row());
    expect(row().persisted?.id).toBe(300);
    http.expectNone(() => true);
  });

  it('changes mode only with the collective endpoint, preserving draft values and unloaded sets', () => {
    loaded();
    detail.activities[0].sets.push(sessionSet({ id: 301, setNumber: 2 }));
    editor.reconcile(detail);
    activity().rows[2].form.controls.actualLoadKg.setValue(7.5);
    activity().rows[2].form.controls.notes.setValue('Não salvar agora');
    activity().selectedMode.setValue('PER_SIDE');
    editor.saveSet(activity(), activity().rows[2]);
    http.expectNone(() => true);
    editor.applyMode(activity());
    expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('sem conversão') }));
    const request = http.expectOne(`${url}/activities/200/load-mode`);
    expect(request.request.body).toEqual({ actualLoadMode: 'PER_SIDE' });
    const updated = structuredClone(detail.activities[0]);
    updated.actualLoadMode = 'PER_SIDE';
    updated.sets[0] = { ...updated.sets[0], actualLoadMode: 'PER_SIDE', normalizedLoadKg: 40 };
    request.flush(updated);
    detail.activities[0] = updated;
    refresh();
    expect(activity().confirmed.actualLoadMode).toBe('PER_SIDE');
    expect(activity().rows[0].persisted?.actualLoadKg).toBe(20);
    expect(activity().rows[1].persisted?.actualLoadMode).toBeNull();
    expect(activity().rows[2].form.getRawValue()).toEqual({ actualReps: null, actualLoadKg: 7.5, notes: 'Não salvar agora' });
    expect(activity().rows[2].persisted).toBeNull();
    expect(editor.hasPending()).toBe(true);
    http.expectNone((req) => req.method === 'POST' || req.method === 'PATCH');
  });

  it('preserves the confirmed mode after a failed collective change', () => {
    loaded();
    activity().selectedMode.setValue('PER_SIDE');
    editor.applyMode(activity());
    http.expectOne(`${url}/activities/200/load-mode`).flush({ message: 'Inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(activity().confirmed.actualLoadMode).toBe('TOTAL');
    expect(activity().selectedMode.value).toBe('PER_SIDE');
    expect(editor.modePending(activity())).toBe(true);
  });

  it.each(['duration', 'distance', 'notes'] as const)('saves independent activity %s', (kind) => {
    const expected = kind === 'duration' ? { actualDurationMinutes: 12 } : kind === 'distance' ? { actualDistanceKm: 0 } : { notes: 'Relato da atividade' };
    if (kind === 'duration') activity().form.controls.actualDurationMinutes.setValue(12);
    if (kind === 'distance') activity().form.controls.actualDistanceKm.setValue(0);
    if (kind === 'notes') activity().form.controls.notes.setValue('Relato da atividade');
    editor.saveActivity(activity());
    const request = http.expectOne(`${url}/activities/200/execution`);
    expect(request.request.body).toEqual(expected);
    detail.activities[0] = { ...detail.activities[0], ...expected };
    request.flush(detail.activities[0]);
    refresh();
    expect(editor.hasPending()).toBe(false);
  });

  it('saves and clears the general report without overwriting drafts in other units', () => {
    row().form.controls.actualReps.setValue(7);
    activity().form.controls.notes.setValue('Rascunho da atividade');
    editor.notes.setValue('Relato geral');
    editor.saveNotes();
    const request = http.expectOne(`${url}/notes`);
    expect(request.request.body).toEqual({ notes: 'Relato geral' });
    detail.notes = 'Relato geral';
    request.flush(detail);
    refresh();
    expect(row().form.controls.actualReps.value).toBe(7);
    expect(activity().form.controls.notes.value).toBe('Rascunho da atividade');
    editor.notes.setValue('');
    editor.saveNotes();
    const clear = http.expectOne(`${url}/notes`);
    expect(clear.request.body).toEqual({ notes: null });
    detail.notes = null;
    clear.flush(detail);
    refresh();
  });

  it('allows typing in another activity while preventing all overlapping writes and duplicate clicks', () => {
    detail.activities.push({ ...structuredClone(detail.activities[0]), id: 201 });
    editor.reconcile(detail);
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    editor.saveSet(activity(), row());
    const other = editor.activities()[1];
    other.form.controls.notes.setValue('Digitação preservada');
    editor.saveActivity(other);
    editor.notes.setValue('Relato em edição');
    editor.saveNotes();
    expect(other.form.enabled).toBe(true);
    const request = http.expectOne(`${url}/activities/200/sets`);
    http.expectNone(`${url}/activities/201/execution`);
    http.expectNone(`${url}/notes`);
    request.flush(sessionSet());
    detail.activities[0].sets = [sessionSet()];
    refresh();
    expect(other.form.controls.notes.value).toBe('Digitação preservada');
    expect(editor.notes.value).toBe('Relato em edição');
  });

  it.each([400, 403, 404, 409, 500, 0])('preserves drafts on HTTP %s and reconciles when needed', (status) => {
    row().form.controls.notes.setValue('Preservar');
    editor.saveSet(activity(), row());
    const request = http.expectOne(`${url}/activities/200/sets`);
    if (status === 0) request.error(new ProgressEvent('error'));
    else request.flush({ message: 'Falha' }, { status, statusText: 'Error' });
    if ([0, 404, 409, 500].includes(status)) refresh();
    expect(row().form.controls.notes.value).toBe('Preservar');
    expect(editor.hasPending()).toBe(true);
    http.expectNone((req) => req.method === 'POST');
  });

  it('maps server field validation to the control without clearing the input', () => {
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets`).flush({ message: 'Inválido', fields: [{ field: 'actualReps', message: 'Rever repetições' }] }, { status: 400, statusText: 'Bad Request' });
    expect(row().form.controls.actualReps.getError('server')).toBe('Rever repetições');
    expect(row().form.controls.actualReps.value).toBe(8);
  });

  it('recovers a POST persisted without a response using the real historical ID and never repeats POST', () => {
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets`).error(new ProgressEvent('error'));
    expect(row().uncertain?.reviewed).toBe(false);
    detail.activities[0].sets = [sessionSet({ id: 777 })];
    refresh();
    expect(row().persisted?.id).toBe(777);
    expect(row().uncertain).toBeNull();
    expect(editor.hasPending()).toBe(false);
    http.expectNone((req) => req.method === 'POST');
  });

  it('does not treat an immediately empty read as proof of failure and offers explicit recovery', () => {
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets`).error(new ProgressEvent('error'));
    refresh();
    expect(row().persisted).toBeNull();
    expect(row().uncertain?.reviewed).toBe(true);
    expect(row().message).toContain('A gravação original pode estar em andamento.');
    expect(editor.hasUncertainCreation()).toBe(true);
    expect(editor.canWrite()).toBe(true);
    http.expectNone((req) => req.method === 'POST');
    editor.recover();
    detail.activities[0].sets = [sessionSet({ id: 778 })];
    refresh();
    expect(row().persisted?.id).toBe(778);
    expect(row().uncertain).toBeNull();
    expect(editor.hasUncertainCreation()).toBe(false);
  });

  it('requires review when uncertain creation finds a different partial record at the same number', () => {
    row().form.controls.notes.setValue('Relato que enviei');
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets`).error(new ProgressEvent('error'));
    detail.activities[0].sets = [sessionSet({ id: 781, actualReps: 10 })];
    refresh();
    expect(row().persisted?.id).toBe(781);
    expect(row().form.controls.notes.value).toBe('Relato que enviei');
    expect(row().conflict).toBe(true);
    editor.saveSet(activity(), row());
    http.expectNone((request) => request.method === 'POST' || request.method === 'PATCH');
  });

  it('requires a fresh explicit confirmation to retry an uncertain creation with the same set number', () => {
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets`).error(new ProgressEvent('error'));
    refresh();
    dialog.open.mockReturnValueOnce(of(false));
    editor.saveSet(activity(), row());
    http.expectNone((req) => req.method === 'POST');
    editor.saveSet(activity(), row());
    const retry = http.expectOne(`${url}/activities/200/sets`);
    expect(retry.request.body).toEqual({ setNumber: 1, actualReps: 8 });
    retry.flush({ message: 'Já existe' }, { status: 409, statusText: 'Conflict' });
    detail.activities[0].sets = [sessionSet({ id: 779 })];
    refresh();
    expect(row().persisted?.id).toBe(779);
    expect(activity().rows).toHaveLength(3);
  });

  it('keeps a confirmed ID when subsequent reconciliation fails and retries only GET', () => {
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets`).flush(sessionSet({ id: 780 }));
    http.expectOne(url).error(new ProgressEvent('error'));
    expect(row().persisted?.id).toBe(780);
    expect(editor.canWrite()).toBe(false);
    expect(editor.recoveryMessage()).toContain('Consultar registros');
    editor.saveSet(activity(), row());
    http.expectNone((req) => req.method === 'POST');
    editor.recover();
    detail.activities[0].sets = [sessionSet({ id: 780 })];
    refresh();
    expect(editor.canWrite()).toBe(true);
  });

  it('reconciles an uncertain PATCH to the values observed on the server without repeating it', () => {
    loaded();
    row().form.controls.actualReps.setValue(9);
    editor.saveSet(activity(), row());
    http.expectOne(`${url}/activities/200/sets/300`).error(new ProgressEvent('error'));
    detail.activities[0].sets[0].actualReps = 9;
    refresh();
    expect(row().persisted?.actualReps).toBe(9);
    expect(row().error).toBe('');
    expect(row().message).toContain('conferido');
    expect(editor.hasPending()).toBe(false);
    http.expectNone((request) => request.method === 'PATCH');
  });

  it('preserves a local edit and exposes remote same-field conflicts until reviewed', () => {
    loaded();
    const form = row().form;
    form.controls.actualReps.setValue(9);
    detail.activities[0].sets[0].actualReps = 10;
    editor.reconcile(structuredClone(detail));
    expect(row().form).toBe(form);
    expect(row().form.controls.actualReps.value).toBe(9);
    expect(row().baseline.actualReps).toBe(10);
    expect(row().conflict).toBe(true);
    editor.saveSet(activity(), row());
    http.expectNone(() => true);
    editor.acknowledge(row());
    editor.saveSet(activity(), row());
    const patch = http.expectOne(`${url}/activities/200/sets/300`);
    expect(patch.request.body).toEqual({ actualReps: 9 });
    patch.flush({}, { status: 400, statusText: 'Error' });
  });

  it('preserves a removed set draft without posting it as a new set', () => {
    loaded();
    row().form.controls.actualReps.setValue(9);
    detail.activities[0].sets = [];
    detail.activities[0].actualLoadMode = null;
    editor.reconcile(detail);
    expect(row().removed).toBe(true);
    editor.saveSet(activity(), row());
    http.expectNone(() => true);
    editor.discardSet(activity(), row());
    expect(row().persisted).toBeNull();
    expect(editor.hasPending()).toBe(false);
  });

  it('recovers a replaced set at the same number without duplicate rows or silent draft transfer', () => {
    loaded();
    row().form.controls.actualReps.setValue(9);
    detail.activities[0].sets = [sessionSet({ id: 900, actualLoadKg: 20, actualLoadMode: 'TOTAL', actualReps: 10, normalizedLoadKg: 20 })];
    editor.reconcile(detail);
    expect(activity().rows.filter((value) => value.setNumber === 1)).toHaveLength(1);
    expect(row().persisted?.id).toBe(900);
    expect(row().form.controls.actualReps.value).toBe(9);
    expect(row().conflict).toBe(true);
    editor.saveSet(activity(), row());
    http.expectNone(() => true);
  });

  it('requires review when a remote mode change reinterprets unsaved load', () => {
    loaded();
    activity().rows[1].form.controls.actualLoadKg.setValue(12);
    detail.activities[0].actualLoadMode = 'PER_SIDE';
    detail.activities[0].sets[0] = { ...detail.activities[0].sets[0], actualLoadMode: 'PER_SIDE', normalizedLoadKg: 40 };
    editor.reconcile(detail);
    expect(activity().modeConflict).toBe(true);
    expect(activity().selectedMode.value).toBe('PER_SIDE');
    expect(activity().rows[1].form.controls.actualLoadKg.value).toBe(12);
    editor.saveSet(activity(), activity().rows[1]);
    http.expectNone(() => true);
    editor.acknowledgeMode(activity());
    expect(activity().modeConflict).toBe(false);
    expect(activity().rows[1].form.controls.actualLoadKg.value).toBe(12);
  });

  it('does not mark other drafts as conflicting after the first load uses their already selected mode', () => {
    activity().selectedMode.setValue('PER_SIDE');
    row().form.controls.actualLoadKg.setValue(10);
    activity().rows[1].form.controls.actualLoadKg.setValue(12);
    editor.saveSet(activity(), row());
    const persisted = sessionSet({ actualLoadKg: 10, actualLoadMode: 'PER_SIDE', actualReps: null, normalizedLoadKg: 20 });
    http.expectOne(`${url}/activities/200/sets`).flush(persisted);
    detail.activities[0].sets = [persisted];
    detail.activities[0].actualLoadMode = 'PER_SIDE';
    refresh();
    expect(activity().modeConflict).toBe(false);
    expect(activity().rows[1].form.controls.actualLoadKg.value).toBe(12);
    expect(activity().rows[1].persisted).toBeNull();
  });

  it('deletes an additional set without renumbering remaining historical records', () => {
    detail.activities[0].sets = [sessionSet({ id: 302, setNumber: 2 }), sessionSet({ id: 305, setNumber: 5 })];
    editor.reconcile(detail);
    editor.deleteSet(activity(), activity().rows.find((value) => value.setNumber === 5)!);
    http.expectOne(`${url}/activities/200/sets/305`).flush(null, { status: 204, statusText: 'No Content' });
    detail.activities[0].sets = [sessionSet({ id: 302, setNumber: 2 })];
    refresh();
    expect(activity().rows.map((value) => [value.setNumber, value.persisted?.id ?? null]))
      .toEqual([[1, null], [2, 302], [3, null]]);
  });

  it('cancels subscriptions on reset and rejects a previous session response', () => {
    row().form.controls.actualReps.setValue(8);
    editor.saveSet(activity(), row());
    const pending = http.expectOne(`${url}/activities/200/sets`);
    editor.reset();
    editor.reconcile({ ...structuredClone(sessionDetail), id: 101 });
    expect(pending.cancelled).toBe(true);
    editor.reconcile({ ...detail, activities: [{ ...detail.activities[0], sets: [sessionSet()] }] });
    expect(editor.session()?.id).toBe(101);
    expect(editor.session()?.activities[0].sets).toEqual([]);
  });

  it('keeps unsent data editable after expiration without inventing executed sets', () => {
    row().form.controls.notes.setValue('Rascunho preservado');
    editor.reconcile({ ...detail, status: 'CLOSED', closeReason: 'AUTO_EXPIRED' });
    expect(row().form.controls.notes.value).toBe('Rascunho preservado');
    expect(editor.hasPending()).toBe(true);
    expect(editor.canWrite()).toBe(true);
    expect(activity().rows).toHaveLength(1);
    editor.saveSet(activity(), row());
    const request = http.expectOne(`${url}/activities/200/sets`);
    expect(request.request.body).toEqual({ setNumber: 1, notes: 'Rascunho preservado' });
    request.flush({}, { status: 400, statusText: 'Bad Request' });
  });

  describe.each(['MANUAL', 'AUTO_EXPIRED'] as const)('historical corrections after %s closure', (closeReason) => {
    beforeEach(() => {
      editor.reset();
      detail.status = 'CLOSED';
      detail.closeReason = closeReason;
      detail.finishedAt = '2026-10-28T06:00:00Z';
      detail.workoutCycleId = null;
      detail.workoutDayId = null;
      detail.activities[0].workoutActivityId = null;
      detail.activities[0].exerciseId = null;
      editor.reconcile(detail);
    });

    it('starts with no invented sets and retains explicit blank rows during unrelated saves', () => {
      expect(activity().rows).toHaveLength(0);
      expect(editor.canWrite()).toBe(true);
      editor.addSet(activity());
      const draft = row();
      editor.notes.setValue('Correção histórica');
      editor.saveNotes();
      const request = http.expectOne(`${url}/notes`);
      expect(request.request.body).toEqual({ notes: 'Correção histórica' });
      detail.notes = 'Correção histórica';
      request.flush(detail);
      refresh();
      expect(row()).toBe(draft);
      expect(row().persisted).toBeNull();
      expect(row().form.getRawValue()).toEqual({ actualLoadKg: null, actualReps: null, notes: '' });
      editor.saveSet(activity(), row());
      http.expectNone((req) => req.method === 'POST');
      expect(editor.session()?.finishedAt).toBe('2026-10-28T06:00:00Z');
      expect(editor.session()?.closeReason).toBe(closeReason);
    });

    it('creates only an explicitly added partial set, reconciles it and deletes it with confirmation', () => {
      editor.addSet(activity());
      row().form.controls.notes.setValue('Relato posterior');
      editor.saveSet(activity(), row());
      editor.saveSet(activity(), row());
      const request = http.expectOne(`${url}/activities/200/sets`);
      expect(request.request.body).toEqual({ setNumber: 1, notes: 'Relato posterior' });
      const saved = sessionSet({ actualReps: null, notes: 'Relato posterior' });
      request.flush(saved);
      detail.activities[0].sets = [saved];
      refresh();
      expect(activity().rows).toHaveLength(1);
      expect(row().persisted?.actualReps).toBeNull();
      expect(editor.hasPending()).toBe(false);
      editor.deleteSet(activity(), row());
      expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({ title: 'Excluir série' }));
      http.expectOne(`${url}/activities/200/sets/300`).flush(null);
      detail.activities[0].sets = [];
      refresh();
      expect(activity().rows).toHaveLength(0);
      expect(editor.session()?.status).toBe('CLOSED');
    });

    it('updates independent activity fields, preserves set drafts and reconciles a failed save', () => {
      editor.addSet(activity());
      row().form.controls.actualReps.setValue(7);
      activity().form.patchValue({ actualDurationMinutes: 12, actualDistanceKm: 0, notes: 'Correção da atividade' });
      editor.saveActivity(activity());
      const request = http.expectOne(`${url}/activities/200/execution`);
      expect(request.request.body).toEqual({ actualDurationMinutes: 12, actualDistanceKm: 0, notes: 'Correção da atividade' });
      request.error(new ProgressEvent('error'));
      refresh();
      expect(activity().form.getRawValue()).toEqual({ actualDurationMinutes: 12, actualDistanceKm: 0, notes: 'Correção da atividade' });
      expect(row().form.controls.actualReps.value).toBe(7);
      editor.saveActivity(activity());
      detail.activities[0] = { ...detail.activities[0], actualDurationMinutes: 12, actualDistanceKm: 0, notes: 'Correção da atividade' };
      http.expectOne(`${url}/activities/200/execution`).flush(detail.activities[0]);
      refresh();
      expect(editor.activityPending(activity())).toBe(false);
      expect(editor.setPending(row())).toBe(true);
      http.expectNone((req) => req.method === 'POST');
    });

    it('updates reps, load and report using the same PATCH and changes mode without numeric conversion', () => {
      loaded();
      row().form.patchValue({ actualReps: 9, actualLoadKg: 22.5, notes: 'Ajuste histórico' });
      editor.saveSet(activity(), row());
      const request = http.expectOne(`${url}/activities/200/sets/300`);
      expect(request.request.body).toEqual({ actualReps: 9, actualLoadKg: 22.5, notes: 'Ajuste histórico' });
      detail.activities[0].sets = [sessionSet({ actualReps: 9, actualLoadKg: 22.5, actualLoadMode: 'TOTAL', normalizedLoadKg: 22.5, notes: 'Ajuste histórico' })];
      request.flush(detail.activities[0].sets[0]);
      refresh();
      activity().selectedMode.setValue('PER_SIDE');
      editor.applyMode(activity());
      const mode = http.expectOne(`${url}/activities/200/load-mode`);
      expect(mode.request.body).toEqual({ actualLoadMode: 'PER_SIDE' });
      detail.activities[0].actualLoadMode = 'PER_SIDE';
      detail.activities[0].sets[0].actualLoadMode = 'PER_SIDE';
      detail.activities[0].sets[0].normalizedLoadKg = 45;
      mode.flush(detail.activities[0]);
      refresh();
      expect(row().form.controls.actualLoadKg.value).toBe(22.5);
      expect(editor.hasPending()).toBe(false);
      expect(editor.session()?.status).toBe('CLOSED');
    });

    it('keeps an uncertain POST until GET confirms the original ID and never repeats it automatically', () => {
      editor.addSet(activity());
      row().form.controls.actualReps.setValue(8);
      editor.saveSet(activity(), row());
      http.expectOne(`${url}/activities/200/sets`).error(new ProgressEvent('error'));
      http.expectOne(url).error(new ProgressEvent('error'));
      expect(editor.canWrite()).toBe(false);
      expect(row().uncertain?.reviewed).toBe(false);
      editor.saveSet(activity(), row());
      http.expectNone((req) => req.method === 'POST');
      editor.recover();
      refresh();
      expect(row().uncertain?.reviewed).toBe(true);
      expect(editor.hasPending()).toBe(true);
      editor.recover();
      detail.activities[0].sets = [sessionSet({ id: 787 })];
      refresh();
      expect(row().persisted?.id).toBe(787);
      expect(row().uncertain).toBeNull();
      expect(editor.hasPending()).toBe(false);
      http.expectNone((req) => req.method === 'POST');
    });

    it('preserves conflicts and requires review before writing over a remote correction', () => {
      loaded();
      row().form.controls.actualReps.setValue(9);
      detail.activities[0].sets[0].actualReps = 10;
      editor.reconcile(detail);
      expect(row().conflict).toBe(true);
      expect(row().form.controls.actualReps.value).toBe(9);
      editor.saveSet(activity(), row());
      http.expectNone(() => true);
      editor.acknowledge(row());
      editor.saveSet(activity(), row());
      const correction = http.expectOne(`${url}/activities/200/sets/300`);
      expect(correction.request.body).toEqual({ actualReps: 9 });
      detail.activities[0].sets[0].actualReps = 9;
      correction.flush(detail.activities[0].sets[0]);
      refresh();
      expect(editor.hasPending()).toBe(false);
    });

    it('discards explicit rows only after confirmation and does not restore planned placeholders', () => {
      editor.addSet(activity());
      row().form.controls.notes.setValue('Rascunho');
      dialog.open.mockReturnValueOnce(of(false));
      editor.discardSet(activity(), row());
      expect(row().form.controls.notes.value).toBe('Rascunho');
      editor.discardSet(activity(), row());
      expect(activity().rows).toHaveLength(0);
      http.expectNone(() => true);
    });
  });

  it('does not apply confirmations or responses from an old context', () => {
    loaded();
    const confirmation = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmation);
    editor.deleteSet(activity(), row());
    editor.reset();
    editor.reconcile({ ...structuredClone(sessionDetail), id: 101 });
    confirmation.next(true);
    http.expectNone((req) => req.method === 'DELETE');
    editor.reconcile(detail);
    expect(editor.session()?.id).toBe(101);
  });
});
