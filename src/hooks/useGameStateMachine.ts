import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import {
  initializeSessionAPI,
  setBet,
  takeBackDeal,
  clearGameState,
  recoverGameState,
  getShuffling,
  startGame,
  handleHit,
  handleInsurance,
  handleDouble,
  handleStandAndRewards,
  handleSplitHand,
  addToPlayersListByStand,
  addSplitPlayerToGame,
  addPlayerFromPlayers,
  handleSplitDouble,
  handleSplitStandAndRewards,
  setRestart,
  forceRestart,
  handleSplitHit,
  type HttpError,
} from "../api/api-calls";
import type {
  GameState,
  GameStateData,
  GameStateMachineHookResult,
  SessionInitResponse,
} from "../types/game-types";
import { extractGameStateData } from "../utilities/utils";
import { gameReducer, initialGameDataState } from "../context/gameReducer";

// A hook visszatérési típusa most inline van deklarálva, nincs külön 'type' definíció.
export function useGameStateMachine(): GameStateMachineHookResult {
  // isWaitingForServerResponse = isWFSR  (button disabling)
  const [isWFSR, setIsWFSR] = useState(false);
  const [state, dispatch] = useReducer(gameReducer, initialGameDataState);

  const timeoutIdRef = useRef<number | null>(null);
  // Az isMounted ref-et is használjuk a komponens mountolt állapotának követésére
  const isMountedRef = useRef(true);
  // Ez a védelmi zár (lock) az ismételt hívások ellen
  const isProcessingRef = useRef(false);
  const isAppInitializedRef = useRef(false);

  // Állapotváltó funkció a logolással és Reducer szinkronizációval
  const transitionToState = useCallback(
    (newState: GameState, newData?: Partial<GameStateData>) => {
      isProcessingRef.current = false;

      // Csak a Reducert frissítjük
      dispatch({
        type: 'SYNC_SERVER_DATA',
        payload: {
          ...(newData || {}),
          currentGameState: newState,
        } as GameStateData
      });

      //console.log(`>>> Állapotváltás: -> ${newState}`);
    },
    [dispatch]
  );

  const savePreActionState = useCallback(() => {
    // A 'state' a useReducer-ből jön, ez mindig a legfrissebb adatokat tartalmazza
    const currentData = state.gameState;

    if (currentData) {
      dispatch({
        type: 'SET_BET_SNAPSHOTS',
        payload: {
          bet: currentData.player.bet,
          tokens: currentData.tokens
        }
      });
    }
  }, [state.gameState, dispatch]);

  const resetGameVariables = useCallback(() => {
    dispatch({ type: 'RESET_TURN_VARIABLES' });
    setIsWFSR(false);
    isProcessingRef.current = false;

    //console.log("--- Játék változók alaphelyzetbe állítva ---");
  }, [dispatch]);

  const executeAsyncAction = useCallback(async (actionFn: () => Promise<void>) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsWFSR(true);

    try {
      await actionFn();
      if (!isMountedRef.current) return;
    } catch (error) {
      console.error("Action error:", error);
      if (isMountedRef.current) {
        transitionToState("ERROR");
      }
    } finally {
      if (isMountedRef.current) {
        setIsWFSR(false);
        isProcessingRef.current = false;
      }
    }
  }, [transitionToState]);

  const handleApiAction = useCallback(
    async <T,>(apiCallFn: () => Promise<T>): Promise<T | null> => {
      try {
        return await apiCallFn();
      } catch (error) {
        const httpError = error as HttpError;
        const status = httpError.response?.status;

        console.error(status && status < 500 ? "Kliens hiba:" : "Szerver hiba:", error);

        if (isMountedRef.current) {
          transitionToState("ERROR");
        }

        throw error; // Megállítja a végrehajtást a gomb-kezelőben is!
      }
    },
    [transitionToState],
  );

  const handleOnContinue = useCallback(() => {
    executeAsyncAction(async () => {
      const data = await handleApiAction(recoverGameState);

      const response = extractGameStateData(data);
      if (!response) return;
      dispatch({
          type: 'SET_DECK_LEN',
          payload: response.deck_len ?? null
        });

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, handleApiAction, transitionToState]);

  const handleOnStartNew = useCallback(() => {
    executeAsyncAction(async () => {
      // 1. Meghívjuk az API-t a diplomata (handleApiAction) segítségével
      // Ha hiba van, a throw miatt itt megáll, és az executeAsyncAction catch ága vált ERROR-ra
      const data = await handleApiAction(clearGameState);

      // 2. Feldolgozzuk az adatot (itt már biztosan van data, különben throw történt volna)
      const response = extractGameStateData(data);
      if (!response) return;

      // 4. Átlépünk az új fázisba (SHUFFLING vagy BETTING a szerver döntése alapján)
      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, handleApiAction, transitionToState]);

  const handlePlaceBet = useCallback(
    async (amount: number) => {
      const currentTokens = state.gameState.tokens;
      if (currentTokens < amount || amount <= 0) return;

      executeAsyncAction(async () => {
        const data = await handleApiAction(() => setBet(amount));

        const response = extractGameStateData(data);
        if (!response) return;

        transitionToState(response?.target_phase as GameState, response);
      });
    },
    [state.gameState.tokens, executeAsyncAction, handleApiAction, transitionToState]
  );

  const handleRetakeBet = useCallback(() => {
    // Guard clause: csak akkor indítunk, ha van mit visszavenni
    const currentBetList = state.gameState.bet_list;
    if (!currentBetList || currentBetList.length === 0) return;

    executeAsyncAction(async () => {
      const data = await handleApiAction(takeBackDeal);

      const response = extractGameStateData(data);
      if (!response) return;

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [state.gameState.bet_list, executeAsyncAction, handleApiAction, transitionToState]);

  const handleStartGame = useCallback(async () => {
    const response = state.gameState;

    if (!response) return;

    setIsWFSR(true);

    // A logika egyszerű: ha a szerver szerint kell valami "elő-fázis" (pl. SHUFFLING),
    // akkor oda megyünk. Ha nincs ilyen, akkor a végcélhoz (pl. INIT_GAME).
    const nextState = response.pre_phase || response.target_phase || "ERROR";

    transitionToState(nextState, response);

    setIsWFSR(false);
  }, [state.gameState, transitionToState]);

  const handleHitRequest = useCallback(() => {
    executeAsyncAction(async () => {
      dispatch({
        type: 'SET_SHOW_INS_LOST',
        payload: false
      });
      savePreActionState();

      const data = await handleApiAction(handleHit);
      const response = extractGameStateData(data);

      if (!response) return;

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, savePreActionState, handleApiAction, transitionToState]);

  const handleStandRequest = useCallback(() => {
    executeAsyncAction(async () => {
      dispatch({ type: 'SET_SHOW_INS_LOST', payload: false });
      savePreActionState();

      const data = await handleApiAction(handleStandAndRewards);

      const response = extractGameStateData(data);
      if (!response) return;

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, savePreActionState, handleApiAction, transitionToState]);

  const handleDoubleRequest = useCallback(() => {
    executeAsyncAction(async () => {
      dispatch({
        type: 'SET_SHOW_INS_LOST',
        payload: false
      });

      const data = await handleApiAction(handleDouble);

      const response = extractGameStateData(data);
      if (!response) return;

      if (response.player && response.tokens !== undefined) {
        savePreActionState();
      }

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, handleApiAction, savePreActionState, transitionToState]);

  const handleInsRequest = useCallback(() => {
    executeAsyncAction(async () => {
      dispatch({
        type: 'SET_INS_PLACED',
        payload: true
      });
      savePreActionState();

      const data = await handleApiAction(handleInsurance);
      const response = extractGameStateData(data);
      if (!response) return;

      if (response.target_phase === "MAIN_TURN") {
        dispatch({ type: 'SET_SHOW_INS_LOST', payload: true });
      }
      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, savePreActionState, handleApiAction, transitionToState]);

  // SPLIT PART
  const handleSplitRequest = useCallback(async () => {
    executeAsyncAction(async () => {
      dispatch({
        type: 'SET_SHOW_INS_LOST',
        payload: false
      });

      savePreActionState();

      const data = await handleApiAction(handleSplitHand);

      const response = extractGameStateData(data);
      if (!response) return;

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, handleApiAction, savePreActionState, transitionToState]);

  const handleSplitHitRequest = useCallback(async () => {
    executeAsyncAction(async () => {
      const data = await handleApiAction(handleSplitHit);

      const response = extractGameStateData(data);
      if (!response) return;

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, handleApiAction, transitionToState]);

  const handleSplitStandRequest = useCallback(async () => {
    executeAsyncAction(async () => {

      const hasHit = state.gameState.player.has_hit || 0;

      if (hasHit === 0) {
        transitionToState("SPLIT_STAND_DOUBLE", state.gameState);
      } else {
        transitionToState("SPLIT_STAND", state.gameState);
      }
    });
  }, [executeAsyncAction, state.gameState, transitionToState]);

  const handleSplitDoubleRequest = useCallback(async () => {
    executeAsyncAction(async () => {

      const data = await handleApiAction(handleSplitDouble);
      const response = extractGameStateData(data);
      if (!response) return;

      transitionToState(response?.target_phase as GameState, response);
    });
  }, [executeAsyncAction, handleApiAction, transitionToState]);

  // --- useEffect blokkok ---
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --- SPECIÁLIS EFFECT: Csak az app indulásakor/inicializálásakor ---
  // --- LOADING ---
  useEffect(() => {
    // 1. Kapuőr: Csak ha LOADING fázisban vagyunk és nem dolgozunk éppen
    if (state.gameState.currentGameState !== "LOADING" || isProcessingRef.current) return;

    // 2. Egyszeri futás védelme
    if (isAppInitializedRef.current) return;
    isAppInitializedRef.current = true;

    isProcessingRef.current = true;
    //console.log("--- INITIALIZING SESSION INDUL ---");

    const initializeApplicationOnLoad = async () => {
      try {
        const minLoadingTimePromise = new Promise((resolve) => setTimeout(resolve, 6000));
        const initializationPromise = handleApiAction(initializeSessionAPI);

        const [initData] = await Promise.all([
          initializationPromise,
          minLoadingTimePromise,
        ]);

        if (!isMountedRef.current) return;

        const { tokens, game_state, total_initial_cards } = initData as SessionInitResponse;
        const nextPhase = game_state.target_phase as GameState;
        dispatch({
          type: 'SET_CONFIG',
          payload: { totalInitialCards: total_initial_cards }
        });

        dispatch({
          type: 'SET_DECK_LEN',
          payload: game_state.deck_len
        });

        // Itt egyetlen hívással lerendezzük az adatot és a fázisváltást is a Reducerben
        transitionToState(nextPhase, { tokens, ...game_state });

        // Ezután a state.gameState.currentGameState megváltozik,
        // és ez az effekt már nem fog újra belépni a legfelső IF miatt.

      } catch (error) {
        console.error("Initialization Error: ", error);
        isProcessingRef.current = false;
        if (isMountedRef.current) transitionToState("ERROR", { tokens: 0, deck_len: 0 });
      }
    };

    initializeApplicationOnLoad();
  }, [state.gameState.currentGameState, transitionToState, handleApiAction]);

  // --- SHUFFLING ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "SHUFFLING" || isProcessingRef.current) return;

    isProcessingRef.current = true;
    //console.log("--- SHUFFLING INDUL ---");

    const shufflingAct = async () => {
      try {
        const data = await handleApiAction(getShuffling);
        const response = extractGameStateData(data);

        if (response) {
          // A setTimeout ID-t elmentjük, hogy törölhessük ha kell
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              const currentDeckLen = response.deck_len ?? state.totalInitialCards;

              dispatch({ type: 'SET_DECK_LEN', payload: currentDeckLen });
              transitionToState(response?.target_phase as GameState, response);
              isProcessingRef.current = false;
            }
          }, 4000);
        }
      } catch {
        if (isMountedRef.current) {
          isProcessingRef.current = false; // Fontos felszabadítani hiba esetén is!
          // A transitionToState("ERROR")-t a handleApiAction már megcsinálta belül!
        }
      }
    };
    shufflingAct();

    // CLEANUP
    return () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };
  }, [handleApiAction, state.gameState.currentGameState, state.totalInitialCards, transitionToState]);

  // --- INIT_GAME ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "INIT_GAME" || isProcessingRef.current) return;

    isProcessingRef.current = true;
    //console.log("--- INIT_GAME BLOKK INDUL ---");

    const initGameAct = async () => {
      try {
        setIsWFSR(true);
        resetGameVariables();

        const currentDeckLen = state.gameState.deck_len;
        dispatch({ type: 'SET_DECK_LEN', payload: currentDeckLen });

        const data = await handleApiAction(startGame);
        const response = extractGameStateData(data);

        if (!response || !isMountedRef.current) {
          isProcessingRef.current = false;
          return;
        }

        transitionToState(response?.pre_phase as GameState, response);
      } catch (error) {
        console.error("Init Game hiba:", error);
        isProcessingRef.current = false;
      } finally {
        if (isMountedRef.current) setIsWFSR(false);
      }
    };

    initGameAct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameState.currentGameState,
    transitionToState,
    handleApiAction,
    resetGameVariables,
    setIsWFSR]);

  // --- MAIN_STAND ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "MAIN_STAND" || isProcessingRef.current) return;

    isProcessingRef.current = true;
    //console.log("--- MAIN_STAND INDUL ---");

    timeoutIdRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        isProcessingRef.current = false;
        transitionToState(state.gameState.pre_phase as GameState, state.gameState);
      }
    }, 4000);

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameState.currentGameState, state.gameState.pre_phase, transitionToState]);

  // --- MAIN_STAND_REWARDS_TRANSIT ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "MAIN_STAND_REWARDS_TRANSIT" || isProcessingRef.current) return;
    isProcessingRef.current = true;
    //console.log("--- MAIN_STAND_REWARDS_TRANSIT INDUL ---");

    const MainStandTransit = async () => {
      try {
        savePreActionState();
        const data = await handleApiAction(handleStandAndRewards);
        const response = extractGameStateData(data);

        if (!response || !isMountedRef.current) {
          isProcessingRef.current = false;
          return;
        }

        transitionToState(response?.target_phase as GameState, response);
      } catch (error) {
        console.error("Transit Error:", error);
        isProcessingRef.current = false;
      }
    };
    MainStandTransit();
  }, [state.gameState.currentGameState, handleApiAction, transitionToState, savePreActionState]);

  // --- SPLIT_STAND and SPLIT_STAND_DOUBLE
  useEffect(() => {
    const isSplitStand = state.gameState.currentGameState === "SPLIT_STAND" ||
      state.gameState.currentGameState === "SPLIT_STAND_DOUBLE";

    // Kapuőr: Ha nem releváns az állapot, vagy már fut egy folyamat, kilépünk
    if (!isSplitStand || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsWFSR(true);
    //console.log(`--- ${state.gameState.currentGameState} LOGIKA INDUL ---`);
    const SplitStand = async () => {
      try {
        if (!isMountedRef.current) return;

        // --- 2. ADATMENTÉS (Stand) ---
        const data = await handleApiAction(addToPlayersListByStand);
        const response = extractGameStateData(data);

        if (!response || !isMountedRef.current) {
          isProcessingRef.current = false;
          return;
        }

        if (response?.split_req === 0) {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState(response?.target_phase as GameState, response);
            }
          }, 2000);
        } else {
          const splitResponse = await handleApiAction(addSplitPlayerToGame);
          const ans = extractGameStateData(splitResponse);

          if (!ans || !isMountedRef.current) {
            isProcessingRef.current = false;
            return;
          }

          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState(ans?.target_phase as GameState, ans);
            }
          }, 2000);
        }
      } catch (error) {
        console.error("SplitStand Sequence Error:", error);
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

    return () => {
      if (timeoutIdRef.current) window.clearTimeout(timeoutIdRef.current);
    };
  }, [state.gameState.currentGameState, transitionToState, handleApiAction]);

  // --- SPLIT_NAT21_TRANSIT ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "SPLIT_NAT21_TRANSIT" || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsWFSR(true);
    //console.log("--- SPLIT_NAT21_TRANSIT INDUL ---");

    const SplitNat21Transit = async () => {
      try {
        transitionToState(state.gameState?.pre_phase as GameState, state.gameState);
      } catch {
        if (isMountedRef.current) {
          transitionToState("ERROR");
        }
      }
    };
    SplitNat21Transit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameState.currentGameState, state.gameState.pre_phase, transitionToState]);

  // --- SPLIT_ACE_TRANSIT ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "SPLIT_ACE_TRANSIT" || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsWFSR(true);
    //console.log("--- SPLIT_ACE_TRANSIT LOGIKA INDUL ---");

    const SplitAce21Transit = async () => {
      if (!isMountedRef.current) return;

      try {
        const data = await handleApiAction(addToPlayersListByStand);
        if (!data || !isMountedRef.current) {
          isProcessingRef.current = false;
          return;
        }

        const response = extractGameStateData(data);

        if (response?.split_req === 0) {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState(response?.target_phase as GameState, response);
            }
          }, 2000);
        } else {
          const splitResponse = await handleApiAction(addSplitPlayerToGame);
          const ans = extractGameStateData(splitResponse);

          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState(ans?.target_phase as GameState, ans);
            }
          }, 2000);
        }
      } catch (error) {
        console.error("Transit Error:", error);
        if (isMountedRef.current) {
          transitionToState("ERROR");
        }
      } finally {
        if (isMountedRef.current) {
          setIsWFSR(false);
        }
      }
    };
    SplitAce21Transit();

    return () => {
      if (timeoutIdRef.current) window.clearTimeout(timeoutIdRef.current);
    };
  }, [handleApiAction, state.gameState.currentGameState, transitionToState]);

  // --- SPLIT_FINISH ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "SPLIT_FINISH" || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsWFSR(true);

    const SplitFinish = async () => {
      try {
        savePreActionState();
        const data = await handleApiAction(handleSplitStandAndRewards);

        if (!isMountedRef.current || !data) {
          isProcessingRef.current = false;
          return;
        }
        const response = extractGameStateData(data);

        if (response) {
          transitionToState(response?.target_phase as GameState, response);
        } else {
          throw new Error("Missing response data");
        }
      } catch (e) {
        console.error("Hiba a SPLIT_FINISH fázisban:", e);
        if (isMountedRef.current) {
          setIsWFSR(false);
          transitionToState("ERROR");
        }
      }
    };
    SplitFinish();
  }, [state.gameState.currentGameState, handleApiAction, savePreActionState, transitionToState]);

  // --- SPLIT_FINISH_OUTCOME ---
  useEffect(() => {
    if (state.gameState.currentGameState !== "SPLIT_FINISH_OUTCOME") return;

    const SplitFinishTransit = async () => {
      if (!isMountedRef.current || isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const { players, tokens, deck_len, pre_phase } = state.gameState;
        if (players && Object.keys(players).length === 0) {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              // Létrehozzuk a tiszta állapotot a váltáshoz
              const nullState = {
                ...initialGameDataState.gameState,
                tokens: tokens,           // Megtartjuk a friss egyenleget
                deck_len: deck_len,       // Megtartjuk a pakli állapotát
                currentGameState: pre_phase || "BETTING",
                bet: 0,
                players: {},
                winner: 0
              };
              //console.log(`>>> SPLIT VÉGE: Váltás ${pre_phase}-re`, tokens);
              transitionToState(pre_phase as GameState, nullState);
            }
          }, 4000);
        } else {
          const data = await handleApiAction(addPlayerFromPlayers);
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);

            timeoutIdRef.current = window.setTimeout(() => {
              if (isMountedRef.current) {
                setIsWFSR(false);
                //transitionToState("SPLIT_FINISH", response);
                transitionToState(response?.target_phase as GameState, response);
              }
            }, 4000);
          }
        }
      } catch (e) {
        console.error("Hiba a SPLIT_FINISH_OUTCOME fázisban:", e);
        if (isMountedRef.current) {
          transitionToState("ERROR");
        }
      } finally {
        if (isMountedRef.current) {
          setIsWFSR(false);
        }
      }
    };
    SplitFinishTransit();

    return () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameState.currentGameState, transitionToState]);

  // --- OUT_OF_TOKENS ---
  useEffect(() => {
    if (state.gameState.currentGameState === "OUT_OF_TOKENS" && !isProcessingRef.current) {
      isProcessingRef.current = true;
      setIsWFSR(true);
      const HandleOutOfTokens = async () => {
        if (!isMountedRef.current) return;

        try {
          const data = await handleApiAction(setRestart);
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            if (response) {
              timeoutIdRef.current = window.setTimeout(() => {
                if (isMountedRef.current) {
                  resetGameVariables();
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
    }
  }, [state.gameState.currentGameState, handleApiAction, transitionToState, resetGameVariables]);

  // --- RESTART_GAME ---
  useEffect(() => {
    if (state.gameState.currentGameState === "RESTART_GAME") {
      const RestartGame = async () => {
        if (!isMountedRef.current) return;

        try {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState("RELOADING", state.gameState);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameState.currentGameState, resetGameVariables, transitionToState]);

  // --- ERROR ---
  useEffect(() => {
    if (state.gameState.currentGameState === "ERROR") {
      const ForceRestart = async () => {
        if (!isMountedRef.current) return;

        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (!isMountedRef.current) return;

        setIsWFSR(true);

        try {
          const data = await handleApiAction(forceRestart);
          if (data) {
            if (!isMountedRef.current) return;
            const response = extractGameStateData(data);
            if (response) {
              resetGameVariables();
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
    }
  }, [state.gameState.currentGameState, handleApiAction, transitionToState, resetGameVariables]);

  // --- RELOADING ---
  useEffect(() => {
    if (state.gameState.currentGameState === "RELOADING") {
      const Reloading = async () => {
        if (!isMountedRef.current) return;

        try {
          timeoutIdRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              transitionToState("BETTING", state.gameState);
            }
          }, 5000);
        } catch (error) {
          console.error("Error: ", error);
        }
      };
      Reloading();
    }
  }, [state.gameState, transitionToState]);

  return {
    gameState: state.gameState,
    currentGameState: state.gameState.currentGameState,
    transitionToState,
    handleStartGame,
    handleOnContinue,
    handleOnStartNew,
    handlePlaceBet,
    handleRetakeBet,
    handleHitRequest,
    handleStandRequest,
    handleDoubleRequest,
    handleSplitRequest,
    handleSplitHitRequest,
    handleSplitStandRequest,
    handleSplitDoubleRequest,
    handleInsRequest,
    preRewardBet: state.preRewardBet,
    preRewardTokens: state.preRewardTokens,
    showInsLost: state.showInsLost,
    insPlaced: state.insPlaced,
    initDeckLen: state.initDeckLen,
    isWFSR,
  };
}
