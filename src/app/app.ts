import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { StickyPlayer } from './components/stickyPlayer/stickyPlayer.component';
import { PlayerService } from './services/player.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, StickyPlayer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly playerService = inject(PlayerService);
}
