export type FencerColor = 'ROJ' | 'VER';

export interface FencerProfile {
  code: FencerColor;
  name: string;
  fullName: string;
  country: string;
  flag: string;
  ranking: number;
  score: number;
  yellowCards: number;
  redCards: number;
}
