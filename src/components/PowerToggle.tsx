import { useState } from "react"
import { setLedPower } from "../lib/device"

type PowerToggleProps = {
  power: boolean
  onChange: (power: boolean) => void
}

export function PowerToggle({ power, onChange }: PowerToggleProps) {
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  const togglePower = async () => {
    if (saving) return
    const previous = power
    const next = !power
    onChange(next)
    setError(false)
    setSaving(true)

    const succeeded = await setLedPower(next)
    if (!succeeded) {
      onChange(previous)
      setError(true)
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="control-row">
        <div className="control-copy">
          <p className="t-label">LED 전원</p>
          <p className="control-state t-caption">{power ? "켜짐" : "꺼짐"}</p>
        </div>
        <button
          className="switch"
          type="button"
          role="switch"
          aria-checked={power}
          aria-label="LED 전원"
          disabled={saving}
          onClick={() => void togglePower()}
        >
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
        </button>
      </div>
      {error && (
        <p className="power-error t-caption">전원 변경 실패, 다시 시도</p>
      )}
    </div>
  )
}
