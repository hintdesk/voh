import { Injectable, signal } from '@angular/core';

const LISTENED_IDS_KEY = 'voh-listened-radio-detail-ids';
const SLUG_TO_ID_KEY = 'voh-slug-to-radio-detail-id';

export interface PlayerTrack {
  slug: string;
  title: string;
  image: string;
  audioUrl: string;
  radioDetailId: string | null;
  programTitle: string;
  listened: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  currentTrack = signal<PlayerTrack | null>(null);
  listenedVersion = signal(0);

  private listenedIds = new Set<string>();
  private slugToDetailId: Record<string, string> = {};

  constructor() {
    this.loadListeningState();
  }

  openTrack(track: Omit<PlayerTrack, 'listened'>): void {
    this.rememberEpisodeDetail(track.slug, track.radioDetailId);
    this.currentTrack.set({
      ...track,
      listened: this.isEpisodeListened(track.slug, track.radioDetailId),
    });
  }

  closePlayer(): void {
    this.currentTrack.set(null);
  }

  isCurrentTrack(slug: string): boolean {
    return this.currentTrack()?.slug === slug;
  }

  isEpisodeListened(slug: string, radioDetailId: string | null): boolean {
    const detailId = radioDetailId ?? this.slugToDetailId[slug] ?? null;
    return detailId ? this.listenedIds.has(detailId) : false;
  }

  rememberEpisodeDetail(slug: string, radioDetailId: string | null): void {
    if (!radioDetailId || this.slugToDetailId[slug] === radioDetailId) {
      return;
    }

    this.slugToDetailId[slug] = radioDetailId;
    this.saveSlugToDetailMap();
  }

  handleAudioTimeUpdate(audio: HTMLAudioElement): void {
    const track = this.currentTrack();
    if (!track?.radioDetailId || track.listened) {
      return;
    }

    if (!audio.duration || Number.isNaN(audio.duration) || audio.duration <= 0) {
      return;
    }

    if (audio.currentTime / audio.duration >= 0.75) {
      this.markEpisodeAsListened(track.slug, track.radioDetailId);
    }
  }

  private markEpisodeAsListened(slug: string, radioDetailId: string): void {
    this.rememberEpisodeDetail(slug, radioDetailId);
    if (this.listenedIds.has(radioDetailId)) {
      return;
    }

    this.listenedIds.add(radioDetailId);
    this.saveListenedIds();
    this.listenedVersion.update((value) => value + 1);
    this.currentTrack.update((track) => {
      if (!track || track.slug !== slug) {
        return track;
      }

      return { ...track, listened: true };
    });
  }

  private loadListeningState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const idsRaw = localStorage.getItem(LISTENED_IDS_KEY);
      const slugMapRaw = localStorage.getItem(SLUG_TO_ID_KEY);
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

    localStorage.setItem(LISTENED_IDS_KEY, JSON.stringify([...this.listenedIds]));
  }

  private saveSlugToDetailMap(): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(SLUG_TO_ID_KEY, JSON.stringify(this.slugToDetailId));
  }
}