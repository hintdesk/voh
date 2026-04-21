import { Injectable, signal } from '@angular/core';

const LISTENED_IDS_KEY = 'voh-listened-radio-detail-ids';
const SLUG_TO_ID_KEY = 'voh-slug-to-radio-detail-id';
const PLAYBACK_POSITIONS_KEY = 'voh-radio-playback-positions';

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
  private playbackPositions: Record<string, number> = {};

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
    if (!track?.radioDetailId) {
      return;
    }

    this.savePlaybackPosition(track.radioDetailId, audio.currentTime, audio.duration);

    if (track.listened) {
      return;
    }

    if (!audio.duration || Number.isNaN(audio.duration) || audio.duration <= 0) {
      return;
    }

    if (audio.currentTime / audio.duration >= 0.75) {
      this.markEpisodeAsListened(track.slug, track.radioDetailId);
    }
  }

  getSavedPlaybackPosition(radioDetailId: string | null): number | null {
    if (!radioDetailId) {
      return null;
    }

    const savedTime = this.playbackPositions[radioDetailId];
    if (!Number.isFinite(savedTime) || savedTime <= 0) {
      return null;
    }

    return savedTime;
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
      const playbackPositionsRaw = localStorage.getItem(PLAYBACK_POSITIONS_KEY);
      const ids = idsRaw ? (JSON.parse(idsRaw) as string[]) : [];
      const slugMap = slugMapRaw ? (JSON.parse(slugMapRaw) as Record<string, string>) : {};
      const playbackPositions = playbackPositionsRaw
        ? (JSON.parse(playbackPositionsRaw) as Record<string, number>)
        : {};
      this.listenedIds = new Set(ids.map((id) => String(id)));
      this.slugToDetailId = slugMap;
      this.playbackPositions = Object.fromEntries(
        Object.entries(playbackPositions).filter(([, time]) => Number.isFinite(time) && time > 0),
      );
    } catch {
      this.listenedIds = new Set<string>();
      this.slugToDetailId = {};
      this.playbackPositions = {};
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

  private savePlaybackPosition(radioDetailId: string, currentTime: number, duration: number): void {
    if (!Number.isFinite(currentTime) || currentTime < 0) {
      return;
    }

    if (Number.isFinite(duration) && duration > 0 && currentTime >= Math.max(duration - 1, duration * 0.98)) {
      this.clearSavedPlaybackPosition(radioDetailId);
      return;
    }

    const normalizedTime = Math.floor(currentTime);
    if (normalizedTime <= 0 || this.playbackPositions[radioDetailId] === normalizedTime) {
      return;
    }

    this.playbackPositions[radioDetailId] = normalizedTime;
    this.savePlaybackPositions();
  }

  private clearSavedPlaybackPosition(radioDetailId: string): void {
    if (!(radioDetailId in this.playbackPositions)) {
      return;
    }

    delete this.playbackPositions[radioDetailId];
    this.savePlaybackPositions();
  }

  private savePlaybackPositions(): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(PLAYBACK_POSITIONS_KEY, JSON.stringify(this.playbackPositions));
  }
}