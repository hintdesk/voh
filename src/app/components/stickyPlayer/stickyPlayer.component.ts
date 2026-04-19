import { CommonModule } from '@angular/common';
import { Component, ElementRef, effect, inject, ViewChild } from '@angular/core';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-sticky-player',
  imports: [CommonModule],
  templateUrl: './stickyPlayer.component.html',
  styleUrl: './stickyPlayer.component.css',
})
export class StickyPlayer {
  readonly playerService = inject(PlayerService);

  private audioPlayer?: HTMLAudioElement;

  @ViewChild('audioRef')
  set audioRef(value: ElementRef<HTMLAudioElement> | undefined) {
    this.audioPlayer = value?.nativeElement;
    this.syncAudioWithTrack();
  }

  constructor() {
    effect(() => {
      this.playerService.currentTrack();
      queueMicrotask(() => this.syncAudioWithTrack());
    });
  }

  closePlayer(): void {
    this.audioPlayer?.pause();
    this.playerService.closePlayer();
  }

  onTimeUpdate(event: Event): void {
    this.playerService.handleAudioTimeUpdate(event.target as HTMLAudioElement);
  }

  private syncAudioWithTrack(): void {
    const track = this.playerService.currentTrack();
    if (!this.audioPlayer) {
      return;
    }

    if (!track) {
      this.audioPlayer.pause();
      this.audioPlayer.removeAttribute('src');
      this.audioPlayer.load();
      return;
    }

    if (this.audioPlayer.src !== track.audioUrl) {
      this.audioPlayer.src = track.audioUrl;
      this.audioPlayer.load();
      void this.audioPlayer.play().catch(() => {
        // User can still start playback manually from the footer controls.
      });
    }
  }
}
