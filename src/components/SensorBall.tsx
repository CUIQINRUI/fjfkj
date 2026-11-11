import { useEffect, useRef } from "react"
import { SENSOR_MAX, SENSOR_MIN } from "../product"

type SensorBallProps = {
  value?: number
}

export function SensorBall({ value }: SensorBallProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const levelRef = useRef(0)
  const hasValueRef = useRef(value !== undefined)
  const rawLevel =
    value === undefined ? 0 : (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)
  const level = Math.min(1, Math.max(0, rawLevel))
  const formattedValue =
    value === undefined ? "—" : Math.round(value).toLocaleString("ko-KR")

  useEffect(() => {
    levelRef.current = level
    hasValueRef.current = value !== undefined
  }, [level, value])

  useEffect(() => {
    const ball = ballRef.current
    const stage = stageRef.current
    if (!ball || !stage) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const gravity = 1480
    let position = 0
    let velocity = 0
    let smoothedHeight = 0
    let compression = 0
    let previousTime = performance.now()
    let frameId = 0

    const animate = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, 0.032)
      previousTime = time

      const availableHeight = Math.max(
        0,
        stage.clientHeight - ball.offsetHeight - 16,
      )
      const targetHeight = hasValueRef.current
        ? 20 + levelRef.current * availableHeight * 0.82
        : 0
      const smoothing = 1 - Math.exp(-elapsed * 3.2)
      smoothedHeight += (targetHeight - smoothedHeight) * smoothing

      if (reducedMotion.matches) {
        position = smoothedHeight
        velocity = 0
        compression = 0
      } else if (!hasValueRef.current) {
        position = 0
        velocity = 0
        compression = 0
      } else {
        if (position === 0 && velocity === 0) {
          velocity = Math.sqrt(2 * gravity * Math.max(12, smoothedHeight))
        }

        velocity -= gravity * elapsed
        position += velocity * elapsed

        if (position <= 0 && velocity < 0) {
          position = 0
          compression = Math.min(1, Math.abs(velocity) / 760)
          velocity = Math.sqrt(2 * gravity * Math.max(12, smoothedHeight))
        }

        compression *= Math.exp(-elapsed * 22)
      }

      const scaleX = 1 + compression * 0.12
      const scaleY = 1 - compression * 0.14
      ball.style.transform = `translate3d(-50%, ${-position}px, 0) scale(${scaleX}, ${scaleY})`
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <section className="ball-section" aria-label="센서 공 상태">
      <div
        className="ball-stage"
        ref={stageRef}
        role="img"
        aria-label={
          value === undefined
            ? "센서값을 기다리는 공"
            : `센서값 ${Math.round(value)}, 점프 높이 ${Math.round(level * 100)}%`
        }
      >
        <div className="sensor-ball" ref={ballRef} aria-hidden="true" />
      </div>
      <p className="sensor-value t-value">
        {formattedValue}
        <span className="sensor-unit t-caption">센서값</span>
      </p>
    </section>
  )
}
