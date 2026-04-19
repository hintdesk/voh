import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, QueryList, signal, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';
import { ProgramService } from '../../services/program.service';
import { EpisodeWithState } from '../../entities/episodeWithState';



@Component({
  selector: 'app-program',
  imports: [CommonModule],
  templateUrl: './program.page.html',
  styleUrls: ['./program.page.css'],
})
export class Program implements OnInit {
  private static readonly LISTENED_IDS_KEY = 'voh-listened-radio-detail-ids';
  private static readonly SLUG_TO_ID_KEY = 'voh-slug-to-radio-detail-id';

  private dataService = inject(DataService);
  private programService = inject(ProgramService);
  private route = inject(ActivatedRoute);
  @ViewChildren('episodeAudio') private audioEls!: QueryList<ElementRef<HTMLAudioElement>>;
  private listenedIds = new Set<string>();
  private slugToDetailId: Record<string, string> = {};

  loading = signal(true);
  error = signal<string | null>(null);
  programTitle = signal('Program');
  episodes = signal<EpisodeWithState[]>([]);

  ngOnInit(): void {
    this.loadListeningState();
    this.route.paramMap.subscribe((params) => {
      const programId = (params.get('id') ?? '').trim().toLowerCase();
      this.programService.getProgramById(programId).subscribe({
        next: (program) => {
          this.programTitle.set(program?.title ?? 'Chương trình');
        },
      });
      this.fetchProgramEpisodes(programId);
    });
  }

  playEpisode(episode: EpisodeWithState): void {
    if (episode.listened) {
      return;
    }

    episode.loading = true;
    this.dataService.getEpisodeAudioDetail(episode.slug).subscribe({
      next: ({ audioUrl, image, radioDetailId }) => {
        episode.loading = false;
        episode.radioDetailId = radioDetailId;
        episode.image = episode.image || image;

        if (radioDetailId) {
          this.slugToDetailId[episode.slug] = radioDetailId;
          this.saveSlugToDetailMap();
        }

        if (radioDetailId && this.listenedIds.has(radioDetailId)) {
          episode.listened = true;
          episode.audioUrl = null;
          this.episodes.update((list) => [...list]);
          return;
        }

        episode.audioUrl = audioUrl;
        this.episodes.update((list) => [...list]);
        this.scheduleAutoPlay(episode.slug);
      },
      error: () => {
        episode.loading = false;
        this.episodes.update((list) => [...list]);
      },
    });
  }

  private fetchProgramEpisodes(programId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.episodes.set([]);

    this.dataService.getProgramRadioList(programId).subscribe({
      next: (list) => {
        this.episodes.set(
          list.map((ep) => {
            const detailId = this.slugToDetailId[ep.slug] ?? null;
            const listened = detailId ? this.listenedIds.has(detailId) : false;
            return {
              ...ep,
              image: ep.image ?? '',
              loading: false,
              audioUrl: null,
              listened,
              radioDetailId: detailId,
            };
          }),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách chương trình. Vui lòng thử lại.');
        this.loading.set(false);
      },
    });
  }

  private scheduleAutoPlay(slug: string, retries = 8): void {
    const audioEl = this.findAudioElementBySlug(slug);
    if (!audioEl) {
      if (retries > 0) {
        setTimeout(() => this.scheduleAutoPlay(slug, retries - 1), 30);
      } else {
        console.warn('Audio element not found for slug:', slug);
      }
      return;
    }

    void audioEl.play().catch(() => {
      // Ignore autoplay rejection; user can press play manually.
    });
  }

  private findAudioElementBySlug(slug: string): HTMLAudioElement | null {
    const match = this.audioEls.find((item) => item.nativeElement.dataset['slug'] === slug);
    return match?.nativeElement ?? null;
  }

  onAudioTimeUpdate(event: Event, episode: EpisodeWithState): void {
    if (episode.listened || !episode.radioDetailId) {
      return;
    }

    const audio = event.target as HTMLAudioElement;
    if (!audio.duration || Number.isNaN(audio.duration) || audio.duration <= 0) {
      return;
    }

    if (audio.currentTime / audio.duration >= 0.75) {
      this.markEpisodeAsListened(episode);
    }
  }

  private markEpisodeAsListened(episode: EpisodeWithState): void {
    if (!episode.radioDetailId || episode.listened) {
      return;
    }

    this.listenedIds.add(episode.radioDetailId);
    this.saveListenedIds();
    episode.listened = true;
    episode.audioUrl = null;
    this.episodes.update((list) => [...list]);
  }

  private loadListeningState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const idsRaw = localStorage.getItem(Program.LISTENED_IDS_KEY);
      const slugMapRaw = localStorage.getItem(Program.SLUG_TO_ID_KEY);
      const ids = idsRaw ? (JSON.parse(idsRaw) as string[]) : [];
      const slugMap = slugMapRaw ? (JSON.parse(slugMapRaw) as Record<string, string>) : {};
      this.listenedIds = new Set(ids.map((id) => String(id)));
      this.slugToDetailId = slugMap;
    } catch {
      this.listenedIds = new Set<string>();
      this.slugToDetailId = {};
    }
  }

  private saveListenedIds(): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(Program.LISTENED_IDS_KEY, JSON.stringify([...this.listenedIds]));
  }

  private saveSlugToDetailMap(): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(Program.SLUG_TO_ID_KEY, JSON.stringify(this.slugToDetailId));
  }
}
