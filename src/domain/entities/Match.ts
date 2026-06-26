export interface TournamentInfo {
  name: string;
  category: string;
  weapon: string;
  round: string;
  period: number;
  totalPeriods: number;
  timeElapsedSec: number;
  timeLimitSec: number;
  scoreLimit: number;
  venue: string;
  date: string;
}

export interface MatchSession {
  tournament: string;
  pista: string;
  arbitro: string;
  totalFrames: number;
  currentFrame: number;
  matchEnded: boolean;
}
