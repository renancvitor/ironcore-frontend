import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class PaginatorIntlPtBr extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página';

  override firstPageLabel = 'Primeira página';
  override previousPageLabel = 'Página anterior';
  override nextPageLabel = 'Próxima página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }

    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);

    return `${startIndex + 1} – ${endIndex} de ${length}`;
  };
}
