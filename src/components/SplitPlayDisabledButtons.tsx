import type { GameStateData } from "../types/game-types";

interface SplitPlayDisabledButtonsProps {
  gameState: GameStateData;
}

const SplitPlayDisabledButtons: React.FC<
  SplitPlayDisabledButtonsProps
> = () => {
  return (
    <div id="play-buttons" className="button-container1">
      <button id="hit-button" disabled={true}>
        Hit
      </button>
      <button id="stand-button" disabled={true}>
        Stand
      </button>
    </div>
  );
};

export default SplitPlayDisabledButtons;
