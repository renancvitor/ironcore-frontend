import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api-base-url.token';
import { DialogService } from '../../../../shared/components/dialog/dialog.service';
import { sessionDetail, sessionSet } from '../../workout-sessions.testing';
import { WorkoutSessionEditorState } from '../workout-session-editor-state.service';
import { WorkoutSessionActivityComponent } from './workout-session-activity.component';

describe('WorkoutSessionActivityComponent', () => {
  let fixture: ComponentFixture<WorkoutSessionActivityComponent>;
  let editor: WorkoutSessionEditorState;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkoutSessionActivityComponent],
      providers: [WorkoutSessionEditorState, provideHttpClient(), provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' }, { provide: DialogService, useValue: { open: () => of(true) } }] }).compileComponents();
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

  it('renders exactly one selector for all rows even without prescribed load', () => {
    expect(fixture.nativeElement.querySelectorAll('mat-select')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('app-workout-session-set-form')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('mat-select').getAttribute('aria-disabled')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('dois lados equivalentes');
    expect(fixture.nativeElement.querySelectorAll('form form')).toHaveLength(0);
    http.expectNone(() => true);
  });

  it('exposes optional duration, distance and independent report without planned defaults', () => {
    const duration = fixture.nativeElement.querySelector('#activity-200-duration') as HTMLInputElement;
    const distance = fixture.nativeElement.querySelector('#activity-200-distance') as HTMLInputElement;
    expect(duration.value).toBe('');
    expect(distance.value).toBe('');
    expect(duration.required).toBe(false);
    expect(distance.required).toBe(false);
    expect(fixture.nativeElement.querySelector('#activity-200-notes')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Prescrição planejada');
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
