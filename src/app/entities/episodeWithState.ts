import { RadioEpisode } from "./radioEpisode";

export interface EpisodeWithState extends RadioEpisode {
  loading: boolean;
  audioUrl: string | null;
  image: string;
  listened: boolean;
  radioDetailId: string | null;
}