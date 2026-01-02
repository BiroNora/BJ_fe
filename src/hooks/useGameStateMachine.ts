import { useState, useEffect, useCallback, useRef } from "react";
import {
  initializeSessionAPI,
  setBet,
  takeBackDeal,
  getShuffling,
  startGame,
  handleHit,
  handleRewards,
  handleInsurance,
  handleDouble,
  handleStandAndRewards,
  splitHand,
  addToPlayersListByStand,
  addSplitPlayerToGame,
  addPlayerFromPlayers,
  handleSplitDouble,
  handleSplitStandAndRewards,
  setRestart,
  forceRestart,
  splitHit,
  type HttpError,
} from "../api/api-calls";
import type {
  GameState,
  GameStateData,
  GameStateMachineHookResult,
  SessionInitResponse,
} from "../types/game-types";
import { extractGameStateData } from "../utilities/utils";

// Kezdeti állapot a játékgép számára
const initialGameState: GameStateData = {
  currentGameState: "LOADING",
  player: {
    id: "NONE",
    hand: [],
    sum: 0,
    hand_state: 0,
    can_split: false,
    stated: false,
    bet: 0,
  },
  dealer_masked: {
    hand: [],
    sum: 0,
    can_insure: false,
    nat_21: 0,
  },
  dealer_unmasked: {
    hand: [],
    sum: 0,
    hand_state: 0,
    natural_21: 0,
  },
  aces: false,
  natural_21: 0,
  winner: 0,
  players: {},
  split_req: 0,
  deck_len: 104,
  tokens: 0,
  bet: 0,
  bet_list: [],
  is_round_active: false,
};

// A hook visszatérési típusa most inline van deklarálva, nincs külön 'type' definíció.
export function useGameStateMachine(): GameStateMachineHookResult {
  const [gameState, setLocalGameState] =
    useState<GameStateData>(initialGameState);
  const [preRewardBet, setPreRewardBet] = useState<number | null>(null);
  const [preRewardTokens, setPreRewardTokens] = useState<number | null>(null);
  const [insPlaced, setInsPlaced] = useState(false);
  const [showInsLost, setShowInsLost] = useState(false);
  const [hasHitTurn, setHasHitTurn] = useState(false);
  const [hasOver21, setHasOver21] = useState(false);
  const [isSplitted, setIsSplitted] = useState(false);
  const [hasSplitNat21, setHasSplitNat21] = useState(false);
  const [hitCounter, setHitCounter] = useState<number | null>(null);
  const [initDeckLen, setInitDeckLen] = useState<number | null>(null);
  // isWaitingForServerResponse = isWFSR  (button disabling)
  // setIsWaitingForServerResponse = setIsWFSR
  const [isWFSR, setIsWFSR] = useState(false);

  const timeoutIdRef = useRef<number | null>(null);

  // Az isMounted ref-et is használjuk a komponens mountolt állapotának követésére
  // Ennek típusa boolean, a useRef pedig automatikusan kikövetkezteti.
  const isMountedRef = useRef(true);

  // Állapotváltó funkció
  const transitionToState = useCallback(
    (newState: GameState, newData?: Partial<GameStateData>) => {
      setLocalGameState((prev) => {
        const updatedState = {
          ...prev,
          ...newData,
          currentGameState: newState,
        };
        /* console.log(
          `>>> Állapotváltás: ${prev.currentGameState} -> ${newState}`,
          updatedState
        ); */
        return updatedState;
      });
    }, []);

  const savePreActionState = useCallback(() => {
    if (gameState) {
      setPreRewardBet(gameState.player.bet);
      setPreRewardTokens(gameState.tokens);
    } else {
      setPreRewardBet(null);
      setPreRewardTokens(null);
    }
  }, [gameState, setPreRewardBet, setPreRewardTokens]);

  // A counter növelésére szolgáló callback
  const incrementHitCounter = useCallback(() => {
    setHitCounter((prevCount) => (prevCount === null ? 1 : prevCount + 1));
  }, []);

  // A counter nullázására szolgáló callback
  const resetHitCounter = useCallback(() => {
    setHitCounter(null);
  }, []);

  const resetGameVariables = useCallback(() => {
    setPreRewardBet(null);
    setPreRewardTokens(null);
    setInsPlaced(false);
    setShowInsLost(false);
    setHasHitTurn(false);
    setHasOver21(false);
    setIsSplitted(false);
    setHasSplitNat21(false);
    setHitCounter(null);
    setIsWFSR(false);
  }, []);

  /**
 * Kezeli az aszinkron API hívásokat, és a hibák alapján meghatározza a viselkedést.
 * @param apiCallFn Az aszinkron függvény, ami meghívja az API-t (pl. handleHit).
 * @returns A sikeres API válasz.
 */
  const handleApiAction = useCallback(
    async <T>(apiCallFn: () => Promise<T>): Promise<T | null> => {
      try {
        const data = await apiCallFn();
        return data;

      } catch (error) {
        const httpError = error as HttpError;
        const response = httpError.response;

        if (response && typeof response.status === 'number') {
          const status = response.status;

          if (status >= 400 && status < 500) {
            const errorMessage = httpError.message || "Érvénytelen kérés.";
            console.warn(`Nem kritikus API hiba (4xx): ${errorMessage}`);
            return null;
          } else {
            console.error("Kritikus hiba (5xx vagy hálózati):", error);
            transitionToState("ERROR");
            return null;
          }
        }

        // Ha nincs response.status (pl. hálózati timeout vagy nem HttpError)
        console.error("Hálózati vagy ismeretlen API hiba:", error);
        transitionToState("ERROR");
        return null;
      }
    }, [transitionToState]);

  const handlePlaceBet = useCallback(
    async (amount: number) => {
      if (gameState.tokens >= amount && amount > 0) {
        setIsWFSR(true);

        try {
          const data = await handleApiAction(() => setBet(amount));
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            transitionToState("BETTING", response);
          }
        } catch {
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        } finally {
          if (isMountedRef.current) {
            setIsWFSR(false);
          }
        }
      }
    }, [gameState.tokens, handleApiAction, transitionToState]);

  const handleRetakeBet = useCallback(async () => {
    if (gameState.bet_list) {
      setIsWFSR(true);

      try {
        const data = await handleApiAction(takeBackDeal);
        if (data) {
          if (!isMountedRef.current) return;
          const response = extractGameStateData(data);
          transitionToState("BETTING", response);
        }
      } catch {
        if (isMountedRef.current) {
          transitionToState("ERROR");
        }
      } finally {
        if (isMountedRef.current) {
          setIsWFSR(false);
        }
      }
    }
  }, [gameState.bet_list, handleApiAction, transitionToState]);

  const handleStartGame = useCallback(
    (shouldShuffle: boolean) => {
      if (gameState) {
        if (shouldShuffle) {
          transitionToState("SHUFFLING", gameState);
        } else {
          transitionToState("INIT_GAME", gameState);
        }
      }
    }, [gameState, transitionToState]);

  const handleHitRequest = useCallback(async () => {
    setIsWFSR(true);
    setShowInsLost(false);
    savePreActionState();

    try {
      const data = await handleApiAction(handleHit);
      if (data) {
        if (!isMountedRef.current) return;
        const response = extractGameStateData(data);
        if (response && response.player) {
          const playerHandValue = response.player.sum;
          if (playerHandValue >= 21) {
            setHasOver21(true);
          }
          setHasHitTurn(true);
          transitionToState("MAIN_TURN", response);
        }
      }
    } catch {
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
      }
    }
  }, [savePreActionState, handleApiAction, transitionToState]);

  const handleStandRequest = useCallback(async () => {
    setIsWFSR(true);
    setShowInsLost(false);
    savePreActionState();

    try {
      transitionToState("MAIN_STAND_REWARDS_TRANSIT", gameState);
    } catch {
      transitionToState("ERROR");
    } finally {
      setIsWFSR(false);
    }
  }, [savePreActionState, transitionToState, gameState]);

  const handleDoubleRequest = useCallback(async () => {
    setIsWFSR(true);
    setShowInsLost(false);

    try {
      const data = await handleApiAction(handleDouble);
      if (data) {
        if (!isMountedRef.current) return;
        const response = extractGameStateData(data);
        if (response && response.player && response.tokens) {
          setPreRewardBet(response.player.bet);
          setPreRewardTokens(response.tokens);
          transitionToState("MAIN_STAND_REWARDS_TRANSIT", response);
        }
      }
    } catch {
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
      }
    }
  }, [handleApiAction, transitionToState]);

  const handleInsRequest = useCallback(async () => {
    setIsWFSR(true);
    setInsPlaced(true);
    savePreActionState();

    try {
      const data = await handleApiAction(handleInsurance);
      if (data) {
        if (!isMountedRef.current) return;
        const response = extractGameStateData(data);
        const insWon = response?.natural_21;
        if (insWon === 3) {
          transitionToState("MAIN_STAND", response);
        } else {
          setShowInsLost(true);
          transitionToState("MAIN_TURN", response);
        }
      }
    } catch {
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
      }
    }
  }, [savePreActionState, handleApiAction, transitionToState]);

  // SPLIT part
  const handleSplitRequest = useCallback(async () => {
    setIsWFSR(true);
    setShowInsLost(false);
    setIsSplitted(true);
    savePreActionState();

    try {
      const data = await handleApiAction(splitHand);
      if (data) {
        if (!isMountedRef.current) return;
        const response = extractGameStateData(data);
        if (response && response.player) {
          if (response.aces === true) {
            transitionToState("SPLIT_ACE_TRANSIT", response);
          } else if (response.player.hand.length === 2 && response.player.sum === 21) {
            transitionToState("SPLIT_NAT21_TRANSIT", response);
          } else {
            transitionToState("SPLIT_TURN", response);
          }
        }
      }
    } catch {
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
      }
    }
  }, [handleApiAction, savePreActionState, transitionToState]);

  const handleSplitHitRequest = useCallback(async () => {
    setIsWFSR(true);
    setHasHitTurn(true);

    try {
      const data = await handleApiAction(splitHit);
      if (data) {
        if (!isMountedRef.current) return;
        const response = extractGameStateData(data);
        const newHitCounter = hitCounter === null ? 1 : hitCounter + 1;
        incrementHitCounter();

        if (response && response.player) {
          const playerHandValue = response.player.sum;
          if (playerHandValue >= 21) {
            if (newHitCounter === 1) {
              setHasOver21(true);
              transitionToState("SPLIT_STAND_DOUBLE", response);
            } else {
              setHasOver21(true);
              transitionToState("SPLIT_STAND", response);
            }
          } else {
            transitionToState("SPLIT_TURN", response);
          }
        }
      }
    } catch {
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
      }
    }
  }, [handleApiAction, hitCounter, incrementHitCounter, transitionToState]);

  const handleSplitStandRequest = useCallback(async () => {
    setIsWFSR(true);

    if (hasHitTurn === false) {
      transitionToState("SPLIT_STAND_DOUBLE", gameState);
    } else {
      transitionToState("SPLIT_STAND", gameState);
    }
  }, [gameState, hasHitTurn, transitionToState]);

  const handleSplitDoubleRequest = useCallback(async () => {
    setIsWFSR(true);
    setHasHitTurn(true);

    try {
      const data = await handleApiAction(handleSplitDouble);
      if (data) {
        if (!isMountedRef.current) return;
        const response = extractGameStateData(data);
        if (response && response.player && response.tokens) {
          transitionToState("SPLIT_STAND_DOUBLE", response);
        } else {
          transitionToState("SPLIT_TURN", gameState);
        }
      }
    } catch {
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
      }
    }
  }, [gameState, handleApiAction, transitionToState]);

  // --- useEffect blokkok ---

  useEffect(() => {
    isMountedRef.current = true;
    //console.log("isMountedRef: Komponens mountolva, isMountedRef.current = true");

    return () => {
      isMountedRef.current = false;
      //console.log("isMountedRef: Komponens unmountolva, isMountedRef.current = false");
    };
  }, []);

  // MÁSODIK (FŐ) useEffect: Játékállapot változások kezelése
  useEffect(() => {
    //console.log("Fő useEffect futott. Jelenlegi állapot:", gameState.currentGameState);
    // Minden újrafutáskor töröljük az előzőleg beállított időzítőt, ha van.
    // Ez megakadályozza, hogy több időzítő fusson egyszerre, vagy "szellem" időzítők maradjanak.
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null; // Fontos, hogy nullázzuk is
    }

    // --- LOADING ÁLLAPOT KEZELÉSE ---
    if (gameState.currentGameState === "LOADING") {
      const initializeApplicationOnLoad = async () => {
        try {
          // 1. Min. töltési idő beállítása
          const minLoadingTimePromise = new Promise((resolve) =>
            setTimeout(resolve, 7000)
          );

          // 2. Single API hívás, ami mindent visszaad (session, tokenek, game_state)
          const initializationPromise = handleApiAction(initializeSessionAPI);

          // Várjuk meg a leglassabb elemet (API vagy min. töltési idő)
          const [initData] = await Promise.all([
            initializationPromise,
            minLoadingTimePromise,
          ]);

          if (!isMountedRef.current) return;

          if (!initData) {
            // A handleApiAction már kezelte a 4xx hibát (pl. logolta).
            // Ehelyett logikusan a LOGIN állapotba kell átváltani,
            // ha az inicializáció sikertelen volt (pl. 401 Unauthorized).
            // Vagy ha 5xx történt, a handleApiAction már ERROR-ba váltott.
            return; // Megállítjuk a futást, maradunk a jelenlegi állapotban (vagy a handleApiAction már átvitt LOGIN/ERROR-ba)
          }

          const responseData = initData as SessionInitResponse;
          const userTokens = responseData.tokens;
          const deckLength = responseData.game_state.deck_len;

          if (!isMountedRef.current) {
            setInitDeckLen(deckLength);
          }

          if (userTokens === 0) {
            if (isMountedRef.current) {
              transitionToState("OUT_OF_TOKENS");
            }
          } else {
            if (isMountedRef.current) {
              transitionToState("BETTING", {
                tokens: userTokens,
                deck_len: deckLength,
              });
            }
          }
        } catch (error) {
          console.error("Initialization Error: ", error);
          if (isMountedRef.current) {
            transitionToState("ERROR", {
              tokens: 0,
              deck_len: 0,
            });
          }
        }
      };
      initializeApplicationOnLoad();
    }
    else if (gameState.currentGameState === "SHUFFLING") {
      const shufflingAct = async () => {
        // Early exit if component unmounted while awaiting (optional but good practice)
        if (!isMountedRef.current) return;

        try {
          const data = await handleApiAction(getShuffling);
          if (!isMountedRef.current) return;
          if (data) {
            const response = extractGameStateData(data);
            if (response) {
              timeoutIdRef.current = window.setTimeout(() => {
                if (isMountedRef.current) {
                  transitionToState("INIT_GAME", response);
                }
              }, 5000);
            }
          }
        } catch (e) {
          console.error("SHUFFLING: Hiba a SHUFFLING fázisban:", e);
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      shufflingAct();
    } else if (gameState.currentGameState === "INIT_GAME") {
      const InitGame = async () => {
        setIsWFSR(true);
        resetGameVariables();
        setInitDeckLen(gameState.deck_len);

        try {
          const data = await handleApiAction(startGame);
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            if (response && response.dealer_masked) {
              if (
                response.dealer_masked.nat_21 === 1 ||
                response.dealer_masked.nat_21 === 2
              ) {
                savePreActionState();
                const rewards = await handleRewards();
                if (!isMountedRef.current) return;
                const resp = extractGameStateData(rewards);
                transitionToState("MAIN_STAND", resp);
              } else {
                transitionToState("MAIN_TURN", response);
              }
            }
          }
        } catch {
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        } finally {
          if (isMountedRef.current) {
            setIsWFSR(false);
          }
        }
      };
      InitGame();
    } else if (gameState.currentGameState === "MAIN_TURN") {
      const MainTurn = async () => {
        setIsWFSR(true);

        try {
          if (hasOver21) {
            transitionToState("MAIN_STAND_REWARDS_TRANSIT", gameState);
          }
        } catch {
          transitionToState("ERROR");
        } finally {
          setIsWFSR(false);
        }
      };
      MainTurn();
    } else if (gameState.currentGameState === "MAIN_STAND") {
      if (!isMountedRef.current) return;

      timeoutIdRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          if (gameState.tokens === 0) {
            transitionToState("OUT_OF_TOKENS");
          } else {
            const nextRoundGameState: Partial<GameStateData> = {
              ...initialGameState,
              currentGameState: "BETTING",
              deck_len: gameState.deck_len,
              tokens: gameState.tokens,
              bet: 0,
            };
            transitionToState("BETTING", nextRoundGameState);
          }
        }
      }, 4000);
    } else if (gameState.currentGameState === "MAIN_STAND_REWARDS_TRANSIT") {
      const MainStandDoubleTransit = async () => {
        if (!isMountedRef.current) return;

        try {
          const data = await handleStandAndRewards();
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            if (response) {
              timeoutIdRef.current = window.setTimeout(() => {
                if (isMountedRef.current) {
                  transitionToState("MAIN_STAND", response);
                }
              }, 200);
            }
          }
        } catch {
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      MainStandDoubleTransit();
    } else if (
      gameState.currentGameState === "SPLIT_STAND" ||
      gameState.currentGameState === "SPLIT_STAND_DOUBLE"
    ) {
      setIsWFSR(true);
      setHasHitTurn(false); // See handleSplitStandRequest
      setHasOver21(false);
      resetHitCounter();

      const SplitStand = async () => {
        if (!isMountedRef.current) return;

        try {
          const data = await addToPlayersListByStand();
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            const currSplitReq = response?.split_req || 0;

            if (currSplitReq > 0) {
              const splitResponse = await addSplitPlayerToGame();
              if (!isMountedRef.current) return;
              if (splitResponse) {
                const ans = extractGameStateData(splitResponse);
                if (ans && ans.player) {
                  if (ans.player.hand.length === 2 && ans.player.sum === 21) {
                    if (gameState.currentGameState === "SPLIT_STAND_DOUBLE") {
                      timeoutIdRef.current = window.setTimeout(() => {
                        if (isMountedRef.current) {
                          transitionToState("SPLIT_NAT21_TRANSIT", ans);
                        }
                      }, 2000);
                    } else {
                      if (isMountedRef.current) {
                        transitionToState("SPLIT_NAT21_TRANSIT", ans);
                      }
                    }
                  } else {
                    if (hasSplitNat21) {
                      // do not wait 2*2000 sec
                      setHasSplitNat21(false);
                      if (isMountedRef.current) {
                        transitionToState("SPLIT_TURN", ans);
                      }
                    } else {
                      timeoutIdRef.current = window.setTimeout(() => {
                        if (isMountedRef.current) {
                          transitionToState("SPLIT_TURN", ans);
                        }
                      }, 2000);
                    }
                  }
                }
              }
            } else {
              if (hasSplitNat21) {
                setHasSplitNat21(false);
                if (isMountedRef.current) {
                  transitionToState("SPLIT_FINISH", response);
                }
              } else {
                timeoutIdRef.current = window.setTimeout(() => {
                  if (isMountedRef.current) {
                    transitionToState("SPLIT_FINISH", response);
                  }
                }, 2000);
              }
            }
          }
        } catch {
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        } finally {
          if (isMountedRef.current) {
            setIsWFSR(false);
          }
        }
      };
      SplitStand();
    } else if (gameState.currentGameState === "SPLIT_NAT21_TRANSIT") {
      setHasSplitNat21(true);

      const SplitNat21Transit = async () => {
        if (!isMountedRef.current) return;

        try {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState("SPLIT_STAND", gameState);
            }
          }, 2000);
        } catch {
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      SplitNat21Transit();
    } else if (gameState.currentGameState === "SPLIT_ACE_TRANSIT") {
      const SplitAce21Transit = async () => {
        if (!isMountedRef.current) return;

        try {
          const data = await addToPlayersListByStand();
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            const currSplitReq = response?.split_req || 0;

            if (currSplitReq > 0) {
              const splitResponse = await addSplitPlayerToGame();
              if (!isMountedRef.current) return;
              if (splitResponse) {
                const ans = extractGameStateData(splitResponse);
                timeoutIdRef.current = window.setTimeout(() => {
                  if (isMountedRef.current) {
                    transitionToState("SPLIT_ACE_TRANSIT", ans);
                  }
                }, 2000);
              }
            } else {
              timeoutIdRef.current = window.setTimeout(() => {
                if (isMountedRef.current) {
                  transitionToState("SPLIT_FINISH", response);
                }
              }, 2000);
            }
          }
        } catch {
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      SplitAce21Transit();
    } else if (gameState.currentGameState === "SPLIT_FINISH") {
      setHasHitTurn(false);

      const SplitFinish = async () => {
        if (!isMountedRef.current) return;

        try {
          savePreActionState();
          const data = await handleSplitStandAndRewards();
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);

            if (response) {
              if (isMountedRef.current) {
                transitionToState("SPLIT_FINISH_OUTCOME", response);
              }
            } else {
              if (isMountedRef.current) {
                transitionToState("ERROR");
              }
            }
          }
        } catch (e) {
          console.error("Hiba a SPLIT_FINISH fázisban:", e);
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      SplitFinish();
    } else if (gameState.currentGameState === "SPLIT_FINISH_OUTCOME") {
      const SplitFinishTransit = async () => {
        if (!isMountedRef.current) return;

        try {
          if (gameState.players) {
            if (Object.keys(gameState.players).length === 0) {
              if (gameState.tokens === 0) {
                if (isMountedRef.current) {
                  transitionToState("OUT_OF_TOKENS");
                }
              } else {
                setHasHitTurn(false);
                setHasOver21(false);
                timeoutIdRef.current = window.setTimeout(() => {
                  if (isMountedRef.current) {
                    transitionToState("BETTING", {
                      ...initialGameState,
                      currentGameState: "BETTING",
                      deck_len: gameState.deck_len,
                      tokens: gameState.tokens,
                      bet: 0,
                    });
                  }
                }, 4000);
              }
            } else {
              const data = await addPlayerFromPlayers();
              if (data) {
                if (!isMountedRef.current) return;
                const response = extractGameStateData(data);
                timeoutIdRef.current = window.setTimeout(() => {
                  if (isMountedRef.current) {
                    transitionToState("SPLIT_FINISH", response);
                  }
                }, 4000);
              }
            }
          }
        } catch (e) {
          console.error("Hiba a SPLIT_FINISH_OUTCOME fázisban:", e);
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      SplitFinishTransit();
    } else if (gameState.currentGameState === "OUT_OF_TOKENS") {
      const HandleOutOfTokens = async () => {
        if (!isMountedRef.current) return;

        try {
          const data = await setRestart();
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            if (response) {
              timeoutIdRef.current = window.setTimeout(() => {
                if (isMountedRef.current) {
                  transitionToState("RESTART_GAME", response);
                }
              }, 5000);
            }
          }
        } catch (e) {
          console.error("Hiba a RESTART_GAME fázisban:", e);
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      HandleOutOfTokens();
    } else if (gameState.currentGameState === "RESTART_GAME") {
      const RestartGame = async () => {
        if (!isMountedRef.current) return;

        try {
          resetGameVariables();
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState("RELOADING");
            }
          }, 5000);
        } catch (e) {
          console.error("Hiba a RESTART_GAME fázisban:", e);
          if (isMountedRef.current) {
            transitionToState("ERROR");
          }
        }
      };
      RestartGame();
    } else if (gameState.currentGameState === "ERROR") {
      const ForceRestart = async () => {
        if (!isMountedRef.current) return;

        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (!isMountedRef.current) return;

        setIsWFSR(true);

        try {
          const data = await forceRestart();
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            if (response) {
              transitionToState("RELOADING", response);
            }
          }
        } catch (error) {
          console.error("Hiba a kényszerített újraindítás során:", error);
        } finally {
          if (isMountedRef.current) {
            setIsWFSR(false);
          }
        }
      };
      ForceRestart();
    } else if (gameState.currentGameState === "RELOADING") {
      const Reloading = async () => {
        if (!isMountedRef.current) return;

        try {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState("BETTING", gameState);
            }
          }, 5000);
        } catch (error) {
          console.error("Error: ", error);
        }
      };
      Reloading();
    }
  }, [gameState, transitionToState, savePreActionState, isMountedRef, timeoutIdRef, resetHitCounter, hasSplitNat21, resetGameVariables, setInitDeckLen, hasOver21, handleApiAction]);

  return {
    gameState,
    currentGameState: gameState.currentGameState,
    transitionToState,
    handlePlaceBet,
    handleRetakeBet,
    handleStartGame,
    handleHitRequest,
    handleStandRequest,
    handleDoubleRequest,
    handleSplitRequest,
    handleSplitHitRequest,
    handleSplitStandRequest,
    handleSplitDoubleRequest,
    handleInsRequest,
    preRewardBet,
    preRewardTokens,
    insPlaced,
    hasHitTurn,
    hasOver21,
    isSplitted,
    hitCounter,
    showInsLost,
    initDeckLen,
    isWFSR,
  };
}
