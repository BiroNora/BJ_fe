import "../styles/loading.css";

export function Restart() {
  return (
    <div className="loading-container-centered">
      <h1>W E L L C O M E  B A C K</h1>
      <div className="bank merriweather">Your New Tokens: 1000</div>
      <div className="bank merriweather">
        <span className="grey-suit star-right">&#9733;&#9733;&#9733;</span>
        <span className="red-suit gap-right">♥</span>
        <span className="black-suit gap-right">♠</span>
        <div >Enjoy Your Game</div>
        <span className="black-suit gap-left">♣</span>
        <span className="red-suit gap-left">♦</span>
        <span className="grey-suit star-left">&#9733;&#9733;&#9733;</span>
      </div>
    </div>
  );
}
