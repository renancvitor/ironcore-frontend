import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EnergyBackgroundComponent } from './shared/components/energy-background/energy-background.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnergyBackgroundComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
