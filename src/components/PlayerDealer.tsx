import React, { type JSX } from "react";
import { states, type GameStateData } from "../types/game-types";
import "../styles/playerDealer.css";

interface TableProps {
  gameState: GameStateData;
  isSplitted: boolean;
}

const PlayerDealer: React.FC<TableProps> = ({ gameState }) => {
  if (!gameState || !gameState.player || !gameState.dealer_unmasked) {
    return null;
  }
  const { player, dealer_unmasked } = gameState;

  const formatCard = (card: string): JSX.Element | string => {
    const suit = card[0]; // Az első karakter a szín
    const value = card.substring(1).trim(); // A többi karakter az érték

    let suitClass = "";
    if (suit === "♥" || suit === "♦") {
      suitClass = "red-suit";
    } else if (suit === "♠" || suit === "♣") {
      suitClass = "black-suit";
    } else {
      return card; // Visszaadja a nyers stringet, ha nem felismerhető a szín
    }

    return (
      <React.Fragment>
        <span className={suitClass}>{suit}</span>
        <span className="merriweatherblack">{value}</span>
      </React.Fragment>
    );
  };

  const formatHand = (cardStrings: string[]): JSX.Element[] => {
    const formattedElements = cardStrings.map((cardString, index) => {
      const separator =
        index > 0 ? (
          <span
            key={`hand-sep-${index}`}
            className="equal-text1 merriweather5grey"
          >
            {" "}
            +{" "}
          </span>
        ) : null;

      return (
        <React.Fragment key={cardString + index}>
          {separator} {formatCard(cardString)}{" "}
        </React.Fragment>
      );
    });

    return formattedElements;
  };

  const loop = (data: string[]): string[] => {
    return data.map((card) => String(card).trim());
  };

  const p_state = states[player.hand_state];
  const d_state = !dealer_unmasked.hand_state ? (
    <span className="opacity-0"> &nbsp;&nbsp; </span>
  ) : (
    states[dealer_unmasked.hand_state]
  );

  const playerHand = loop(player.hand);
  const dealerHand = loop(dealer_unmasked.hand);

  const formattedPlayerHand = formatHand(playerHand);
  const formattedDealerHand =
    dealerHand.length === 0 ? (
      <span className="opacity-0"> &nbsp;&nbsp; </span>
    ) : (
      formatHand(dealerHand)
    );

  const sum =
    dealer_unmasked.sum === 0 ? (
      <span className="opacity-0"> &nbsp; </span>
    ) : (
      dealer_unmasked.sum
    );

  return (
    <div className="player-dealer-area">
      <div id="dealer-hand" className="play">
        <div className="hand hand-area-wrapper">{formattedDealerHand}</div>
        <div className="score-area-wrapper">
          <span className="score-mood merriweather5grey2">{d_state}</span>
        </div>
        <div className="band-area-wrapper">
          <span className="label-text">Dealer: </span>
          <span className="label-text1">{sum}</span>
        </div>
      </div>
      <div id="player-hand" className="play">
        <div className="band-area-wrapper">
          <span className="label-text">Player: </span>
          <span className="label-text1">{player.sum}</span>
        </div>
        <div className="score-area-wrapper">
          <span className="score-mood merriweather5grey">{p_state}</span>
        </div>
        <div className="hand hand-area-wrapper">{formattedPlayerHand}</div>
      </div>
    </div>
  );
};

export default PlayerDealer;
