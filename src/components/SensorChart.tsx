import { useEffect, useRef, useState } from "react"
import type { Reading } from "../lib/device"
import { SENSOR_MAX } from "../product"

type SensorChartProps = {
  readings: Reading[]
}

const HEIGHT = 200
const LEFT = 40
const RIGHT = 8
const TOP = 8
const BOTTOM = 20

export function SensorChart({ readings }: SensorChartProps) {
  const containerRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => setWidth(container.getBoundingClientRect().width)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(0, width - LEFT - RIGHT)
  const plotHeight = HEIGHT - TOP - BOTTOM
  const x = (index: number) =>
    LEFT + (index / Math.max(1, readings.length - 1)) * plotWidth
  const y = (value: number) =>
    TOP +
    plotHeight -
    (Math.min(SENSOR_MAX, Math.max(0, value)) / SENSOR_MAX) * plotHeight
  const points = readings
    .map((reading, index) => `${x(index)},${y(reading.value)}`)
    .join(" ")
  const currentValue = readings.at(-1)?.value
  const ticks = [SENSOR_MAX, Math.round(SENSOR_MAX / 2), 0]

  return (
    <section
      className="chart-section"
      aria-label="실시간 센서값"
      ref={containerRef}
    >
      {readings.length === 0 ? (
        <p className="chart-empty t-body">
          센서를 연결하면 값이 여기에 그려집니다.
        </p>
      ) : (
        <svg
          className="sensor-chart"
          viewBox={`0 0 ${width || 1} ${HEIGHT}`}
          role="img"
          aria-label={`센서값 추이, 현재 ${Math.round(currentValue ?? 0)}`}
        >
          {ticks.map((tick) => {
            const tickY = y(tick)
            return (
              <g key={tick}>
                <line
                  className="chart-grid"
                  x1={LEFT}
                  x2={width - RIGHT}
                  y1={tickY}
                  y2={tickY}
                />
                <text
                  className="chart-label"
                  x={LEFT - 6}
                  y={tickY + 4}
                  textAnchor="end"
                >
                  {tick.toLocaleString("ko-KR")}
                </text>
              </g>
            )
          })}
          <polyline className="chart-line" points={points} />
          <text className="chart-label" x={LEFT} y={HEIGHT - 2}>
            −60s
          </text>
          <text
            className="chart-label"
            x={width - RIGHT}
            y={HEIGHT - 2}
            textAnchor="end"
          >
            지금
          </text>
        </svg>
      )}
    </section>
  )
}
