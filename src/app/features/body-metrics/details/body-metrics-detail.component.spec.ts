import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpErrorResponse } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { GetBodyMetricsResponse } from '../body-metrics.models';
import { BodyMetricsService } from '../body-metrics.service';
import { BodyMetricsDetailComponent } from './body-metrics-detail.component';

registerLocaleData(localePt);

describe('BodyMetricsDetailComponent', () => {
  const getById = vi.fn();
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
    openDialog.mockReset();
    navigate.mockReset();
    route.snapshot.paramMap = convertToParamMap({ id: '42' });
    route.snapshot.queryParamMap = convertToParamMap({});
    request = new Subject<GetBodyMetricsResponse>();
    getById.mockReturnValue(request.asObservable());

    await TestBed.configureTestingModule({
      imports: [BodyMetricsDetailComponent],
      providers: [
        { provide: BodyMetricsService, useValue: { getById } },
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
    ['home', '/', 'Voltar para a home'],
    ['history', '/body-metrics', 'Voltar ao histórico'],
    [null, '/body-metrics', 'Voltar ao histórico'],
    ['unknown', '/body-metrics', 'Voltar ao histórico'],
  ])('returns to the origin from the visible button (%s)', (from, destination, label) => {
    route.snapshot.queryParamMap = convertToParamMap(from ? { from } : {});
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain(label);
    button.click();

    expect(navigate).toHaveBeenCalledWith([destination]);
  });

  it('returns home after a latest detail error is dismissed', () => {
    route.snapshot.queryParamMap = convertToParamMap({ from: 'home' });
    const dialogClosed = new Subject<boolean | undefined>();
    openDialog.mockReturnValue(dialogClosed.asObservable());
    fixture.detectChanges();
    request.error(new HttpErrorResponse({ status: 404 }));
    expect(navigate).not.toHaveBeenCalled();
    dialogClosed.next(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/']);
  });

  it('returns home for an invalid latest detail ID', () => {
    route.snapshot.queryParamMap = convertToParamMap({ from: 'home' });
    route.snapshot.paramMap = convertToParamMap({ id: 'invalid' });
    fixture.detectChanges();
    expect(getById).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/']);
  });
});
