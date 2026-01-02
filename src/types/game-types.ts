export type GameState =
  | "LOADING"
  | "SHUFFLING"
  | "BETTING"
  | "INIT_GAME"
  | "MAIN_TURN"
  | "MAIN_STAND"
  | "MAIN_STAND_REWARDS_TRANSIT"
  | "SPLIT_TURN"
  | "SPLIT_STAND"
  | "SPLIT_STAND_DOUBLE"
  | "SPLIT_NAT21_TRANSIT"
  | "SPLIT_FINISH"
  | "SPLIT_FINISH_OUTCOME"
  | "SPLIT_ACE_TRANSIT"
  | "OUT_OF_TOKENS"
  | "RESTART_GAME"
  | "ERROR"
  | "RELOADING";

export interface GameStateData {
  currentGameState: GameState;
  player: PlayerData;
  dealer_masked: DealerMaskedData;
  dealer_unmasked: DealerUnmaskedData;
  aces: boolean;
  natural_21: number;
  winner: number;
  players: Record<string, PlayerData>;
  split_req: number;
  deck_len: number;
  tokens: number;
  bet: number;
  bet_list: number[];
  is_round_active: boolean;
}

export interface PlayerData {
  id: string;
  hand: string[];
  sum: number;
  hand_state: number;
  can_split: boolean;
  stated: boolean;
  bet: number;
}

export interface DealerMaskedData {
  hand: string[];
  sum: number;
  can_insure: boolean;
  nat_21: number;
}

export interface DealerUnmaskedData {
  hand: string[];
  sum: number;
  hand_state: number;
  natural_21: number;
}

export type GameStateForClient = {
  // A deck_len az egyetlen mező, amit a serialize_for_client_init(self) visszaküld.
  deck_len: number;
};

export type SessionInitResponse = {
  status: "success";
  message: string;
  user_id: string;
  clientId: string;
  tokens: number;
  game_state: GameStateForClient; // deck_len
  game_state_hint: "USER_SESSION_INITIALIZED";
};

export type TokensResponse = {
  user_tokens: number;
  message: string;
};

export type DeckLenResponse = {
  deck_len: number;
  message: string;
};

export type ErrorResponse = {
  message?: string; // Az üzenet opcionális, ha a backend nem mindig küld ilyet
  code?: string | number;
  error?: string; // Lehet, hogy a backend küld hibakódot is
  details?: string | object; // További részletek
};

export type GameStateMachineHookResult = {
  gameState: GameStateData;
  currentGameState: GameState;
  transitionToState: (
    newState: GameState,
    newData?: Partial<GameStateData>
  ) => void;
  handlePlaceBet: (amount: number) => Promise<void>;
  //handleDeal: () => Promise<void>; // Hozzáadva a visszatérési típushoz
  handleRetakeBet: () => Promise<void>;
  handleStartGame: (shouldShuffle: boolean) => void;
  handleHitRequest: () => Promise<void>;
  handleStandRequest: () => Promise<void>;
  handleDoubleRequest: () => Promise<void>;
  handleSplitRequest: () => Promise<void>;
  handleSplitHitRequest: () => Promise<void>;
  handleSplitStandRequest: () => Promise<void>;
  handleSplitDoubleRequest: () => Promise<void>;
  handleInsRequest: () => Promise<void>;
  preRewardBet: number | null;
  preRewardTokens: number | null;
  insPlaced: boolean;
  hasHitTurn: boolean;
  hasOver21: boolean;
  showInsLost: boolean;
  isSplitted: boolean;
  hitCounter: number | null;
  initDeckLen: number | null;
  isWFSR: boolean;
};

export const states = [
  "",
  "BLACKJACK Player won!",
  "BlackJack push",
  "BlackJack Dealer won!",
  "Push",
  "Player lost",
  "Player won",
  "Dealer won",
  "twenty one",
  "bust",
  "under 21",
  "BlackJack",
];
