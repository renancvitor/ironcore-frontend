import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api-base-url.token';
import { DialogService } from '../../../../shared/components/dialog/dialog.service';
import { BodyMetricsLatestCardComponent } from './body-metrics-latest-card.component';

registerLocaleData(localePt);

describe('BodyMetricsLatestCardComponent integration', () => {
  let fixture: ComponentFixture<BodyMetricsLatestCardComponent>;
  let http: HttpTestingController;
  const open = vi.fn();
  const endpoint = '/api/users/me/body-metrics/latest';
  const response = {
    id: 42,
    personId: 7,
    measuredAt: '2026-09-30T08:30:00',
    weightKg: 82.4,
    heightCm: 178.5,
    bmi: 25.8,
    bodyFatPercentage: 18.3,
    fatMassKg: 15.1,
    leanMassKg: 67.3,
    circumferences: null,
    notes: 'Observação privada da avaliação',
    updatedAt: null,
  };

  beforeEach(async () => {
    open.mockReset();
    await TestBed.configureTestingModule({
      imports: [BodyMetricsLatestCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DialogService, useValue: { open } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BodyMetricsLatestCardComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('makes one GET, shows one loading indicator, then renders only the summary and detail link', () => {
    expect(fixture.nativeElement.querySelectorAll('app-loading')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('GET');
    request.flush(response);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    for (const value of ['82,4 kg', '18,3 %', '15,1 kg', '67,3 kg', '30/09/2026 08:30']) {
      expect(text).toContain(value);
    }
    for (const value of [
      'Altura',
      'IMC',
      'Circunferências',
      'Observações',
      response.notes,
      'Voltar para a home',
    ]) {
      expect(text).not.toContain(value);
    }
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('dt') as NodeListOf<HTMLElement>,
      (label) => label.textContent?.trim(),
    );
    expect(labels).toEqual(['Peso', 'Percentual de gordura', 'Massa gorda', 'Massa magra']);
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toContain('Ver detalhes');
    expect(link.getAttribute('href')).toBe('/body-metrics/latest');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    link.click();
    expect(navigate).toHaveBeenCalledOnce();
    http.expectNone(endpoint);
  });

  it.each([
    { bodyFatPercentage: null, leanMassKg: 0, absent: 'Percentual de gordura', value: '0,0 kg' },
    { bodyFatPercentage: 0, leanMassKg: null, absent: 'Massa magra', value: '0,0 %' },
    { fatMassKg: null, leanMassKg: 0, absent: 'Massa gorda', value: '0,0 kg' },
    { fatMassKg: 0, leanMassKg: null, absent: 'Massa magra', value: '0,0 kg' },
  ])(
    'omits null indicators while preserving zero values ($absent)',
    ({ absent, value, ...metrics }) => {
      http.expectOne(endpoint).flush({ ...response, ...metrics });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain(absent);
      expect(fixture.nativeElement.textContent).toContain(value);
    },
  );

  it('uses the feature empty state for a 404 without a dialog or action', () => {
    http.expectOne(endpoint).flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma avaliação corporal cadastrada.');
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it.each([null, { message: 'Falha no servidor.' }])(
    'uses the feature error handling (%s)',
    (error) => {
      const closed = new Subject<boolean | undefined>();
      open.mockReturnValue(closed.asObservable());
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      http.expectOne(endpoint).flush(error, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(open).toHaveBeenCalledExactlyOnceWith({
        title: 'Não foi possível carregar os dados corporais',
        message: error?.message ?? 'Não foi possível carregar os dados corporais.',
        primaryAction: 'Ok',
      });
      expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
      expect(fixture.nativeElement.querySelector('a')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain(
        'Nenhuma avaliação corporal cadastrada.',
      );
      expect(navigate).not.toHaveBeenCalled();
      closed.next(true);
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/']);
    },
  );
});
