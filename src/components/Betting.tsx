import type { GameStateData } from "../types/game-types";
import "../styles/betting.css";
import { formatNumber } from "../utilities/utils";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface BettingProps {
  gameState: GameStateData;
  onPlaceBet: (amount: number) => void;
  retakeBet: () => void;
  onStartGame: () => void;
  isWFSR: boolean;
}

const Betting: React.FC<BettingProps> = ({
  gameState,
  onPlaceBet,
  retakeBet,
  onStartGame,
  isWFSR,
}) => {
  const { tokens, bet } = gameState;

  const [showButtons, setShowButtons] = useState(false);
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutIdRef.current = window.setTimeout(() => {
      setShowButtons(true);
    }, 1000); // 1000 ms = 1 másodperc késleltetés

    return () => {
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  const betAmounts = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000];

  const handleAllIn = () => {
    onPlaceBet(tokens);
  };

  const isDisabled = bet === 0;

  const variants = {
    enabled: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.7,
      },
    },
    disabledByUser: {
      opacity: 0.7, // Alapértelmezett letiltott állapot
      scale: 1,
      transition: {
        duration: 0.7,
      },
    },
    disabledByServer: {
      opacity: 0.7, // Vagy 1, ha a gombnak aktívnak kell kinéznie
      scale: 1,
      transition: {
        duration: 0.3,
      },
    },
  };
  const textVariants = {
    disabled: {
      opacity: 0.4,
      scale: 1,
      transition: {
        duration: 1,
      },
    },
    enabled: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1,
      },
    },
  };

  const fadeProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.8 }, // Egy picit gyorsabb animáció általában profibb érzetet kelt
  };

  return (
    <div className="betting-screen-container">
      <motion.button
        id="start-button"
        onClick={onStartGame}
        disabled={isDisabled || isWFSR}
        variants={variants}
        animate={isDisabled || isWFSR ? "disabled" : "enabled"}
        transition={isWFSR ? { duration: 0.3 } : undefined}
      >
        <motion.span variants={textVariants}>Start Game</motion.span>
      </motion.button>

      <div id="deal-bank" className="deal-bank">
        <motion.button
          id="deal-button"
          onClick={() => retakeBet()}
          disabled={isDisabled || isWFSR}
          variants={variants}
          animate={isDisabled || isWFSR ? "disabled" : "enabled"}
          transition={isWFSR ? { duration: 0.3 } : undefined}
        >
          <motion.span variants={textVariants}>
            Bet: {"  " + formatNumber(bet)}
          </motion.span>
        </motion.button>
      </div>

      {/* BANK SZEKCIÓ */}
      <div className="bank merriweather">
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
              key={formatNumber(tokens)}
              {...fadeProps}
              style={{
                gridArea: "1 / 1",
                whiteSpace: "nowrap",
                display: "inline-block", // Biztosítja, hogy legyen kiterjedése
              }}
            > {"\u00A0"}
              {formatNumber(tokens)}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div
        id="chips"
        className={`button-container ${showButtons ? "show-buttons" : ""}`}
      >
        <motion.button
          id="all-in"
          type="button"
          onClick={handleAllIn}
          variants={variants}
          disabled={tokens === 0 || isWFSR}
          animate={
            tokens === 0
              ? "disabledByUser"
              : isWFSR
              ? "disabledByServer"
              : "enabled"
          }
          transition={isWFSR ? { duration: 0.3 } : undefined}
        >
          All In
        </motion.button>

        {betAmounts.map((amount) => (
          <motion.button
            key={amount}
            id={String(amount)}
            type="button"
            data-bet={amount}
            onClick={() => onPlaceBet(amount)}
            variants={variants}
            disabled={tokens < amount || isWFSR}
            animate={
              tokens < amount
                ? "disabledByUser"
                : isWFSR
                ? "disabledByServer"
                : "enabled"
            }
            transition={isWFSR ? { duration: 0.3 } : undefined}
          >
            {formatNumber(amount)}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Betting;
