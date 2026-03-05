import { useEffect, useRef, useState } from "react";
import type { GameStateData } from "../types/game-types";

interface RecoveryDecProps {
  gameState: GameStateData;
  onContinue: () => void;
  onStartNew: () => void;
  isWFSR: boolean;
}

const RecoveryDec: React.FC<RecoveryDecProps> = ({
  onContinue,
  onStartNew,
  isWFSR,
}) => {
  const [showButtons, setShowButtons] = useState(false);
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutIdRef.current = window.setTimeout(() => {
      setShowButtons(true);
    }, 1000);

    return () => {
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="player-dealer-area">
        <div className="status-message-box merriweather">
          You have an unfinished game. Want to pick up where you left off?
        </div>
        <div
          id="play-buttons"
          className={`button-container1 ${showButtons ? "show-buttons" : ""}`}
        >
          <button id="cont-button" onClick={onContinue} disabled={isWFSR}>
            {isWFSR ? "Loading..." : "Continue"}
          </button>
          <button id="new-button" onClick={onStartNew} disabled={isWFSR}>
            {isWFSR ? "Loading..." : "New Game"}
          </button>
        </div>
      </div>
    </>
  );
};
export default RecoveryDec;
