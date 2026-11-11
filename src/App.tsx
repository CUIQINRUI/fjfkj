import { useCallback, useEffect, useState } from "react"
import { ConnectionControl } from "./components/ConnectionControl"
import { PowerToggle } from "./components/PowerToggle"
import { ProductHeader } from "./components/ProductHeader"
import { SensorBall } from "./components/SensorBall"
import { SensorChart } from "./components/SensorChart"
import {
  connectSensor,
  disconnectSensor,
  loadPower,
  type Reading,
  type Status,
} from "./lib/device"
import { MAX_POINTS } from "./product"

export default function App() {
  const [status, setStatus] = useState<Status>("disconnected")
  const [power, setPower] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])

  const handleReading = useCallback((reading: Reading) => {
    setReadings((current) => [...current, reading].slice(-MAX_POINTS))
  }, [])

  const handleConnect = useCallback(() => {
    void connectSensor({
      onInit: setReadings,
      onReading: handleReading,
      onStatus: setStatus,
    })
  }, [handleReading])

  const handleDisconnect = useCallback(() => {
    void disconnectSensor().finally(() => setStatus("disconnected"))
  }, [])

  useEffect(() => {
    void loadPower().then(setPower)
    handleConnect()

    return () => {
      void disconnectSensor()
    }
  }, [handleConnect])

  return (
    <main className="app-shell">
      <ProductHeader />
      <SensorBall value={readings.at(-1)?.value} />
      <div className="lower-grid">
        <section className="controls" aria-label="조명 제어">
          <ConnectionControl
            status={status}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <PowerToggle power={power} onChange={setPower} />
        </section>
        <SensorChart readings={readings} />
      </div>
    </main>
  )
}
