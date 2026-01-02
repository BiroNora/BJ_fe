import "../styles/loading.css";

export function Loading() {
  return (
    <div className="loading-container-centered">
      <h1>
        L O A D I N G<span className="dot dot-1">.</span>
        <span className="dot dot-2">.</span>
        <span className="dot dot-3">.</span>
      </h1>
    </div>
  );
}
