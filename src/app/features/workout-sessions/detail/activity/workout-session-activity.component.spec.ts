import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api-base-url.token';
import { DialogService } from '../../../../shared/components/dialog/dialog.service';
import { sessionDetail, sessionSet } from '../../workout-sessions.testing';
import { WorkoutSessionEditorState } from '../workout-session-editor-state.service';
import { WorkoutSessionActivityComponent } from './workout-session-activity.component';

describe('WorkoutSessionActivityComponent', () => {
  let fixture: ComponentFixture<WorkoutSessionActivityComponent>;
  let editor: WorkoutSessionEditorState;
  let http: HttpTestingController;
  const dialog = { open: vi.fn() };
  const url = '/api/users/me/workout-sessions/100';

  beforeEach(async () => {
    dialog.open.mockReset().mockReturnValue(of(true));
    await TestBed.configureTestingModule({ imports: [WorkoutSessionActivityComponent],
      providers: [WorkoutSessionEditorState, provideHttpClient(), provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' }, { provide: DialogService, useValue: dialog }] }).compileComponents();
    editor = TestBed.inject(WorkoutSessionEditorState);
    http = TestBed.inject(HttpTestingController);
    const detail = structuredClone(sessionDetail);
    detail.activities[0].plannedTargetLoadKgSnapshot = null;
    editor.reconcile(detail);
    fixture = TestBed.createComponent(WorkoutSessionActivityComponent);
    fixture.componentRef.setInput('activity', editor.activities()[0]);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function sync(): void {
    fixture.componentRef.setInput('revision', editor.revision());
    fixture.detectChanges();
  }

  function openDetails(selector: string): HTMLDetailsElement {
    const details = fixture.nativeElement.querySelector(selector) as HTMLDetailsElement;
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    sync();
    return details;
  }

  function setForm(index = 0): HTMLFormElement {
    return fixture.nativeElement.querySelectorAll('form.ic-set')[index];
  }

  function openSet(index = 0): void {
    openDetails('.ic-activity__execution');
    openDetails('.ic-activity__series');
    setForm(index).querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    sync();
  }

  function cancelSet(index = 0): void {
    setForm(index).querySelector<HTMLButtonElement>('button[aria-label^="Cancelar edição da série"]')!.click();
    sync();
  }

  function expectSetOpen(open: boolean, index = 0): void {
    expect(setForm(index).querySelector('button[aria-expanded]')!.getAttribute('aria-expanded')).toBe(String(open));
    expect(setForm(index).querySelector<HTMLElement>('[id$="-editor"]')!.hidden).toBe(!open);
  }

  it.each([false, true])('closes an unchanged set without a discard dialog (persisted: %s)', (persisted) => {
    if (persisted) {
      const detail = structuredClone(sessionDetail);
      detail.activities[0].sets = [sessionSet()];
      editor.reconcile(detail);
      sync();
    }
    const row = editor.activities()[0].rows[0];
    const values = row.form.getRawValue();
    expectSetOpen(false);
    openSet();
    expectSetOpen(true);
    cancelSet();
    expectSetOpen(false);
    expect(row.form.getRawValue()).toEqual(values);
    expect(editor.activities()[0].rows).toContain(row);
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it.each([true, false])('only discards and collapses a set draft when confirmed: %s', (accepted) => {
    const confirmation = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmation);
    openSet();
    const row = editor.activities()[0].rows[0];
    row.form.controls.actualReps.setValue(7);
    sync();
    cancelSet();
    expect(dialog.open).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Descartar rascunho da série' }));
    expectSetOpen(true);
    expect(row.form.controls.actualReps.value).toBe(7);
    confirmation.next(accepted);
    sync();
    expectSetOpen(!accepted);
    expect(row.form.controls.actualReps.value).toBe(accepted ? null : 7);
    http.expectNone(() => true);
  });

  it.each([false, true])('removes a local additional set without HTTP, protecting a filled draft: %s', (filled) => {
    openDetails('.ic-activity__execution');
    openDetails('.ic-activity__series');
    fixture.nativeElement.querySelector('#activity-200-add-set').click();
    sync();
    const activity = editor.activities()[0];
    const extra = activity.rows[3];
    expect(extra.setNumber).toBe(4);
    expect(extra.persisted).toBeNull();
    openSet(3);
    const confirmation = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmation);
    if (filled) extra.form.controls.notes.setValue('Preservar até confirmar');
    sync();
    cancelSet(3);
    if (filled) {
      expect(activity.rows).toContain(extra);
      expectSetOpen(true, 3);
      expect(dialog.open).toHaveBeenCalledTimes(1);
      confirmation.next(true);
      sync();
    } else expect(dialog.open).not.toHaveBeenCalled();
    expect(activity.rows.map((row) => row.setNumber)).toEqual([1, 2, 3]);
    expect(editor.session()?.activities[0].sets).toEqual([]);
    http.expectNone(() => true);
  });

  it.each([true, false])('keeps the inline draft until a successful save response: %s', (success) => {
    openSet();
    const row = editor.activities()[0].rows[0];
    const reps = setForm().querySelector<HTMLInputElement>('input[id$="-reps"]')!;
    reps.value = '7';
    reps.dispatchEvent(new Event('input'));
    sync();
    setForm().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    const request = http.expectOne(`${url}/activities/200/sets`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ setNumber: 1, actualReps: 7 });
    sync();
    expectSetOpen(true);
    expect(row.form.controls.actualReps.value).toBe(7);
    expect(setForm().querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    if (success) {
      const saved = sessionSet({ actualReps: 7 });
      request.flush(saved);
      const detail = structuredClone(sessionDetail);
      detail.activities[0].sets = [saved];
      http.expectOne(url).flush(detail);
      sync();
      expectSetOpen(false);
      expect(row.persisted?.id).toBe(saved.id);
      expect(setForm().querySelector('.ic-set__values')!.textContent).toContain('7 rep.');
      expect((fixture.nativeElement.querySelector('.ic-activity__execution') as HTMLDetailsElement).open).toBe(true);
      expect((fixture.nativeElement.querySelector('.ic-activity__series') as HTMLDetailsElement).open).toBe(true);
    } else {
      request.flush({ message: 'Falha ao salvar' }, { status: 400, statusText: 'Bad Request' });
      sync();
      expectSetOpen(true);
      expect(row.form.controls.actualReps.value).toBe(7);
      expect(row.persisted).toBeNull();
      expect(setForm().querySelector('[role="alert"]')!.textContent).toContain('Falha ao salvar');
    }
    http.expectNone(() => true);
  });

  it('collapses unchanged activity fields without a discard dialog', () => {
    openDetails('.ic-activity__execution');
    const duration = openDetails('form.ic-activity__form fieldset > details');
    const notes = openDetails('form.ic-activity__form fieldset > details:nth-of-type(2)');
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Cancelar edição da atividade"]'
      ) as HTMLButtonElement
    ).click();

    sync();
    expect(duration.open).toBe(false);
    expect(notes.open).toBe(false);
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it.each([true, false])('collapses activity fields only after discard confirmation: %s', (accepted) => {
    const component = fixture.componentInstance;
    const detail = structuredClone(sessionDetail);
    detail.activities.push({ ...structuredClone(detail.activities[0]), id: 201 });
    editor.reconcile(detail);
    const activity = editor.activities()[0];
    const other = editor.activities()[1];
    other.form.controls.notes.setValue('Relato de outra atividade');
    openDetails('.ic-activity__execution');
    const duration = openDetails('form.ic-activity__form fieldset > details');
    const notes = openDetails('form.ic-activity__form fieldset > details:nth-of-type(2)');
    openDetails('.ic-activity__series');
    activity.form.patchValue({ actualDurationMinutes: 12, notes: 'Relato pendente' });
    activity.rows[0].form.controls.actualReps.setValue(7);
    editor.notes.setValue('Relato geral independente');
    sync();
    const confirmation = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmation);
    component.cancelActivity();
    sync();
    expect(duration.open).toBe(true);
    expect(notes.open).toBe(true);
    expect(activity.form.controls.actualDurationMinutes.value).toBe(12);
    confirmation.next(accepted);
    sync();
    duration.dispatchEvent(new Event('toggle'));
    notes.dispatchEvent(new Event('toggle'));
    sync();
    expect(duration.open).toBe(!accepted);
    expect(notes.open).toBe(!accepted);
    expect(component.durationOpen).toBe(!accepted);
    expect(component.notesOpen).toBe(!accepted);
    expect(activity.form.controls.actualDurationMinutes.value).toBe(accepted ? null : 12);
    expect(activity.form.controls.notes.value).toBe(accepted ? '' : 'Relato pendente');
    expect(activity.rows[0].form.controls.actualReps.value).toBe(7);
    expect(editor.notes.value).toBe('Relato geral independente');
    expect(other.form.controls.notes.value).toBe('Relato de outra atividade');
    expect(component.setsOpen).toBe(true);
    http.expectNone(() => true);
  });

  it.each([null, 'Relato registrado'])('orders the execution sections in one group while keeping their forms separate (notes: %s)', (notes) => {
    const detail = structuredClone(sessionDetail);
    detail.activities[0].notes = notes;
    editor.reconcile(detail);
    sync();
    const group = fixture.nativeElement.querySelector('.ic-activity__execution-group') as HTMLElement;
    const summaries = Array.from(group.querySelectorAll(
      ':scope > details > summary, :scope > form > fieldset > details > summary',
    )).map((summary) => summary.textContent!.trim());
    expect(summaries).toEqual([
      'Séries e cargas',
      'Duração e distância',
      notes ? 'Relato da execução · relato registrado' : 'Relato da execução (opcional)',
    ]);
    const series = group.querySelector(':scope > .ic-activity__series')!;
    const form = group.querySelector(':scope > form.ic-activity__form')!;
    expect(group.firstElementChild).toBe(series);
    expect(series.nextElementSibling).toBe(form);
    expect(series.closest('form')).toBeNull();
    expect(form.querySelectorAll('details')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('form form')).toHaveLength(0);
    http.expectNone(() => true);
  });

  it('renders exactly one selector for all rows even without prescribed load', () => {
    expect(fixture.nativeElement.querySelectorAll('mat-select')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('app-workout-session-set-form')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('mat-select').getAttribute('aria-disabled')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('dois lados equivalentes');
    expect(fixture.nativeElement.querySelectorAll('form form')).toHaveLength(0);
    http.expectNone(() => true);
  });

  it('exposes optional duration, distance and independent report without planned defaults', () => {
    openDetails('.ic-activity__execution');
    openDetails('form.ic-activity__form fieldset > details');
    openDetails('form.ic-activity__form fieldset > details:nth-of-type(2)');
    const duration = fixture.nativeElement.querySelector('#activity-200-duration') as HTMLInputElement;
    const distance = fixture.nativeElement.querySelector('#activity-200-distance') as HTMLInputElement;
    expect(duration.value).toBe('');
    expect(distance.value).toBe('');
    expect(duration.required).toBe(false);
    expect(distance.required).toBe(false);
    expect(fixture.nativeElement.querySelector('#activity-200-notes')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.ic-activity__reference h4').textContent).toBe('Prescrição planejada — referência');
    expect((fixture.nativeElement.querySelector('#activity-200-notes') as HTMLTextAreaElement).value).toBe('');
    expect((fixture.nativeElement.querySelector('#activity-200-notes') as HTMLTextAreaElement).required).toBe(false);
  });

  it('shows the complete prescription in a static section without expanding execution', () => {
    const detail = structuredClone(sessionDetail);
    const notes = 'Orientação histórica completa.\nManter a postura em todas as séries e respeitar o descanso prescrito.';
    detail.activities[0].plannedNotesSnapshot = notes;
    editor.reconcile(detail);
    sync();
    const reference = fixture.nativeElement.querySelector('.ic-activity__reference') as HTMLElement;
    expect(reference.tagName).toBe('SECTION');
    expect(reference.closest('details, [hidden]')).toBeNull();
    expect(reference.querySelector('details, summary, button, [hidden]')).toBeNull();
    expect(reference.querySelector('h4')!.textContent).toBe('Prescrição planejada — referência');
    expect(reference.getAttribute('aria-labelledby')).toBe(reference.querySelector('h4')!.id);
    const fields = Array.from(reference.querySelectorAll('dl > div')).map((field) => [
      field.querySelector('dt')!.textContent!.trim(), field.querySelector('dd')!.textContent!.trim(),
    ]);
    expect(fields).toEqual([
      ['Séries', '3'],
      ['Repetições mínimas', '8'],
      ['Repetições máximas', '12'],
      ['Carga alvo', '22.5 kg'],
      ['Orientação de carga', 'Carga moderada'],
      ['Duração', '15 min'],
      ['Distância', '2.5 km'],
      ['Intensidade', 'Moderada'],
      ['Descanso', '60 s'],
    ]);
    expect(reference.querySelector('p')!.textContent).toBe(notes);
    expect(fixture.nativeElement.querySelector('.ic-activity__planned-summary')).toBeNull();
    expect((fixture.nativeElement.querySelector('.ic-activity__execution') as HTMLDetailsElement).open).toBe(false);
    http.expectNone(() => true);
  });

  it('preserves each row while adding another visual position without requests', () => {
    const first = editor.activities()[0].rows[0].form;
    editor.addSet(editor.activities()[0]);
    fixture.componentRef.setInput('revision', editor.revision());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-workout-session-set-form')).toHaveLength(4);
    expect(editor.activities()[0].rows[0].form).toBe(first);
    http.expectNone(() => true);
  });

  it('shows only saved sets when opening a closed session with no drafts', () => {
    editor.reset();
    const detail = structuredClone(sessionDetail);
    detail.status = 'CLOSED';
    detail.closeReason = 'MANUAL';
    detail.activities[0].sets = [sessionSet({ notes: 'Registro histórico' })];
    editor.reconcile(detail);
    fixture.componentRef.setInput('activity', editor.activities()[0]);
    fixture.componentRef.setInput('revision', editor.revision());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-workout-session-set-form')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('textarea[id$="-notes"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Adicionar série');
    expect(fixture.nativeElement.querySelector('input[id$="-reps"]').readOnly).toBe(false);
    expect(fixture.nativeElement.querySelector('input[id$="-load"]').value).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('Registrar série');
    http.expectNone(() => true);
  });
});
