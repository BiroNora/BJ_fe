import { motion } from "motion/react";
import { states, type GameStateData } from "../types/game-types";

interface TableProps {
  gameState: GameStateData;
}

const SplitWinner: React.FC<TableProps> = ({ gameState }) => {
  const { dealer_unmasked, winner } = gameState;
  const BJ_DEALER_WON = 3;

  const winners =
    dealer_unmasked.natural_21 === BJ_DEALER_WON
      ? states[BJ_DEALER_WON]
      : states[winner];

  const props = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: {
      duration: 1,
      delay: 0.5,
    },
  };

  return (
    <div className="winners merriweather9black">
      <motion.span {...props}>{winners}</motion.span>
    </div>
  );
};

export default SplitWinner;
