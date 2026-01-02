import { useEffect, useRef, useState } from "react";
import type { GameStateData } from "../types/game-types";

interface SplitPlayButtonsProps {
  gameState: GameStateData;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
  hitCounter: number | null;
  hasOver21: boolean;
  isWFSR: boolean;
}

const SplitPlayButtons: React.FC<SplitPlayButtonsProps> = ({
  gameState,
  onHit,
  onStand,
  onDouble,
  onSplit,
  hitCounter,
  hasOver21,
  isWFSR,
}) => {
  const { tokens, bet, player, players } = gameState;
  const canDouble = tokens >= bet && hitCounter === null;
  const canSplit =
    player.hand.length == 2 && player.can_split && tokens >= bet && hitCounter === null;
  const playersLength = Object.keys(players).length < 3 ? true : false;
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

  const handleAnyButtonClick = (actionHandler: () => void) => {
    if (!hasOver21) {
      actionHandler();
    }
  };

  return (
    <div
      id="play-buttons"
      className={`button-container1 ${showButtons ? "show-buttons" : ""}`}
    >
      <button
        id="hit-button"
        onClick={() => handleAnyButtonClick(() => onHit())}
        disabled={hasOver21 || isWFSR}
      >
        Hit
      </button>
      <button
        id="stand-button"
        onClick={() => handleAnyButtonClick(onStand)}
        disabled={hasOver21 || isWFSR}
      >
        Stand
      </button>

      {canDouble && hitCounter === null && (
        <button
          id="double-button"
          onClick={() => handleAnyButtonClick(onDouble)}
          disabled={hasOver21 || isWFSR}
        >
          Double
        </button>
      )}

      {canSplit && playersLength && (
        <button
          id="split-button"
          onClick={() => handleAnyButtonClick(onSplit)}
          disabled={hasOver21 || isWFSR}
        >
          Split
        </button>
      )}
    </div>
  );
};

export default SplitPlayButtons;
