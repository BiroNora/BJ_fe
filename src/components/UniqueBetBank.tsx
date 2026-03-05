import { useEffect, useState } from "react";
import type { GameStateData } from "../types/game-types";
import { formatNumber } from "../utilities/utils";
import { AnimatePresence, motion } from "motion/react";

interface UniqueBetBankProps {
  gameState: GameStateData;
  isResultPhase: boolean; // Új prop, amivel jelezzük a várakozást
  preRewardBet?: number | null;
  preRewardTokens?: number | null;
}

const UniqueBetBank: React.FC<UniqueBetBankProps> = ({
  gameState,
  isResultPhase,
  preRewardBet,
  preRewardTokens,
}) => {
  // Belső állapot a megjelenített értékeknek
  const [displayedBet, setDisplayBet] = useState(gameState.player.bet);
  const [displayedTokens, setDisplayTokens] = useState(gameState.tokens);

  useEffect(() => {
    if (
      isResultPhase &&
      preRewardBet !== undefined &&
      preRewardTokens !== undefined
    ) {
      // 1. Eredmény fázisban először beállítjuk a "snapshot" (régi) értékeket
      setDisplayBet(preRewardBet ?? gameState.player.bet);
      setDisplayTokens(preRewardTokens ?? gameState.tokens);

      // 2. Majd 2 másodperc múlva frissítünk a végsőre
      const timer = setTimeout(() => {
        setDisplayBet(gameState.player.bet);
        setDisplayTokens(gameState.tokens);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // 3. Játék közben (MAIN_TURN stb.) azonnal frissítünk, nincs várakozás
      setDisplayBet(gameState.player.bet);
      setDisplayTokens(gameState.tokens);
    }
  }, [
    gameState.player.bet,
    gameState.tokens,
    isResultPhase,
    preRewardBet,
    preRewardTokens,
  ]);

  const tokensToDisplay =
    displayedTokens !== null ? formatNumber(displayedTokens) : "---";
  const betToDisplay =
    displayedBet !== null ? formatNumber(displayedBet) : "---";

  const fadeProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.4 }, // Egy picit gyorsabb animáció általában profibb érzetet kelt
  };

  return (
    <div className="bank-area-wrapper">
      {/* BET SZEKCIÓ */}
      <div className="bank1 merriweather">
        Bet:{"\u00A0"}
        <div style={{ display: "inline-grid", verticalAlign: "bottom" }}>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={betToDisplay}
              {...fadeProps}
              className="bet-amount"
              style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}
            >
              {betToDisplay}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* BANK SZEKCIÓ */}
      <div className="bet-bank merriweather">
        Player's bank:{"\u00A0"}
        <div
          style={{
            display: "inline-grid",
            verticalAlign: "bottom",
            placeItems: "start",
            width: "5rem",
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={tokensToDisplay}
              {...fadeProps}
              style={{
                gridArea: "1 / 1",
                whiteSpace: "nowrap",
                display: "inline-block", // Biztosítja, hogy legyen kiterjedése
              }}
            >
              {tokensToDisplay}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UniqueBetBank;
