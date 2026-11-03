import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const MAX_SAMPLES = 100

type ReadingRow = {
  id?: number | string
  value: number | string
  created_at?: string | null
}

type Sample = { id?: string; value: number; timestamp: number }

let supabaseClient: ReturnType<typeof createClient> | null = null

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('ko-KR', { hour12: false })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('환경 변수 VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY를 .env에서 찾을 수 없습니다.')
  }
  supabaseClient ??= createClient(url, anonKey)
  return supabaseClient
}

function toSample(row: ReadingRow): Sample | null {
  const value = Number(row.value)
  if (!Number.isFinite(value)) return null
  const parsedTimestamp = row.created_at ? Date.parse(row.created_at) : Date.now()
  return {
    ...(row.id === undefined ? {} : { id: String(row.id) }),
    value,
    timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now(),
  }
}

function mergeSamples(...groups: Sample[][]) {
  const unique = new Map<string, Sample>()
  for (const sample of groups.flat()) {
    const key = sample.id ?? `${sample.timestamp}:${sample.value}`
    unique.set(key, sample)
  }
  return [...unique.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_SAMPLES)
}

function SensorChart({ samples }: { samples: Sample[] }) {
  const width = 920
  const height = 310
  const padX = 42
  const padY = 34
  const values = samples.map((sample) => sample.value)
  const minValue = values.length ? Math.min(...values) : 0
  const maxValue = values.length ? Math.max(...values) : 100
  const padding = values.length
    ? maxValue === minValue
      ? Math.max(Math.abs(maxValue) * 0.1, 1)
      : (maxValue - minValue) * 0.1
    : 0
  const chartMin = minValue - padding
  const chartMax = maxValue + padding
  const valueRange = chartMax - chartMin || 1
  const xFor = (index: number) => padX + index * ((width - padX * 2) / Math.max(values.length - 1, 1))
  const yFor = (value: number) => height - padY - ((value - chartMin) / valueRange) * (height - padY * 2)
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ')
  const area = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`
  const ticks = Array.from({ length: 5 }, (_, index) => chartMax - (valueRange * index) / 4)
  const timeLabels =
    samples.length > 0
      ? [samples[0], samples[Math.floor((samples.length - 1) / 2)], samples[samples.length - 1]]
      : []
  const timePositions = [padX, (width - padX * 2) / 2 + padX, width - padX]

  return (
    <div className="sensor-chart-wrap">
      <svg
        className="sensor-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Supabase 최근 ${samples.length}개 센서값 그래프`}
      >
        <defs>
          <linearGradient id="sensorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8ff38" stopOpacity=".22" />
            <stop offset="100%" stopColor="#c8ff38" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((value) => {
          const y = yFor(value)
          return (
            <g key={value}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} className="grid-line" />
              <text x="4" y={y + 4} className="axis-label">
                {formatValue(value)}
              </text>
            </g>
          )
        })}
        <polygon points={area} fill="url(#sensorArea)" />
        <polyline points={points} fill="none" stroke="#c8ff38" strokeWidth="3" />
        {timeLabels.map((sample, index) => (
          <text
            key={`${sample.timestamp}-${index}`}
            x={timePositions[index]}
            y={height - 6}
            textAnchor="middle"
            className="axis-label"
          >
            {formatTime(sample.timestamp)}
          </text>
        ))}
        {values.length > 0 && (
          <circle
            cx={xFor(values.length - 1)}
            cy={yFor(values[values.length - 1])}
            r="6"
            fill="#c8ff38"
            stroke="#0d0d0d"
            strokeWidth="3"
          />
        )}
      </svg>
    </div>
  )
}

export default function App() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [databaseError, setDatabaseError] = useState('')
  const currentSample = samples.at(-1)
  const isConnected = connectionStatus === 'connected'
  const currentValue = currentSample?.value
  const average = samples.length
    ? samples.reduce((sum, sample) => sum + sample.value, 0) / samples.length
    : null
  const highest = samples.length ? Math.max(...samples.map((sample) => sample.value)) : null

  useEffect(() => {
    let active = true
    const realtimeSamples: Sample[] = []
    let client
    try {
      client = getSupabaseClient()
    } catch (error) {
      setConnectionStatus('error')
      setDatabaseError(`Supabase 설정 오류: ${errorMessage(error)}`)
      return
    }

    const channel = client
      .channel('readings-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, (payload) => {
        const sample = toSample(payload.new as ReadingRow)
        if (!sample || !active) return
        realtimeSamples.push(sample)
        setSamples((previous) => mergeSamples(previous, [sample]))
        setConnectionStatus('connected')
        setDatabaseError('')
      })
      .subscribe((status, error) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          setDatabaseError('')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error')
          setDatabaseError(
            error?.message ??
              `Realtime 구독 실패 (${status}). Supabase에서 readings 테이블의 Realtime 활성화를 확인해 주세요.`,
          )
        } else if (status === 'CLOSED') {
          setConnectionStatus('error')
          setDatabaseError('Supabase Realtime 연결이 종료되었습니다.')
        }
      })

    const loadLatest = async () => {
      const { data, error } = await client
        .from('readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_SAMPLES)

      if (!active) return
      if (error) {
        setConnectionStatus('error')
        setDatabaseError(`readings 조회 실패: ${error.message}`)
        return
      }

      const initialSamples = (data as ReadingRow[])
        .map(toSample)
        .filter((sample): sample is Sample => sample !== null)
        .reverse()
      setSamples(mergeSamples(initialSamples, realtimeSamples))
    }

    void loadLatest().catch((error: unknown) => {
      if (!active) return
      setConnectionStatus('error')
      setDatabaseError(`readings 조회 실패: ${errorMessage(error)}`)
    })

    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [])

  return (
    <main>
      <header>
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>
            FLEX
            <br />
            MONITOR
          </span>
        </div>
        <div className="header-meta">
          <span>플렉스센서 모니터링</span>
          <span className={`live-dot${isConnected ? '' : ' offline'}`} />
          {isConnected ? 'LIVE' : connectionStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
        </div>
      </header>

      <section className="sensor-hero">
        <div>
          <p className="eyebrow">FLEX SENSOR / LIVE MONITOR</p>
          <h1>
            플렉스센서
            <br />
            <span>모니터링.</span>
          </h1>
        </div>
        <div className="device-status">
          <span className={`live-dot${isConnected ? '' : ' offline'}`} />
          <div>
            <b>SUPABASE / READINGS</b>
            <small>
              {connectionStatus === 'connected'
                ? 'Realtime 구독 중'
                : connectionStatus === 'connecting'
                  ? '최신 센서 데이터 연결 중'
                  : '연결 오류'}
            </small>
          </div>
        </div>
      </section>

      {databaseError && (
        <p className="database-error" role="alert">
          {databaseError}
        </p>
      )}

      <section className="sensor-grid">
        <article className="current-sensor">
          <div className="sensor-card-head">
            <span>CURRENT VALUE</span>
            <b>{isConnected ? '실시간' : 'SUPABASE'}</b>
          </div>
          <div className="sensor-reading">
            <strong>{currentValue === undefined ? '—' : formatValue(currentValue)}</strong>
          </div>
          <p>Supabase 최신 센서값</p>
          <div className="sensor-range">
            <span>{samples.length} / {MAX_SAMPLES}개 측정값</span>
            <span>최근 순</span>
          </div>
        </article>

        <div className="sensor-stats">
          <article>
            <span>평균값</span>
            <strong>
              {average === null ? '—' : formatValue(average)}
            </strong>
            <em>{samples.length ? `최근 ${samples.length}개` : '데이터 대기 중'}</em>
          </article>
          <article>
            <span>최고값</span>
            <strong>
              {highest === null ? '—' : formatValue(highest)}
            </strong>
            <em>{currentSample ? formatTime(currentSample.timestamp) : '데이터 대기 중'}</em>
          </article>
          <article>
            <span>측정 데이터</span>
            <strong>
              {samples.length}
              <small>개</small>
            </strong>
            <em>최근 최대 {MAX_SAMPLES}개</em>
          </article>
        </div>
      </section>

      <section className="panel sensor-panel">
        <div className="panel-head">
          <div>
            <p className="section-no">01 / SENSOR HISTORY</p>
            <h2>시간별 센서 변화</h2>
            <p>Supabase readings 테이블 · 최근 {MAX_SAMPLES}개 값</p>
          </div>
          <div className="sample-count">{samples.length} / {MAX_SAMPLES} SAMPLES</div>
        </div>
        <SensorChart samples={samples} />
        <div className="sensor-chart-footer">
          <span>
            <i />
            {isConnected ? '실시간 Supabase 센서값' : 'Supabase 센서값'}
          </span>
          <p>
            {currentSample ? `마지막 업데이트 ${formatTime(currentSample.timestamp)}` : '센서 데이터 대기 중'}
          </p>
        </div>
      </section>

      <footer>
        <span>FLEX SENSOR</span>
        <p>실시간 센서 모니터링 대시보드</p>
        <p>SUPABASE REALTIME</p>
      </footer>
    </main>
  )
}
