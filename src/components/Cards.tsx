import { useEffect, useState } from "react";
import type { GameStateData } from "../types/game-types";

interface CardsProps {
  gameState: GameStateData;
  initDeckLen: number | null;
}

const Cards: React.FC<CardsProps> = ({ gameState, initDeckLen }) => {
  const { deck_len } = gameState;
  const [displayedDeckLen, setDisplayedDeckLen] = useState(deck_len);
  const [tmp, setTmp] = useState(initDeckLen);

  useEffect(() => {
    setDisplayedDeckLen(tmp!);
    if (initDeckLen !== null && initDeckLen > deck_len) {
      const interval = setInterval(() => {
        setDisplayedDeckLen((prevDisplayedLen) => {
          if (prevDisplayedLen <= deck_len) {
            clearInterval(interval);
            setTmp(deck_len);
            return deck_len;
          }
          return prevDisplayedLen - 1;
        });
      }, 400);

      return () => clearInterval(interval);
    } else {
      setDisplayedDeckLen(deck_len);
    }
  }, [deck_len, initDeckLen, tmp]);

  return (
    <div className="cards merriweather" id="cards">
      Cards: {displayedDeckLen}
    </div>
  );
};

export default Cards;
