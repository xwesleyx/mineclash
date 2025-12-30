
export enum GameState {
  ROLE_SELECT = 'ROLE_SELECT',
  SETUP_ROOM = 'SETUP_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LOBBY = 'LOBBY',
  AI_THINKING = 'AI_THINKING',
  PLAYERS_INPUT = 'PLAYERS_INPUT',
  REVEAL_SEQUENCE = 'REVEAL_SEQUENCE',
  ROUND_RESULT = 'ROUND_RESULT',
  GAME_OVER = 'GAME_OVER'
}

export interface PlayerEffect {
  id: string;
  name: string;
  type: 'Benefício' | 'Maléfício' | 'Caos';
  description: string;
}

export interface Player {
  id: string;
  name: string;
  lives: number;
  currentChoice: string;
  isRevealed: boolean;
  lostLifeThisRound: boolean;
  damageToTake: number;
  isReady: boolean;
  isHost: boolean;
  effects: PlayerEffect[];
}

export type GameMode = 
  | 'Tema da Sorte' 
  | 'Mob Misterioso' 
  | 'Bioma do Destino' 
  | 'Drop da Morte' 
  | 'Forno Profético' 
  | 'Mentira do Oráculo' 
  | 'Craft Fatal' 
  | 'Veio Amaldiçoado' 
  | 'Ferramenta Amaldiçoada'
  | 'Toque do Oráculo'
  | 'Luck Block';

export interface AIRoundData {
  mode: GameMode;
  items: string[];
  itemIds: string[];
  theme: string; 
  description: string;
  difficulty: 'fácil' | 'médio' | 'difícil';
  luckOutcomes?: Record<string, PlayerEffect>;
}

export interface GameConfig {
  playerCount: number;
  initialLives: number;
  roomId: string;
  luckBlockAppeared: boolean;
}
