const sensorValues = [28, 31, 29, 35, 43, 48, 46, 52, 58, 61, 57, 64, 68, 65, 72, 76, 74, 78, 82, 79]
const sensorTimes = ['10:00', '10:05', '10:10', '10:15', '10:20']

function SensorChart() {
  const width = 920
  const height = 310
  const padX = 42
  const padY = 34
  const points = sensorValues
    .map(
      (value, i) =>
        `${padX + i * ((width - padX * 2) / (sensorValues.length - 1))},${height - padY - (value / 100) * (height - padY * 2)}`,
    )
    .join(' ')
  const area = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`

  return (
    <div className="sensor-chart-wrap">
      <svg
        className="sensor-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="최근 20분간 플렉스센서 변화 그래프"
      >
        <defs>
          <linearGradient id="sensorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8ff38" stopOpacity=".22" />
            <stop offset="100%" stopColor="#c8ff38" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - padY - (value / 100) * (height - padY * 2)
          return (
            <g key={value}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} className="grid-line" />
              <text x="4" y={y + 4} className="axis-label">
                {value}
              </text>
            </g>
          )
        })}
        <polygon points={area} fill="url(#sensorArea)" />
        <polyline points={points} fill="none" stroke="#c8ff38" strokeWidth="3" />
        {sensorTimes.map((time, i) => (
          <text
            key={time}
            x={padX + i * ((width - padX * 2) / 4)}
            y={height - 6}
            textAnchor="middle"
            className="axis-label"
          >
            {time}
          </text>
        ))}
        <circle
          cx={width - padX}
          cy={height - padY - (79 / 100) * (height - padY * 2)}
          r="6"
          fill="#c8ff38"
          stroke="#0d0d0d"
          strokeWidth="3"
        />
      </svg>
    </div>
  )
}

export default function App() {
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
          <span className="live-dot" />
          DEMO
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
          <span className="live-dot" />
          <div>
            <b>SENSOR 01</b>
            <small>예시 데이터 · 연결 대기</small>
          </div>
        </div>
      </section>

      <section className="sensor-grid">
        <article className="current-sensor">
          <div className="sensor-card-head">
            <span>CURRENT VALUE</span>
            <b>정상</b>
          </div>
          <div className="sensor-reading">
            <strong>79</strong>
            <span>%</span>
          </div>
          <p>굽힘 정도</p>
          <div className="sensor-meter">
            <span style={{ width: '79%' }} />
          </div>
          <div className="sensor-range">
            <span>0 · FLAT</span>
            <span>100 · BENT</span>
          </div>
        </article>

        <div className="sensor-stats">
          <article>
            <span>평균값</span>
            <strong>
              57.4<small>%</small>
            </strong>
            <em>최근 20분</em>
          </article>
          <article>
            <span>최고값</span>
            <strong>
              82<small>%</small>
            </strong>
            <em>10:18 기록</em>
          </article>
          <article>
            <span>측정 주기</span>
            <strong>
              1<small> sec</small>
            </strong>
            <em>예시 설정</em>
          </article>
        </div>
      </section>

      <section className="panel sensor-panel">
        <div className="panel-head">
          <div>
            <p className="section-no">01 / SENSOR HISTORY</p>
            <h2>시간별 센서 변화</h2>
            <p>최근 20분 예시 데이터 · 굽힘 정도(%)</p>
          </div>
          <div className="time-filter">
            <button className="selected">20분</button>
            <button>1시간</button>
            <button>24시간</button>
          </div>
        </div>
        <SensorChart />
        <div className="sensor-chart-footer">
          <span>
            <i />
            실시간 센서값
          </span>
          <p>
            마지막 업데이트 <b>10:20:00</b>
          </p>
        </div>
      </section>

      <footer>
        <span>FLEX SENSOR</span>
        <p>실시간 센서 모니터링 대시보드</p>
        <p>DEMO DATA</p>
      </footer>
    </main>
  )
}
