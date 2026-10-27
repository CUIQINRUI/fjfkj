import { useMemo, useState } from 'react'

const years = [2021, 2022, 2023, 2024, 2025]
const regionData: Record<string, number[]> = {
  아시아: [582822, 2117514, 8785391, 13604216, 15772507],
  북아메리카: [281404, 704692, 1377635, 1674804, 1864534],
  유럽: [152670, 419342, 945060, 1172109, 1348324],
  오세아니아: [5879, 83370, 243757, 292737, 318535],
  남아메리카: [8574, 32393, 87575, 148101, 199002],
  아프리카: [12978, 31696, 60042, 74682, 80363],
}
const portData: Record<string, number[]> = {
  인천공항: [1742960, 8266472, 26129713, 33501380, 35095017],
  김해공항: [10742, 612881, 3538919, 4878072, 5673872],
  김포공항: [8923, 189179, 1655333, 2037554, 2292848],
  제주: [1240, 48105, 612679, 1253722, 1553252],
  부산: [135408, 144587, 659524, 817968, 1028343],
  청주: [12, 1711, 268717, 766704, 1013600],
}
const totals = [2242365, 9699030, 34168188, 45815006, 49291602]
const koreans = [1197820, 6309021, 22667305, 28846803, 29706888]
const foreigners = [1044545, 3390009, 11500883, 16968203, 19584714]
const colors = ['#c8ff38', '#7b8cff', '#ff8a3d', '#e85fba', '#56d9d0', '#d9d9d9']
const compact = (value: number) =>
  value >= 10000000
    ? `${(value / 10000000).toFixed(1)}천만`
    : value >= 10000
      ? `${(value / 10000).toFixed(value >= 1000000 ? 0 : 1)}만`
      : value.toLocaleString('ko-KR')

function LineChart({ active }: { active: string[] }) {
  const width = 760, height = 250, pad = 28
  const max = Math.max(...active.flatMap((name) => regionData[name]))
  const point = (v: number, i: number) => `${pad + i * ((width - pad * 2) / 4)},${height - pad - (v / max) * (height - pad * 2)}`
  return (
    <div className="chart-scroll">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="지역별 연도 추이 꺾은선 그래프">
        {[0, .25, .5, .75, 1].map((n) => <line key={n} x1={pad} x2={width-pad} y1={pad+n*(height-pad*2)} y2={pad+n*(height-pad*2)} className="grid-line" />)}
        {active.map((name) => {
          const color = colors[Object.keys(regionData).indexOf(name)]
          const points = regionData[name].map(point).join(' ')
          return <g key={name}><polyline points={points} fill="none" stroke={color} strokeWidth="3" /><circle cx={point(regionData[name][4],4).split(',')[0]} cy={point(regionData[name][4],4).split(',')[1]} r="5" fill={color} /></g>
        })}
        {years.map((year, i) => <text key={year} x={pad+i*((width-pad*2)/4)} y={height-4} className="axis-label" textAnchor="middle">{year}</text>)}
      </svg>
    </div>
  )
}

function App() {
  const [activeRegions, setActiveRegions] = useState(['아시아', '북아메리카', '유럽'])
  const [port, setPort] = useState('인천공항')
  const [mode, setMode] = useState<'전체'|'내국인'|'외국인'>('전체')
  const series = mode === '내국인' ? koreans : mode === '외국인' ? foreigners : totals
  const growth = useMemo(() => Math.round((series[4] / series[3] - 1) * 1000) / 10, [series])
  const toggleRegion = (name: string) => setActiveRegions((prev) =>
    prev.includes(name) ? (prev.length > 1 ? prev.filter((v) => v !== name) : prev) : [...prev, name]
  )

  return (
    <main>
      <header>
        <div className="brand"><span className="brand-mark">A</span><span>ARRIVAL<br/>INDEX</span></div>
        <div className="header-meta"><span>대한민국 출입국 데이터</span><span className="live-dot"/>2025 기준</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">IMMIGRATION DATA OVERVIEW</p>
          <h1>대한민국 입국자<br/><span>흐름을 읽다.</span></h1>
        </div>
        <p className="hero-copy">국적과 입국항을 가로질러,<br/>지난 5년의 이동을 한눈에 살펴보세요.</p>
      </section>

      <nav className="filter-bar" aria-label="입국자 구분">
        {(['전체','내국인','외국인'] as const).map((item) =>
          <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item}</button>
        )}
        <span className="source">출처: 국가통계포털 · 2021–2025</span>
      </nav>

      <section className="kpis">
        <article><p>2025 입국자</p><strong>{compact(series[4])}<small> 명</small></strong><span className="up">↗ {growth}%</span><em>전년 대비</em></article>
        <article><p>최다 입국 지역</p><strong>아시아</strong><span>15,772,507명</span><em>외국인 기준 · 80.5%</em></article>
        <article><p>최다 입국항</p><strong>인천공항</strong><span>35,095,017명</span><em>전체 입국자의 71.2%</em></article>
      </section>

      <section className="panel trend-panel">
        <div className="panel-head">
          <div><p className="section-no">01 / REGION</p><h2>지역별 입국자 추이</h2><p>외국인 입국자의 국적(지역) 기준 · 단위: 명</p></div>
          <div className="legend">
            {Object.keys(regionData).map((name, i) =>
              <button key={name} className={activeRegions.includes(name) ? 'selected' : ''} onClick={() => toggleRegion(name)}>
                <span style={{background: colors[i]}}/>{name}
              </button>
            )}
          </div>
        </div>
        <LineChart active={activeRegions} />
        <div className="trend-note"><b>2025</b><span>아시아 지역 입국자</span><strong>1,577만</strong><em>전체 외국인 중 가장 큰 비중</em></div>
      </section>

      <section className="panel port-panel">
        <div className="panel-head">
          <div><p className="section-no">02 / PORT</p><h2>입국항별 연도 비교</h2><p>선택한 입국항의 전체 입국자 · 단위: 명</p></div>
          <select value={port} onChange={(e) => setPort(e.target.value)} aria-label="입국항 선택">
            {Object.keys(portData).map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
        <div className="bars">
          {portData[port].map((value, i) => {
            const max = Math.max(...portData[port])
            return <div className="bar-item" key={years[i]}>
              <div className="bar-value">{compact(value)}</div>
              <div className="bar-track"><div className="bar-fill" style={{height: `${Math.max(2, value/max*100)}%`}}><span/></div></div>
              <b>{years[i]}</b>
            </div>
          })}
        </div>
        <div className="port-summary"><span>{port}</span><p>2021년 대비 <b>{Math.round(portData[port][4]/Math.max(portData[port][0],1)*10)/10}배</b> 증가</p><strong>{portData[port][4].toLocaleString('ko-KR')}<small> 명</small></strong></div>
      </section>

      <footer><span>ARRIVAL INDEX</span><p>국적(지역) 및 항구별 내외국인 입국자 통계</p><p>DATA UPDATED 2025</p></footer>
    </main>
  )
}

export default App
