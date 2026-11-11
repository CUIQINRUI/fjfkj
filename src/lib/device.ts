import type { RealtimeChannel } from "@supabase/supabase-js"
import { DEVICE_ID, MAX_POINTS, SENSOR_MAX, SENSOR_MIN } from "../product"
import { db, DEMO_MODE } from "./supabase"

export type Reading = { value: number; created_at: string }
export type Status = "disconnected" | "connecting" | "connected" | "error"

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let demoTimer: ReturnType<typeof setInterval> | null = null
let connectionVersion = 0
let demoPower = true

function demoReading(step: number, createdAt = new Date()): Reading {
  const midpoint = (SENSOR_MAX + SENSOR_MIN) / 2
  const amplitude = (SENSOR_MAX - SENSOR_MIN) * 0.42
  const primaryWave = Math.sin(step / 8)
  const secondaryWave = Math.sin(step / 2.7) * 0.12
  const value = Math.round(midpoint + amplitude * (primaryWave + secondaryWave))

  return {
    value: Math.min(SENSOR_MAX, Math.max(SENSOR_MIN, value)),
    created_at: createdAt.toISOString(),
  }
}

export async function connectSensor({
  onInit,
  onReading,
  onStatus,
}: ConnectOptions): Promise<void> {
  await disconnectSensor()
  const version = ++connectionVersion
  onStatus("connecting")

  if (DEMO_MODE) {
    const now = Date.now()
    const initial = Array.from({ length: MAX_POINTS }, (_, index) =>
      demoReading(index, new Date(now - (MAX_POINTS - index) * 500)),
    )

    onInit(initial)
    onStatus("connected")

    let step = MAX_POINTS
    demoTimer = setInterval(() => {
      if (version !== connectionVersion) return
      onReading(demoReading(step))
      step += 1
    }, 500)
    return
  }

  if (!db) {
    onStatus("error")
    return
  }

  const { data, error } = await db
    .from("sensor_readings")
    .select("value, created_at")
    .eq("device_id", DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(MAX_POINTS)

  if (version !== connectionVersion) return
  if (error) {
    onStatus("error")
    return
  }

  onInit((data as Reading[]).reverse())

  channel = db
    .channel(`sensor-${DEVICE_ID}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sensor_readings",
        filter: `device_id=eq.${DEVICE_ID}`,
      },
      (payload) => onReading(payload.new as Reading),
    )
    .subscribe((subscriptionStatus) => {
      if (version !== connectionVersion) return
      if (subscriptionStatus === "SUBSCRIBED") onStatus("connected")
      if (
        subscriptionStatus === "CHANNEL_ERROR" ||
        subscriptionStatus === "TIMED_OUT"
      ) {
        onStatus("error")
      }
    })
}

export async function disconnectSensor(): Promise<void> {
  connectionVersion += 1

  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }

  if (channel && db) {
    await db.removeChannel(channel)
    channel = null
  }
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (DEMO_MODE) {
    demoPower = on
    return true
  }

  if (!db) return false
  const { error } = await db
    .from("device_state")
    .update({ led_on: on, updated_at: new Date().toISOString() })
    .eq("device_id", DEVICE_ID)

  return !error
}

export async function loadPower(): Promise<boolean> {
  if (DEMO_MODE) return demoPower
  if (!db) return false

  const { data, error } = await db
    .from("device_state")
    .select("led_on")
    .eq("device_id", DEVICE_ID)
    .maybeSingle()

  return error ? false : Boolean(data?.led_on)
}
