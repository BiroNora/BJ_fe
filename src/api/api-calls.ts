import { API_BASE_URL } from "../config/apiConfig";
import type { ErrorResponse, SessionInitResponse } from "../types/game-types";

const runningInitializations = new Map<string, Promise<SessionInitResponse>>();

// Statikus kulcs a futó inicializálási folyamat jelzésére (sik = Session Init Key)
const SESSION_INIT_KEY = '__sik__';
// localStorage számára (cid = Client ID)
const CLIENT_STORAGE_ID_KEY = 'cid';


export async function initializeSessionAPI(): Promise<SessionInitResponse> {
  // 1. 🔑 BLOKKOLÁS ELLENŐRZÉS: Ellenőrizzük, hogy fut-e már inicializálás (__sik__ kulcs).
  const existingPromise = runningInitializations.get(SESSION_INIT_KEY);
  if (existingPromise) {
    //console.warn("[Cache Hit] A session inicializálás már folyamatban van. Várakozás a futó kérésre...");
    return existingPromise;
  }

  // 2. 💡 AZONOSÍTÓ KEZELÉSE A LOCALSTORAGE-BEN (cid kulcs)
  let clientStorageId = localStorage.getItem(CLIENT_STORAGE_ID_KEY);

  if (!clientStorageId) {
    // Ha még nincs mentve, generálunk egy újat és eltároljuk tartósan
    clientStorageId = window.crypto.randomUUID();
    localStorage.setItem(CLIENT_STORAGE_ID_KEY, clientStorageId);
    console.info(`[LocalStorage] Új tartós ID generálva és mentve a ${CLIENT_STORAGE_ID_KEY} kulcs alatt.`);
  }
  //else {
  //  console.info(`[LocalStorage] Meglévő tartós ID betöltve a ${CLIENT_STORAGE_ID_KEY} kulcs alól.`);
  //}

  // A szervernek küldendő azonosító az, amit a localStorage-ban tárolunk
  const idToSend = clientStorageId;

  // 3. KÉSZÍTÉS ÉS CACHELÉS
  const initializationPromise = (async () => {
    const maxRetries = 12; // Összesen kb. 30-40 másodperc (Render cold start ideje)
    const delayBetweenRetries = 5000; // 5 másodperc szünet két próbálkozás között

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await callApiEndpoint<SessionInitResponse>(
          "/api/initialize_session",
          "POST",
          { clientId: idToSend }
        );
      } catch (error) {
        const isLastAttempt = i === maxRetries - 1;

        if (isLastAttempt) {
          console.error("Sikertelen ébresztés minden kísérlet után.");
          throw error;
        }

        console.warn(`Szerver ébresztése folyamatban... (${i + 1}/${maxRetries})`);
        // Várakozás a következő próbálkozás előtt
        await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
      }
    }
    throw new Error("Szerver nem válaszolt az ébresztési időn belül.");
  })();

  // 4. CACHELÉS ÉS VÉGLEGESÍTÉS
  runningInitializations.set(SESSION_INIT_KEY, initializationPromise);

  initializationPromise.finally(() => {
    runningInitializations.delete(SESSION_INIT_KEY);
  });

  // 5. Visszaadjuk a Promise-t.
  return initializationPromise;
}

export async function clearGameState() {
  const data = await callApiEndpoint("/api/clear_game_state", "POST");

  return data;
}

export async function recoverGameState() {
  const data = await callApiEndpoint("/api/recover_game_state", "POST");

  return data;
}

export async function setBet(betAmount: number) {
  const data = await callApiEndpoint("/api/bet", "POST", { bet: betAmount });

  return data;
}

export async function takeBackDeal() {
  const data = await callApiEndpoint("/api/retake_bet", "POST");

  return data;
}

export async function getShuffling() {
  const data = await callApiEndpoint("/api/create_deck", "POST");

  return data;
}

export async function startGame() {
  const data = await callApiEndpoint("/api/start_game", "POST");

  return data;
}

export async function handleHit() {
  const data = await callApiEndpoint("/api/hit", "POST");

  return data;
}

export async function handleRewards() {
  const data = await callApiEndpoint("/api/rewards", "POST");

  return data;
}

export async function handleInsurance() {
  const data = await callApiEndpoint("/api/ins_request", "POST");

  return data;
}

export async function handleDouble() {
  const data = await callApiEndpoint("/api/double_request", "POST");

  return data;
}

export async function handleStandAndRewards() {
  const data = await callApiEndpoint("/api/stand_and_rewards", "POST");

  return data;
}

export async function handleSplitHand() {
  const data = await callApiEndpoint("/api/split_request", "POST");

  return data;
}

export async function handleSplitHit() {
  const data = await callApiEndpoint("/api/split_hit", "POST");

  return data;
}

export async function addSplitPlayerToGame() {
  const data = await callApiEndpoint("/api/add_split_player_to_game", "POST");

  return data;
}

export async function addToPlayersListByStand() {
  const data = await callApiEndpoint(
    "/api/add_to_players_list_by_stand",
    "POST"
  );

  return data;
}

export async function addPlayerFromPlayers() {
  const data = await callApiEndpoint("/api/add_player_from_players", "POST");

  return data;
}

export async function handleSplitDouble() {
  const data = await callApiEndpoint("/api/split_double_request", "POST");

  return data;
}

export async function handleSplitStandAndRewards() {
  const data = await callApiEndpoint(
    "/api/split_stand_and_rewards",
    "POST"
  );

  return data;
}

export async function setRestart() {
  const data = await callApiEndpoint("/api/set_restart", "POST");

  return data;
}

export async function forceRestart() {
  const clientUuid = localStorage.getItem(CLIENT_STORAGE_ID_KEY);
  if (!clientUuid) {
    throw new Error("No id.");
  }

  const data = await callApiEndpoint("/api/force_restart", "POST", {
    clientId: clientUuid,
  });

  return data;
}

export interface HttpError extends Error {
  response?: {
    status: number;
    statusText: string;
    error?: string;
    data?: ErrorResponse; // A szerver válasza (pl. { error: 'No more split hands.' })
  };
}

export async function callApiEndpoint<T>(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // if (import.meta.env.DEV) {
  //     console.log(`🚀 Request to: ${fullUrl} [${method}]`);
  //   }

  const clientId = localStorage.getItem(CLIENT_STORAGE_ID_KEY);

  let finalBody = body;

  if (method.toUpperCase() === "POST") {
    const idempotencyKey = crypto.randomUUID();

    finalBody = {
      ...(body && typeof body === 'object' ? body : {}),
      clientId: clientId,
      idempotencyKey: idempotencyKey
    };
  }

  try {
    const options: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...(clientId ? { "X-Client-Id": clientId } : {}),
      },
      body: finalBody ? JSON.stringify(finalBody) : undefined,
      credentials: 'omit',
    };

    const response = await fetch(fullUrl, options);

    if (response.ok || response.status === 204) {
      if (endpoint !== "/api/initialize_session") {
        sessionStorage.removeItem(`ik_${endpoint}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } else {
      let errorData: ErrorResponse = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: "Ismeretlen API válasz formátum (nem JSON)." };
      }

      const status = response.status;
      const statusText = response.statusText || "Ismeretlen hiba";
      const errorMessage =
        errorData.message || `HTTP hiba! Státusz: ${status} ${statusText}.`;

      if (!(status === 400 && errorData.error === "No more split hands.")) {
        console.error(
          `API hiba a(z) '${endpoint}' végponton (státusz: ${status}):`,
          errorData
        );
      }
      const errorToThrow: HttpError = new Error(errorMessage);
      errorToThrow.response = {
        status: status,
        statusText: statusText,
        data: errorData,
      };
      throw errorToThrow;
    }
  } catch (error: unknown) {
    const isSpecificSplitHandError =
      error instanceof Error &&
      "response" in error &&
      (error as HttpError).response?.status === 400 &&
      (error as HttpError).response?.data?.error === "No more split hands.";

    if (!isSpecificSplitHandError) {
      console.error(
        `Hálózati vagy feldolgozási hiba a(z) '${endpoint}' végponton:`,
        error
      );
    }
    throw error;
  }
}
