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

  private readonly pipHeight = 99;
  private readonly pipWidth = Math.round((this.pipHeight / 9) * 16);
  // Double resolution for sharper canvas rendering (downscaled by browser)
  private readonly canvasHeight = this.pipHeight * 3;
  private readonly canvasWidth = this.pipWidth * 3;

  private audioPlayer?: HTMLAudioElement;
  private pipVideoPlayer?: HTMLVideoElement;

  @ViewChild('audioRef')
  set audioRef(value: ElementRef<HTMLAudioElement> | undefined) {
    this.audioPlayer = value?.nativeElement;
    this.syncAudioWithTrack();
  }

  @ViewChild('videoRef')
  set videoRef(value: ElementRef<HTMLVideoElement> | undefined) {
    this.pipVideoPlayer = value?.nativeElement;
    if (this.pipVideoPlayer) {
      // Sync PiP window play/pause/mute controls back to the audio element
      this.pipVideoPlayer.addEventListener('play', () => void this.audioPlayer?.play());
      this.pipVideoPlayer.addEventListener('pause', () => this.audioPlayer?.pause());
      this.pipVideoPlayer.addEventListener('volumechange', () => {
        if (this.audioPlayer && this.pipVideoPlayer) {
          this.audioPlayer.muted = this.pipVideoPlayer.muted;
        }
      });
    }
  }

  get isPiPSupported(): boolean {
    return typeof document !== 'undefined' && document.pictureInPictureEnabled;
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

  async enterPiP(): Promise<void> {
    if (!this.pipVideoPlayer || !this.isPiPSupported) {
      return;
    }

    const track = this.playerService.currentTrack();
    const canvas = document.createElement('canvas');

    canvas.width = this.canvasWidth ;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Dark background as fallback
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const activate = async () => {
      if (!this.pipVideoPlayer) {
        return;
      }

      try {
        this.pipVideoPlayer.srcObject = canvas.captureStream(0);
        await this.pipVideoPlayer.play();
        await this.pipVideoPlayer.requestPictureInPicture();
      } catch {
        // Blocked by browser policy or CORS.
      }
    };

    if (track?.image) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
        } catch {
          // CORS-tainted image — keep dark background
        }
        void activate();
      };
      img.onerror = () => void activate();
      img.src = track.image;
    } else {
      await activate();
    }
  }

  onLoadedMetadata(event: Event): void {
    const track = this.playerService.currentTrack();
    const audio = event.target as HTMLAudioElement;
    const savedTime = this.playerService.getSavedPlaybackPosition(track?.radioDetailId ?? null);
    if (savedTime === null || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    audio.currentTime = Math.min(savedTime, Math.max(audio.duration - 1, 0));
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
      this.clearMediaSession();
      return;
    }

    this.setupMediaSession(track);

    if (this.audioPlayer.src !== track.audioUrl) {
      this.audioPlayer.src = track.audioUrl;
      this.audioPlayer.load();
      void this.audioPlayer.play().catch(() => {
        // User can still start playback manually from the footer controls.
      });
    }
  }

  private setupMediaSession(track: { title: string; programTitle: string; image: string }): void {
    if (!('mediaSession' in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.programTitle,
      artwork: track.image ? [{ src: track.image, sizes: `${this.pipWidth}x${this.pipHeight}`, type: 'image/jpeg' }] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      void this.audioPlayer?.play();
      void this.pipVideoPlayer?.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      this.audioPlayer?.pause();
      this.pipVideoPlayer?.pause();
    });
  }

  private clearMediaSession(): void {
    if (!('mediaSession' in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = null;
    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
  }
}
