import "../styles/loading.css";

export function OutOfTokens() {
  return (
    <div className="loading-container-centered">
      <h1>
        O U T of T O K E N S<span className="dot dot-1">.</span>
        <span className="dot dot-2">.</span>
        <span className="dot dot-3">.</span>
      </h1>
      <div className="bank merriweather">Restart in 5 sec</div>
    </div>
  );
}
