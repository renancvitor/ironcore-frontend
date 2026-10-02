import { PaginatorIntlPtBr } from './paginator-intl-pt-br';

describe('PaginatorIntlPtBr', () => {
  const intl = new PaginatorIntlPtBr();

  it('provides Portuguese labels for the page controls', () => {
    expect(intl.itemsPerPageLabel).toBe('Itens por página');
    expect(intl.firstPageLabel).toBe('Primeira página');
    expect(intl.previousPageLabel).toBe('Página anterior');
    expect(intl.nextPageLabel).toBe('Próxima página');
    expect(intl.lastPageLabel).toBe('Última página');
  });

  it('describes populated, final, and empty page ranges', () => {
    expect(intl.getRangeLabel(0, 20, 42)).toBe('1 – 20 de 42');
    expect(intl.getRangeLabel(2, 20, 42)).toBe('41 – 42 de 42');
    expect(intl.getRangeLabel(0, 20, 0)).toBe('0 de 0');
  });
});
