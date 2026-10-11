import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpErrorResponse } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { GetBodyMetricsResponse } from '../body-metrics.models';
import { BodyMetricsService } from '../body-metrics.service';
import { BodyMetricsDetailComponent } from './body-metrics-detail.component';

registerLocaleData(localePt);

describe('BodyMetricsDetailComponent', () => {
  const getById = vi.fn();
  const update = vi.fn();
  const success = vi.fn();
  const openDialog = vi.fn();
  const navigate = vi.fn();
  const route = {
    snapshot: { paramMap: convertToParamMap({ id: '42' }), queryParamMap: convertToParamMap({}) },
  };

  let fixture: ComponentFixture<BodyMetricsDetailComponent>;
  let request: Subject<GetBodyMetricsResponse>;

  const response: GetBodyMetricsResponse = {
    id: 42,
    personId: 7,
    measuredAt: '2026-09-30T08:30:00',
    weightKg: 82.4,
    heightCm: 178.5,
    circumferences: {
      neckCm: 38.1,
      chestCm: 102.2,
      shoulderCm: 115.3,
      armCm: 35.4,
      forearmCm: 29.5,
      waistCm: 84.6,
      hipCm: 98.7,
      thighCm: 57.8,
      calfCm: 37.9,
    },
    bmi: 25.8,
    bodyFatPercentage: 18.3,
    fatMassKg: 15.1,
    leanMassKg: 67.3,
    notes: 'Após treino',
    updatedAt: '2026-10-01T10:15:00',
  };

  beforeEach(async () => {
    getById.mockReset();
    update.mockReset();
    success.mockReset();
    openDialog.mockReset();
    navigate.mockReset();
    route.snapshot.paramMap = convertToParamMap({ id: '42' });
    route.snapshot.queryParamMap = convertToParamMap({});
    request = new Subject<GetBodyMetricsResponse>();
    getById.mockReturnValue(request.asObservable());

    await TestBed.configureTestingModule({
      imports: [BodyMetricsDetailComponent],
      providers: [
        { provide: BodyMetricsService, useValue: { getById, update } },
        { provide: ToastService, useValue: { success } },
        { provide: DialogService, useValue: { open: openDialog } },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigate } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BodyMetricsDetailComponent);
  });

  it('queries the route ID and shows loading until the response arrives', () => {
    fixture.detectChanges();
    expect(getById).toHaveBeenCalledExactlyOnceWith(42);
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ic-body-metrics-detail__grid')).toBeNull();

    request.next(response);
    request.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ic-body-metrics-detail__grid')).toBeTruthy();
  });

  it('renders all measurements, calculated indicators, notes and dates with units', () => {
    fixture.detectChanges();
    request.next(response);
    request.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    for (const value of [
      '82,4 kg',
      '178,5 cm',
      '25,8',
      '18,3 %',
      '15,1 kg',
      '67,3 kg',
      '38,1 cm',
      '102,2 cm',
      '115,3 cm',
      '35,4 cm',
      '29,5 cm',
      '84,6 cm',
      '98,7 cm',
      '57,8 cm',
      '37,9 cm',
    ]) {
      expect(text).toContain(value);
    }
    expect(text).toContain('30/09/2026 08:30');
    expect(text).toContain('01/10/2026 10:15');
    expect(text).toContain('Após treino');
  });

  function openEditor(): void {
    fixture.detectChanges();
    request.next(response);
    request.complete();
    fixture.detectChanges();
    const edit = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Editar avaliação'))!;
    edit.click();
    fixture.detectChanges();
  }

  function fill(name: string, value: string): void {
    const input = fixture.nativeElement.querySelector(`#${name}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  it('prefills shared controls and restores saved values after canceling an edit', () => {
    openEditor();
    const values = {
      weightKg: response.weightKg,
      heightCm: response.heightCm,
      ...response.circumferences,
    };
    for (const [name, value] of Object.entries(values)) {
      expect(fixture.nativeElement.querySelector(`#${name}`).value).toBe(String(value));
    }
    expect(fixture.nativeElement.querySelector('#notes').value).toBe(response.notes);
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(11);
    fill('weightKg', '90');
    const cancel = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === 'Cancelar')!;
    cancel.click();
    fixture.detectChanges();
    expect(update).not.toHaveBeenCalled();
    expect(fixture.componentInstance.metric()?.weightKg).toBe(response.weightKg);
    fixture.componentInstance.startEdit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#weightKg').value).toBe('82.4');
  });

  it('sends shared field changes and displays the recalculated server response', () => {
    const pending = new Subject<GetBodyMetricsResponse>();
    update.mockReturnValue(pending.asObservable());
    openEditor();
    fill('weightKg', '80');
    for (const name of Object.keys(response.circumferences!)) fill(name, '');
    fill('notes', '');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();

    expect(update).toHaveBeenCalledExactlyOnceWith(42, {
      weightKg: 80,
      heightCm: 178.5,
      circumferences: null,
      notes: null,
    });
    const inputs = fixture.nativeElement.querySelectorAll(
      'input, textarea',
    ) as NodeListOf<HTMLInputElement>;
    expect(Array.from(inputs).every((input) => input.disabled)).toBe(true);
    const saved = {
      ...response,
      weightKg: 80,
      bmi: 25.1,
      circumferences: null,
      notes: null,
      bodyFatPercentage: null,
      fatMassKg: null,
      leanMassKg: null,
    };
    pending.next(saved);
    pending.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.metric()).toEqual(saved);
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('25,1');
    expect(success).toHaveBeenCalledOnce();
  });

  it('reenables shared controls and preserves edits when saving fails', () => {
    const pending = new Subject<GetBodyMetricsResponse>();
    update.mockReturnValue(pending.asObservable());
    openEditor();
    fill('notes', 'Manter observação');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();
    pending.error(new HttpErrorResponse({ status: 500, error: { message: 'Falha ao salvar.' } }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#notes').value).toBe('Manter observação');
    expect(fixture.nativeElement.querySelector('#notes').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('#weightKg').disabled).toBe(false);
    expect(fixture.componentInstance.editing()).toBe(true);
    expect(openDialog).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Falha ao salvar.' }),
    );
    expect(success).not.toHaveBeenCalled();
  });

  it('handles absent optional indicators, circumferences, notes and update date', () => {
    fixture.detectChanges();
    request.next({
      ...response,
      bodyFatPercentage: null,
      fatMassKg: null,
      leanMassKg: null,
      circumferences: null,
      notes: null,
      updatedAt: null,
    });
    request.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Nenhuma circunferência foi registrada nesta avaliação.');
    expect(text).toContain('Nenhuma observação registrada.');
    expect(text).not.toContain('Última atualização em');
    const values = fixture.nativeElement.querySelectorAll('.ic-body-metrics-detail__value');
    expect(values).toHaveLength(6);
    expect(values[3].textContent).toContain('—');
  });

  it.each(['abc', '0', '-2', '1.5'])('rejects an invalid route ID (%s)', (id) => {
    route.snapshot.paramMap = convertToParamMap({ id });
    fixture.detectChanges();

    expect(getById).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/body-metrics']);
  });

  it('shows a missing evaluation error and returns to history after the dialog closes', () => {
    fixture.detectChanges();
    const dialogClosed = new Subject<boolean | undefined>();
    openDialog.mockReturnValue(dialogClosed.asObservable());

    request.error(
      new HttpErrorResponse({ status: 404, error: { message: 'Avaliação inexistente.' } }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível carregar os dados corporais',
      message: 'Avaliação inexistente.',
      primaryAction: 'Ok',
    });
    expect(navigate).not.toHaveBeenCalled();

    dialogClosed.next(true);
    expect(navigate).toHaveBeenCalledWith(['/body-metrics']);
  });

  it('uses a fallback message when the request fails without a backend message', () => {
    fixture.detectChanges();
    openDialog.mockReturnValue(new Subject<boolean | undefined>().asObservable());

    request.error(new HttpErrorResponse({ status: 500 }));

    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível carregar os dados corporais',
      message: 'Não foi possível carregar os dados corporais.',
      primaryAction: 'Ok',
    });
  });

  it.each([
    ['home', '/body-metrics', 'Voltar ao histórico'],
    ['history', '/body-metrics', 'Voltar ao histórico'],
    [null, '/body-metrics', 'Voltar ao histórico'],
    ['unknown', '/body-metrics', 'Voltar ao histórico'],
  ])(
    'always returns to history, ignoring legacy origin parameters (%s)',
    (from, destination, label) => {
      route.snapshot.queryParamMap = convertToParamMap(from ? { from } : {});
      fixture.detectChanges();
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes(label))!;
      expect(button.textContent).toContain(label);
      button.click();

      expect(navigate).toHaveBeenCalledWith([destination]);
    },
  );

  it('returns to history after an error even with a legacy home origin', () => {
    route.snapshot.queryParamMap = convertToParamMap({ from: 'home' });
    const dialogClosed = new Subject<boolean | undefined>();
    openDialog.mockReturnValue(dialogClosed.asObservable());
    fixture.detectChanges();
    request.error(new HttpErrorResponse({ status: 404 }));
    expect(navigate).not.toHaveBeenCalled();
    dialogClosed.next(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics']);
  });

  it('returns to history for an invalid ID even with a legacy home origin', () => {
    route.snapshot.queryParamMap = convertToParamMap({ from: 'home' });
    route.snapshot.paramMap = convertToParamMap({ id: 'invalid' });
    fixture.detectChanges();
    expect(getById).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics']);
  });
});
