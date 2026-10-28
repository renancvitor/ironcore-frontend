import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatExpansionModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly router = inject(Router);

  get sessionDetailActive(): boolean {
    return /^\/workout-sessions\/\d+(?:[?#]|$)/.test(this.router.url) && !this.historyDetailActive && !this.progressDetailActive;
  }

  get historyDetailActive(): boolean {
    return /^\/workout-sessions\/\d+(?:[?#]|$)/.test(this.router.url) &&
      this.router.parseUrl(this.router.url).queryParams['from'] === 'history';
  }

  get progressDetailActive(): boolean {
    return /^\/workout-sessions\/\d+(?:[?#]|$)/.test(this.router.url) &&
      this.router.parseUrl(this.router.url).queryParams['from'] === 'progress';
  }
}
