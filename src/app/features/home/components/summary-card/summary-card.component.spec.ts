import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SummaryCardComponent } from './summary-card.component';

@Component({
  imports: [SummaryCardComponent],
  template: `
    <app-summary-card title="Resumo">
      <p>Conteúdo projetado</p>
      <ng-container summaryCardAction>
        @if (showAction()) {
          <a href="/details">Detalhes</a>
        }
      </ng-container>
    </app-summary-card>
  `,
})
class HostComponent {
  readonly showAction = signal(false);
}

describe('SummaryCardComponent', () => {
  it('projects content and an optional action into separate areas', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toBe('Resumo');
    expect(element.querySelector('.ic-summary-card__content')?.textContent).toContain(
      'Conteúdo projetado',
    );
    expect(element.querySelector('footer')?.matches(':empty')).toBe(true);

    fixture.componentInstance.showAction.set(true);
    fixture.detectChanges();
    expect(element.querySelector('footer a')?.textContent).toBe('Detalhes');
    expect(element.querySelector('.ic-summary-card__content a')).toBeNull();
  });
});
