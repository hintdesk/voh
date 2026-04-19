import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';
import { PlayerService } from '../../services/player.service';
import { ProgramService } from '../../services/program.service';
import { EpisodeWithState } from '../../entities/episodeWithState';



@Component({
  selector: 'app-program',
  imports: [CommonModule],
  templateUrl: './program.page.html',
  styleUrls: ['./program.page.css'],
})
export class Program implements OnInit {
  private dataService = inject(DataService);
  private playerService = inject(PlayerService);
  private programService = inject(ProgramService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  programTitle = signal('Program');
  episodes = signal<EpisodeWithState[]>([]);

  constructor() {
    effect(
      () => {
        this.playerService.listenedVersion();
        const currentEpisodes = untracked(() => this.episodes());
        this.episodes.set(
          currentEpisodes.map((episode) => ({
            ...episode,
            listened: this.playerService.isEpisodeListened(episode.slug, episode.radioDetailId),
          })),
        );
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
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

        this.playerService.rememberEpisodeDetail(episode.slug, radioDetailId);

        if (this.playerService.isEpisodeListened(episode.slug, radioDetailId)) {
          episode.listened = true;
          this.episodes.update((list) => [...list]);
          return;
        }

        episode.audioUrl = audioUrl;
        this.episodes.update((list) => [...list]);
        this.playerService.openTrack({
          slug: episode.slug,
          title: episode.title,
          image: episode.image,
          audioUrl,
          radioDetailId,
          programTitle: this.programTitle(),
        });
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
            const listened = this.playerService.isEpisodeListened(ep.slug, null);
            return {
              ...ep,
              image: ep.image ?? '',
              loading: false,
              audioUrl: null,
              listened,
              radioDetailId: null,
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

  isCurrentTrack(slug: string): boolean {
    return this.playerService.isCurrentTrack(slug);
  }
}
