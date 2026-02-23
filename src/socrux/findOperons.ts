import type { AlignmentHit, Operon } from './types'

interface RRNAHit {
  type: '16S' | '23S' | '5S'
  start: number
  end: number
  forward: boolean
}

function parseRRNAHits(hits: AlignmentHit[]): RRNAHit[] {
  return hits.map(h => {
    let type: '16S' | '23S' | '5S' = '16S'
    if (h.queryName.includes('23S')) type = '23S'
    else if (h.queryName.includes('5S')) type = '5S'

    return {
      type,
      start: h.targetStart,
      end: h.targetEnd,
      forward: h.strand === '+',
    }
  })
}

function clusterHits(hits: RRNAHit[]): RRNAHit[][] {
  if (hits.length === 0) return []
  const sorted = [...hits].sort((a, b) => a.start - b.start)
  const CLUSTER_DISTANCE = 10000
  const clusters: RRNAHit[][] = []
  let current: RRNAHit[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const hit = sorted[i]
    const last = current[current.length - 1]
    if (hit.start - last.end < CLUSTER_DISTANCE) {
      current.push(hit)
    } else {
      clusters.push(current)
      current = [hit]
    }
  }
  clusters.push(current)
  return clusters
}

export function findOperons(hits: AlignmentHit[]): Operon[] {
  const rrnaHits = parseRRNAHits(hits)
  if (rrnaHits.length === 0) return []

  // Separate by strand, then cluster within each strand
  const forwardHits = rrnaHits.filter(h => h.forward)
  const reverseHits = rrnaHits.filter(h => !h.forward)

  const allClusters = [
    ...clusterHits(forwardHits).map(c => ({ cluster: c, forward: true })),
    ...clusterHits(reverseHits).map(c => ({ cluster: c, forward: false })),
  ]

  // Convert valid clusters to operons
  const operons: Operon[] = []
  for (const { cluster, forward } of allClusters) {
    const types = new Set(cluster.map(h => h.type))
    if (!types.has('16S') || !types.has('23S')) continue

    const start = Math.min(...cluster.map(h => h.start))
    const end = Math.max(...cluster.map(h => h.end))

    if (end - start > 10000) continue

    operons.push({ start, end, forward })
  }

  // Sort by position before filtering
  operons.sort((a, b) => a.start - b.start)

  // Filter overlapping operons (keep first in sorted order)
  const OVERLAP_MARGIN = 1500
  const filtered: Operon[] = []
  for (const op of operons) {
    const overlaps = filtered.some(
      f => Math.abs(f.start - op.start) < OVERLAP_MARGIN || Math.abs(f.end - op.end) < OVERLAP_MARGIN,
    )
    if (!overlaps) filtered.push(op)
  }

  return filtered
}
