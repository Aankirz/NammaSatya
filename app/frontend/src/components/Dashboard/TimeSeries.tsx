'use client'

interface Props {
  labels:   string[]
  official: number[]
  news:     number[]
}

export default function TimeSeries({ labels, official, news }: Props) {
  const W = 760, H = 200, padL = 32, padR = 12, padT = 12, padB = 28
  const max = Math.max(...official, ...news) * 1.1
  const xs = (i: number) => padL + (i * (W - padL - padR)) / (labels.length - 1)
  const ys = (v: number) => padT + (1 - v / max) * (H - padT - padB)
  const line = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`).join(' ')
  const area = (arr: number[]) =>
    line(arr) +
    ` L ${xs(arr.length - 1)} ${H - padB} L ${xs(0)} ${H - padB} Z`
  const yticks = [0, Math.round(max / 2), Math.round(max)]

  return (
    <svg className="ts-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {yticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={ys(t)} x2={W - padR} y2={ys(t)}
            stroke="var(--rule)" strokeWidth="0.8" strokeDasharray="2 4" />
          <text x={padL - 6} y={ys(t) + 3} className="ts-axis" textAnchor="end">{t}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={xs(i)} y={H - 8} className="ts-axis" textAnchor="middle">{l}</text>
      ))}
      <path d={area(news)}     fill="rgba(42,92,232,.10)" />
      <path d={line(news)}     stroke="var(--accent)" strokeWidth="2" fill="none" />
      <path d={area(official)} fill="rgba(14,22,38,.05)" />
      <path d={line(official)} stroke="var(--ink)"    strokeWidth="2" fill="none" />
      {official.map((v, i) => (
        <circle key={`o${i}`} cx={xs(i)} cy={ys(v)} r="2.4" fill="var(--ink)" />
      ))}
      {news.map((v, i) => (
        <circle key={`n${i}`} cx={xs(i)} cy={ys(v)} r="2.4" fill="var(--accent)" />
      ))}
    </svg>
  )
}
