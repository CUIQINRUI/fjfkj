import type { Status } from "../lib/device"

const statusCopy: Record<Status, string> = {
  disconnected: "연결 안 됨",
  connecting: "연결 중…",
  connected: "연결됨",
  error: "연결 실패, 다시 시도",
}

type ConnectionControlProps = {
  status: Status
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectionControl({
  status,
  onConnect,
  onDisconnect,
}: ConnectionControlProps) {
  const connected = status === "connected"
  const connecting = status === "connecting"

  return (
    <div className="control-row">
      <div className="control-copy">
        <p className="t-label">센서</p>
        <p className={`control-state t-label ${status}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusCopy[status]}
        </p>
      </div>
      <button
        className={`connection-button t-label${connected ? " disconnect" : ""}`}
        type="button"
        disabled={connecting}
        onClick={connected ? onDisconnect : onConnect}
      >
        {connected ? "연결 끊기" : "센서 연결"}
      </button>
    </div>
  )
}
