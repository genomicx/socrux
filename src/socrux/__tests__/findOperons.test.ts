import { describe, it, expect } from 'vitest'
import { findOperons } from '../findOperons'
import type { AlignmentHit } from '../types'

const GENOME_LEN = 5_000_000

/** Minimal AlignmentHit factory for findOperons tests */
function makeHit(queryName: string, start: number, end: number, strand: '+' | '-'): AlignmentHit {
  const len = end - start
  return {
    queryName,
    queryLen: len,
    queryStart: 0,
    queryEnd: len,
    strand,
    targetName: 'chr1',
    targetLen: GENOME_LEN,
    targetStart: start,
    targetEnd: end,
    numMatches: len,
    blockLen: len,
    mapQ: 60,
  }
}

describe('findOperons', () => {
  it('returns empty array for no hits', () => {
    expect(findOperons([])).toEqual([])
  })

  it('detects a single forward-strand operon from 16S + 23S + 5S hits', () => {
    const hits = [
      makeHit('16S_rRNA', 1000, 2500, '+'),
      makeHit('23S_rRNA', 3000, 5000, '+'),
      makeHit('5S_rRNA', 5200, 5320, '+'),
    ]
    const operons = findOperons(hits)
    expect(operons).toHaveLength(1)
    expect(operons[0].start).toBe(1000)
    expect(operons[0].end).toBe(5320)
    expect(operons[0].forward).toBe(true)
  })

  it('rejects a cluster missing 16S', () => {
    const hits = [
      makeHit('23S_rRNA', 1000, 3000, '+'),
      makeHit('5S_rRNA', 3200, 3320, '+'),
    ]
    expect(findOperons(hits)).toHaveLength(0)
  })

  it('rejects a cluster missing 23S', () => {
    const hits = [
      makeHit('16S_rRNA', 1000, 2500, '+'),
      makeHit('5S_rRNA', 3000, 3120, '+'),
    ]
    expect(findOperons(hits)).toHaveLength(0)
  })

  it('accepts a cluster with only 16S + 23S (5S not required)', () => {
    const hits = [
      makeHit('16S_rRNA', 1000, 2500, '+'),
      makeHit('23S_rRNA', 3000, 5000, '+'),
    ]
    expect(findOperons(hits)).toHaveLength(1)
  })

  it('detects both forward and reverse strand operons', () => {
    const hits = [
      // Forward operon near start
      makeHit('16S_rRNA', 1000, 2500, '+'),
      makeHit('23S_rRNA', 3000, 5000, '+'),
      // Reverse operon far away
      makeHit('16S_rRNA', 50000, 51500, '-'),
      makeHit('23S_rRNA', 52000, 54000, '-'),
    ]
    const operons = findOperons(hits)
    expect(operons).toHaveLength(2)
    expect(operons[0].forward).toBe(true)
    expect(operons[1].forward).toBe(false)
  })

  it('returns operons sorted by start position', () => {
    // Provide hits for later operon first to test sorting
    const hits = [
      makeHit('16S_rRNA', 50000, 51500, '-'),
      makeHit('23S_rRNA', 52000, 54000, '-'),
      makeHit('16S_rRNA', 1000, 2500, '+'),
      makeHit('23S_rRNA', 3000, 5000, '+'),
    ]
    const operons = findOperons(hits)
    expect(operons).toHaveLength(2)
    expect(operons[0].start).toBeLessThan(operons[1].start)
    expect(operons[0].start).toBe(1000)
    expect(operons[1].start).toBe(50000)
  })

  it('filters overlapping operons (keeps first in sorted order)', () => {
    // Use tiny, non-interleaving hit ranges so both clusters form cleanly:
    //   Forward cluster: 16S 1000–1200, 23S 1400–1600  → operon {start:1000, end:1600}
    //   Reverse cluster: 16S 2000–2200, 23S 2400–2600  → operon {start:2000, end:2600}
    // |1000 – 2000| = 1000 < 1500 (OVERLAP_MARGIN) → second operon is filtered out.
    const hits = [
      makeHit('16S_rRNA', 1000, 1200, '+'),
      makeHit('23S_rRNA', 1400, 1600, '+'),
      makeHit('16S_rRNA', 2000, 2200, '-'),
      makeHit('23S_rRNA', 2400, 2600, '-'),
    ]
    const operons = findOperons(hits)
    expect(operons).toHaveLength(1)
    expect(operons[0].start).toBe(1000)
    expect(operons[0].forward).toBe(true)
  })

  it('rejects clusters whose span exceeds 10000bp', () => {
    // Hits on same strand within 10000bp gaps but total span > 10000
    const hits = [
      makeHit('16S_rRNA', 0, 1500, '+'),
      makeHit('23S_rRNA', 2000, 3500, '+'),
      // Force span > 10000 by adding a hit far from start
      makeHit('5S_rRNA', 11500, 11620, '+'),  // 11620 - 0 = 11620 > 10000
    ]
    // The 5S is within 10000bp of 23S end (11500-3500=8000), so same cluster,
    // but span = 11620 - 0 = 11620 > 10000 → invalid
    expect(findOperons(hits)).toHaveLength(0)
  })

  it('keeps two operons that are far enough apart', () => {
    const hits = [
      makeHit('16S_rRNA', 100000, 101500, '+'),
      makeHit('23S_rRNA', 102000, 104000, '+'),
      makeHit('16S_rRNA', 200000, 201500, '+'),
      makeHit('23S_rRNA', 202000, 204000, '+'),
    ]
    // Two clusters: gap between 104000 and 200000 = 96000 >> 10000 → separate clusters
    const operons = findOperons(hits)
    expect(operons).toHaveLength(2)
  })
})
