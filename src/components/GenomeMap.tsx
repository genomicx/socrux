import type { ClassifiedFragment, Operon } from '../socrux/types'

interface GenomeMapProps {
  fragments: ClassifiedFragment[]
  operons: Operon[]
  genomeName: string
  genomeLength: number
  quality: 'GREEN' | 'AMBER' | 'RED'
}

const FRAGMENT_COLORS = [
  '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
]

const QUALITY_COLORS: Record<'GREEN' | 'AMBER' | 'RED', string> = {
  GREEN: '#22c55e',
  AMBER: '#fbbf24',
  RED: '#ef4444',
}

// SVG canvas constants
const SZ = 560       // viewBox width & height
const CX = SZ / 2   // 280
const CY = SZ / 2   // 280
const OR = 185       // outer ring radius
const IR = 130       // inner ring radius
const MID_R = (OR + IR) / 2   // 157.5 — mid-ring radius
const LABEL_R = MID_R + 9     // 166.5 — label placement radius
const ARROW_R = MID_R - 13    // 144.5 — direction arrow placement radius
const GAP = 0.8               // inter-arc gap (degrees)

/** Convert polar angle (0 = 12 o'clock, clockwise) to SVG x,y */
function toXY(r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

/** Format number to 2 decimal places for SVG paths */
function n(v: number): string {
  return v.toFixed(2)
}

/** Build SVG path for a filled donut arc segment */
function arcPath(outerR: number, innerR: number, startDeg: number, endDeg: number): string {
  const s = startDeg + GAP
  const e = endDeg - GAP
  if (e - s < 0.05) return ''
  const p1 = toXY(outerR, s), p2 = toXY(outerR, e)
  const p3 = toXY(innerR, e), p4 = toXY(innerR, s)
  const lg = e - s > 180 ? 1 : 0
  return (
    `M${n(p1.x)} ${n(p1.y)} ` +
    `A${outerR} ${outerR} 0 ${lg} 1 ${n(p2.x)} ${n(p2.y)} ` +
    `L${n(p3.x)} ${n(p3.y)} ` +
    `A${innerR} ${innerR} 0 ${lg} 0 ${n(p4.x)} ${n(p4.y)}Z`
  )
}

/** Determine SVG text-anchor based on polar angle */
function anchor(angleDeg: number): 'start' | 'middle' | 'end' {
  const a = ((angleDeg % 360) + 360) % 360
  if (a > 30 && a < 150) return 'start'
  if (a > 210 && a < 330) return 'end'
  return 'middle'
}

export function GenomeMap({ fragments, operons, genomeName, genomeLength, quality }: GenomeMapProps) {
  const qColor = QUALITY_COLORS[quality]

  // Pre-compute arc geometry for each fragment
  const arcs = fragments.map((frag, i) => {
    const sa = (frag.startPos / genomeLength) * 360
    const span = (frag.sequence.length / genomeLength) * 360
    const ea = sa + span
    const ma = sa + span / 2
    return {
      frag,
      sa, ea, ma, span,
      color: FRAGMENT_COLORS[i % FRAGMENT_COLORS.length],
      path: arcPath(OR, IR, sa, ea),
    }
  })

  const displayName = genomeName.length > 20 ? `${genomeName.slice(0, 18)}…` : genomeName
  const sizeMb = (genomeLength / 1e6).toFixed(2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg
        viewBox={`0 0 ${SZ} ${SZ}`}
        style={{ width: '100%', maxWidth: `${SZ}px`, height: 'auto' }}
        aria-label={`Circular genome structure map — ${genomeName}`}
      >
        <title>{`Genome structure: ${genomeName}`}</title>

        <defs>
          {/* Diagonal stripe pattern for reversed (−) fragments */}
          <pattern
            id="gx-hatch"
            patternUnits="userSpaceOnUse"
            width="7"
            height="7"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,255,255,0.38)" strokeWidth="2.5" />
          </pattern>
        </defs>

        {/* ── Quality glow halo ── */}
        <circle cx={CX} cy={CY} r={OR + 11}
          fill="none" stroke={qColor} strokeWidth="13" opacity="0.13" />
        <circle cx={CX} cy={CY} r={OR + 11}
          fill="none" stroke={qColor} strokeWidth="1.8" opacity="0.88" />

        {/* ── Subtle track guide rings ── */}
        <circle cx={CX} cy={CY} r={OR + 1}
          fill="none" stroke="var(--gx-border)" strokeWidth="0.7" opacity="0.4" />
        <circle cx={CX} cy={CY} r={IR - 1}
          fill="none" stroke="var(--gx-border)" strokeWidth="0.7" opacity="0.4" />

        {/* ── Fragment arcs — base colour fill ── */}
        {arcs.map(({ path, color }, i) =>
          path ? <path key={`a${i}`} d={path} fill={color} opacity={0.85} /> : null
        )}

        {/* ── Hatch overlay for reversed (−) orientation ── */}
        {arcs.map(({ frag, path }, i) =>
          path && frag.orientation === '-'
            ? <path key={`h${i}`} d={path} fill="url(#gx-hatch)" />
            : null
        )}

        {/* ── Arc edge separators (use background colour as gap) ── */}
        {arcs.map(({ path }, i) =>
          path
            ? <path key={`e${i}`} d={path}
                fill="none" stroke="var(--gx-bg)" strokeWidth="0.8" opacity="0.65" />
            : null
        )}

        {/* ── Direction chevron arrows ──
            Forward (+) → clockwise (rotate midAngle + 90°)
            Reversed (−) → counterclockwise (rotate midAngle − 90°) */}
        {arcs.map(({ frag, ma, span }, i) => {
          if (span < 9) return null
          const { x, y } = toXY(ARROW_R, ma)
          const rot = frag.orientation === '+' ? ma + 90 : ma - 90
          return (
            <polygon
              key={`v${i}`}
              points="0,-6 5,4.5 0,1.5 -5,4.5"
              fill="rgba(255,255,255,0.92)"
              transform={`translate(${n(x)},${n(y)}) rotate(${n(rot)})`}
              style={{ pointerEvents: 'none' }}
            />
          )
        })}

        {/* ── Fragment number labels ── */}
        {arcs.map(({ frag, ma, span }, i) => {
          if (span < 14) return null
          const { x, y } = toXY(LABEL_R, ma)
          return (
            <text
              key={`t${i}`}
              x={n(x)} y={n(y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              fill="white"
              style={{ fontFamily: 'var(--gx-font-sans)', userSelect: 'none' }}
            >
              {frag.refNumber}{frag.orientation === '-' ? "'" : ''}
            </text>
          )
        })}

        {/* ── Ori / Ter callout lines + labels ── */}
        {arcs.map(({ frag, ma }, i) => {
          if (!frag.dnaA && !frag.dif) return null
          const ls = toXY(OR + 14, ma)
          const le = toXY(OR + 32, ma)
          const tp = toXY(OR + 41, ma)
          const anc = anchor(ma)
          return (
            <g key={`c${i}`}>
              {frag.dnaA && (
                <>
                  <circle cx={n(ls.x)} cy={n(ls.y)} r="3" fill="var(--gx-warning)" />
                  <line
                    x1={n(ls.x)} y1={n(ls.y)} x2={n(le.x)} y2={n(le.y)}
                    stroke="var(--gx-warning)" strokeWidth="1.2" strokeDasharray="3,2"
                  />
                  <text
                    x={n(tp.x)} y={n(tp.y)}
                    textAnchor={anc} dominantBaseline="central"
                    fontSize="10" fontWeight="600" fill="var(--gx-warning)"
                    style={{ fontFamily: 'var(--gx-font-sans)' }}
                  >Ori</text>
                </>
              )}
              {frag.dif && (
                <>
                  <circle cx={n(ls.x)} cy={n(ls.y)} r="3" fill="var(--gx-info)" />
                  <line
                    x1={n(ls.x)} y1={n(ls.y)} x2={n(le.x)} y2={n(le.y)}
                    stroke="var(--gx-info)" strokeWidth="1.2" strokeDasharray="3,2"
                  />
                  <text
                    x={n(tp.x)} y={n(tp.y)}
                    textAnchor={anc} dominantBaseline="central"
                    fontSize="10" fontWeight="600" fill="var(--gx-info)"
                    style={{ fontFamily: 'var(--gx-font-sans)' }}
                  >Ter</text>
                </>
              )}
            </g>
          )
        })}

        {/* ── rRNA operon diamond markers (between fragment arcs) ── */}
        {operons.map((op, i) => {
          const angle = ((op.start + op.end) / 2 / genomeLength) * 360
          const { x, y } = toXY(OR + 23, angle)
          return (
            <polygon
              key={`o${i}`}
              points="0,-5.5 5,0 0,5.5 -5,0"
              fill="var(--gx-text-muted)"
              opacity="0.82"
              transform={`translate(${n(x)},${n(y)})`}
            />
          )
        })}

        {/* ── Center disc (surface fill) ── */}
        <circle cx={CX} cy={CY} r={IR - 8} fill="var(--gx-surface)" />

        {/* ── Center: genome name ── */}
        <text
          x={CX} y={CY - 18}
          textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="600" fill="var(--gx-text)"
          style={{ fontFamily: 'var(--gx-font-sans)' }}
        >
          {displayName}
        </text>

        {/* ── Center: genome size ── */}
        <text
          x={CX} y={CY - 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize="10" fill="var(--gx-text-muted)"
          style={{ fontFamily: 'var(--gx-font-sans)' }}
        >
          {sizeMb} Mb
        </text>

        {/* ── Center: quality pill badge ── */}
        <rect x={CX - 23} y={CY + 12} width="46" height="15" rx="4"
          fill={qColor} opacity="0.15" />
        <text
          x={CX} y={CY + 19.5}
          textAnchor="middle" dominantBaseline="central"
          fontSize="9.5" fontWeight="700" fill={qColor}
          style={{ fontFamily: 'var(--gx-font-sans)', letterSpacing: '0.8px' }}
        >
          {quality}
        </text>
      </svg>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35rem 0.85rem',
        justifyContent: 'center',
        fontSize: '11px',
        color: 'var(--gx-text-muted)',
        maxWidth: `${SZ}px`,
        padding: '0 0.5rem',
        lineHeight: 1.2,
      }}>
        {/* Fragment colour swatches */}
        {fragments.map((frag, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2, flexShrink: 0,
              background: FRAGMENT_COLORS[i % FRAGMENT_COLORS.length],
              display: 'inline-block',
            }} />
            <span>{frag.refNumber}</span>
          </span>
        ))}

        {/* Hatch swatch = reversed */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="10" viewBox="0 0 14 10" style={{ flexShrink: 0 }}>
            <defs>
              <pattern id="lgd-hatch" patternUnits="userSpaceOnUse" width="4" height="4"
                patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4"
                  stroke="rgba(100,116,139,0.75)" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="14" height="10" rx="2" fill="var(--gx-text-muted)" opacity="0.3" />
            <rect width="14" height="10" rx="2" fill="url(#lgd-hatch)" />
          </svg>
          <span>Reversed (−)</span>
        </span>

        {/* Diamond = rRNA operon */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="-6 -6 12 12" style={{ flexShrink: 0 }}>
            <polygon points="0,-5 4.5,0 0,5 -4.5,0" fill="var(--gx-text-muted)" />
          </svg>
          <span>rRNA operon</span>
        </span>

        {/* Ori dot */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'var(--gx-warning)', display: 'inline-block',
          }} />
          <span>Ori (origin)</span>
        </span>

        {/* Ter dot */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'var(--gx-info)', display: 'inline-block',
          }} />
          <span>Ter (terminus)</span>
        </span>
      </div>
    </div>
  )
}
