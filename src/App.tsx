import BetBank from "./components/BetBank";
import BetBankDelayed from "./components/BetBankDelayed";
import Cards from "./components/Cards";
import { ErrorPage } from "./components/ErrorPage";
import HeaderTitles from "./components/HeaderTitles";
import { Loading } from "./components/Loading";
import { OutOfTokens } from "./components/OutOfTokens";
import PlayButtons from "./components/PlayButtons";
import PlayerDealer from "./components/PlayerDealer";
import PlayerDealerMasked from "./components/PlayerDealerMasked";
import { Restart } from "./components/RestartGame";
import { Shuffling } from "./components/Shuffling";
import SplitPlayButtons from "./components/SplitPlayButtons";
import SplitPlayDisabledButtons from "./components/SplitPlayDisabledButtons";
import SplitPlayDoubleDisabledButtons from "./components/SplitPlayDoubleDisabledButtons";
import SplitPlayers from "./components/SplitPlayers";
import SplitWinner from "./components/SplitWinner";
import Winner from "./components/Winner";
import { useGameStateMachine } from "./hooks/useGameStateMachine";
import Betting from "./components/Betting";
import { AnimatePresence, motion } from "motion/react";
import SplitPlayerDealerMasked from "./components/SplitPlayerDealerMasked";
import { Reloading } from "./components/Reloading";

function App() {
  const {
    gameState,
    handlePlaceBet,
    handleRetakeBet,
    handleStartGame,
    handleHitRequest,
    handleStandRequest,
    handleDoubleRequest,
    handleSplitRequest,
    handleSplitHitRequest,
    handleSplitStandRequest,
    handleSplitDoubleRequest,
    handleInsRequest,
    preRewardBet,
    preRewardTokens,
    insPlaced,
    hasHitTurn,
    showInsLost,
    hasOver21,
    isSplitted,
    hitCounter,
    initDeckLen,
    isWFSR,
  } = useGameStateMachine();

  function PageWrapper({ children }: React.PropsWithChildren<object>) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <>
      <HeaderTitles />
      <AnimatePresence mode="wait">
        {(() => {
          switch (gameState.currentGameState) {
            case "LOADING":
              return (
                <div>
                  <PageWrapper>
                    <Loading />
                  </PageWrapper>
                </div>
              );
            case "SHUFFLING":
              return (
                <div>
                  <PageWrapper>
                    <Shuffling />
                  </PageWrapper>
                </div>
              );
            case "INIT_GAME":
              return <div></div>;
            case "BETTING":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <Betting
                    gameState={gameState}
                    onPlaceBet={handlePlaceBet}
                    retakeBet={handleRetakeBet}
                    onStartGame={handleStartGame}
                    isWFSR={isWFSR}
                  />
                </div>
              );
            case "MAIN_TURN":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealerMasked
                      gameState={gameState}
                      insMessage={showInsLost}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    <PlayButtons
                      gameState={gameState}
                      onHit={handleHitRequest}
                      onStand={handleStandRequest}
                      onDouble={handleDoubleRequest}
                      onSplit={handleSplitRequest}
                      onInsurance={handleInsRequest}
                      insPlaced={insPlaced}
                      hasHitTurn={hasHitTurn}
                      hasOver21={hasOver21}
                      isWFSR={isWFSR}
                    />
                  </div>
                  <BetBank gameState={gameState} />
                </div>
              );
            case "MAIN_STAND":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealer
                      gameState={gameState}
                      isSplitted={isSplitted}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    <Winner gameState={gameState} />
                  </div>
                  <BetBankDelayed
                    finalGameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    initialBet={preRewardBet}
                    initialTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                  />
                </div>
              );
            case "MAIN_STAND_REWARDS_TRANSIT":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealerMasked
                      gameState={gameState}
                      insMessage={showInsLost}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    {/* <Winner gameState={gameState} /> */}
                  </div>
                  <BetBankDelayed
                    finalGameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    initialBet={preRewardBet}
                    initialTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                  />
                </div>
              );
            case "SPLIT_TURN":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayButtons
                      gameState={gameState}
                      onHit={handleSplitHitRequest}
                      onStand={handleSplitStandRequest}
                      onSplit={handleSplitRequest}
                      onDouble={handleSplitDoubleRequest}
                      hitCounter={hitCounter}
                      hasOver21={hasOver21}
                      isWFSR={isWFSR}
                    />
                  </div>
                  <BetBank gameState={gameState} />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_STAND":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDisabledButtons gameState={gameState} />
                  </div>
                  <BetBank gameState={gameState} />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_STAND_DOUBLE":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDoubleDisabledButtons
                      gameState={gameState}
                      hitCounter={hitCounter}
                    />
                  </div>
                  <BetBank gameState={gameState} />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_NAT21_TRANSIT":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDisabledButtons gameState={gameState} />
                  </div>
                  <BetBank gameState={gameState} />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_FINISH":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealer
                      gameState={gameState}
                      isSplitted={isSplitted}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    {/* <SplitWinner gameState={gameState} /> */}
                  </div>
                  <BetBankDelayed
                    finalGameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    initialBet={preRewardBet}
                    initialTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_FINISH_OUTCOME":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealer
                      gameState={gameState}
                      isSplitted={isSplitted}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitWinner gameState={gameState} />
                  </div>
                  <BetBankDelayed
                    finalGameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    initialBet={preRewardBet}
                    initialTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_ACE_TRANSIT":
              return (
                <div>
                  <Cards gameState={gameState} initDeckLen={initDeckLen} />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDisabledButtons gameState={gameState} />
                  </div>
                  <BetBank gameState={gameState} />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "OUT_OF_TOKENS":
              return (
                <div>
                  <PageWrapper>
                    <OutOfTokens />
                  </PageWrapper>
                </div>
              );
            case "RESTART_GAME":
              return (
                <div>
                  <PageWrapper>
                    <Restart />
                  </PageWrapper>
                </div>
              );
            case "ERROR":
              return (
                <div>
                  <PageWrapper>
                    <ErrorPage />
                  </PageWrapper>
                </div>
              );
            case "RELOADING":
              return (
                <div>
                  <PageWrapper>
                    <Reloading />
                  </PageWrapper>
                </div>
              );
            default:
              return (
                <div>
                  <PageWrapper>
                    <ErrorPage />
                  </PageWrapper>
                </div>
              );
          }
        })()}
      </AnimatePresence>
    </>
  );
}

export default App;
