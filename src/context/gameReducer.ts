import type { GameState, GameStateData } from "../types/game-types";

export interface GameDataState {
  gameState: GameStateData; // Ez tartja a szerver adatait
  preRewardBet: number | null;
  preRewardTokens: number | null;
  insPlaced: boolean; // Gomb megjelenítéséhez
  showInsLost: boolean; // Felirathoz
  initDeckLen: number | null; // Animációhoz
  totalInitialCards: number | null;
}

// Definiáljuk az akciókat, ha még nincsenek a types-ban
export type GameAction =
  | { type: 'SYNC_SERVER_DATA'; payload: GameStateData }
  | { type: 'SET_UI_PHASE'; payload: GameState }
  | { type: 'SET_CONFIG'; payload: { totalInitialCards: number } }
  | { type: 'SET_DECK_LEN'; payload: number | null }
  | { type: 'SET_BET_SNAPSHOTS'; payload: { bet: number; tokens: number } }
  | { type: 'SET_INS_PLACED'; payload: boolean }
  | { type: 'SET_SHOW_INS_LOST'; payload: boolean }
  | { type: 'RESET_TURN_VARIABLES' };

export const initialGameDataState: GameDataState = {
  gameState: {
    currentGameState: 'LOADING',
    player: { id: "NONE", hand: [], sum: 0, hand_state: 0, can_split: false, stated: false, bet: 0, has_hit: 0 },
    dealer_masked: { hand: [], sum: 0, can_insure: false },
    dealer_unmasked: { hand: [], sum: 0, hand_state: 0, natural_21: 0 },
    aces: false,
    winner: 0,
    players: {},
    split_req: 0,
    deck_len: 0,
    tokens: 0,
    bet: 0,
    bet_list: [],
    target_phase: "LOADING",
    pre_phase: "BETTING",
  } as GameStateData,
  preRewardBet: null,
  preRewardTokens: null,
  insPlaced: false,
  showInsLost: false,
  initDeckLen: null,
  totalInitialCards: null,
};

export function gameReducer(state: GameDataState, action: GameAction): GameDataState {
  switch (action.type) {
    case 'SYNC_SERVER_DATA':
      return {
        ...state,
        gameState: {
          ...state.gameState, // Megtartjuk a meglévő mezőket (pl. dealer_masked, tokens)
          ...action.payload,   // Felülírjuk azokkal, amik a szervertől jöttek
        },
      };
    case 'SET_UI_PHASE':
      return {
        ...state,
        gameState: { ...state.gameState, currentGameState: action.payload }
      };
    case 'SET_CONFIG':
      return {
        ...state,
        totalInitialCards: action.payload.totalInitialCards,
        initDeckLen: (state.initDeckLen === null || state.initDeckLen === 0)
          ? action.payload.totalInitialCards
          : state.initDeckLen,
        gameState: {
          ...state.gameState,
        }
      };
    case 'SET_DECK_LEN':
      return { ...state, initDeckLen: action.payload };
    case 'SET_BET_SNAPSHOTS':
      return { ...state, preRewardBet: action.payload.bet, preRewardTokens: action.payload.tokens };
    case 'SET_INS_PLACED':
      return { ...state, insPlaced: action.payload };
    case 'SET_SHOW_INS_LOST':
      return { ...state, showInsLost: action.payload };
    case 'RESET_TURN_VARIABLES':
      return {
        ...state,
        initDeckLen: state.gameState.deck_len,
        preRewardBet: null,     // Nincs többé régi tét
        preRewardTokens: null,  // Nincs többé régi zsetonérték
        insPlaced: false,       // Biztosítás törlése
        showInsLost: false      // Üzenet elrejtése
      };
    default:
      return state;
  }
}
