import { motion } from "motion/react";
import { states, type GameStateData } from "../types/game-types";

interface TableProps {
  gameState: GameStateData;
}

const Winner: React.FC<TableProps> = ({ gameState }) => {
  const { dealer_unmasked, winner } = gameState;

  const nat21 = dealer_unmasked.natural_21;
  const state = states[winner];
  const winners = nat21 !== 0 ? states[nat21] : state;

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

export default Winner;
