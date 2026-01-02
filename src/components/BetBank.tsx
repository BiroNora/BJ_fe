import type { GameStateData } from "../types/game-types";
import { formatNumber } from "../utilities/utils";
import "../styles/betting.css";

interface BetBankProps {
  gameState: GameStateData;
}

const BetBank: React.FC<BetBankProps> = ({ gameState }) => {
  const { player, tokens } = gameState;
  const currentBet = player.bet;

  return (
    <div className="bank-area-wrapper">
      <div className="bank1 merriweather">Bet:{" "} {formatNumber(currentBet)}</div>
      <div className="bet-bank merriweather">
        Player's bank: {" "}
        <span className="bank-amount">{formatNumber(tokens)}</span>
      </div>
    </div>
  );
};

export default BetBank;
