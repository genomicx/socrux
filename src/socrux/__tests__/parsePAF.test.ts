import { describe, it, expect } from 'vitest'
import { parsePAF } from '../pipeline'

/** Build a 12-field PAF line with tab separators */
function pafLine(
  qName: string,
  qLen: number,
  qStart: number,
  qEnd: number,
  strand: string,
  tName: string,
  tLen: number,
  tStart: number,
  tEnd: number,
  nMatch: number,
  blockLen: number,
  mapQ: number,
): string {
  return [qName, qLen, qStart, qEnd, strand, tName, tLen, tStart, tEnd, nMatch, blockLen, mapQ].join('\t')
}

describe('parsePAF', () => {
  it('parses a valid PAF line into an AlignmentHit', () => {
    const line = pafLine('16S_rRNA', 1500, 0, 1500, '+', 'chr1', 4641652, 100000, 101500, 1490, 1500, 60)
    const hits = parsePAF(line)
    expect(hits).toHaveLength(1)
    const hit = hits[0]
    expect(hit.queryName).toBe('16S_rRNA')
    expect(hit.queryLen).toBe(1500)
    expect(hit.queryStart).toBe(0)
    expect(hit.queryEnd).toBe(1500)
    expect(hit.strand).toBe('+')
    expect(hit.targetName).toBe('chr1')
    expect(hit.targetLen).toBe(4641652)
    expect(hit.targetStart).toBe(100000)
    expect(hit.targetEnd).toBe(101500)
    expect(hit.numMatches).toBe(1490)
    expect(hit.blockLen).toBe(1500)
    expect(hit.mapQ).toBe(60)
  })

  it('skips lines with fewer than 12 fields', () => {
    const line = ['16S_rRNA', '1500', '0', '1500', '+', 'chr1', '4641652', '100000', '101500', '1490'].join('\t')
    expect(parsePAF(line)).toHaveLength(0)
  })

  it('skips empty lines', () => {
    const input = '\n\n'
    expect(parsePAF(input)).toHaveLength(0)
  })

  it('handles minus strand', () => {
    const line = pafLine('23S_rRNA', 2900, 0, 2900, '-', 'chr1', 4641652, 200000, 202900, 2880, 2900, 60)
    const hits = parsePAF(line)
    expect(hits).toHaveLength(1)
    expect(hits[0].strand).toBe('-')
  })

  it('parses multiple lines', () => {
    const lines = [
      pafLine('16S_rRNA', 1500, 0, 1500, '+', 'chr1', 4641652, 100000, 101500, 1490, 1500, 60),
      pafLine('23S_rRNA', 2900, 0, 2900, '+', 'chr1', 4641652, 105000, 107900, 2880, 2900, 60),
      pafLine('5S_rRNA', 120, 0, 120, '+', 'chr1', 4641652, 108000, 108120, 119, 120, 60),
    ].join('\n')
    expect(parsePAF(lines)).toHaveLength(3)
  })

  it('skips lines with invalid numeric fields (NaN)', () => {
    // queryLen is 'abc' → NaN
    const line = ['16S_rRNA', 'abc', '0', '1500', '+', 'chr1', '4641652', '100000', '101500', '1490', '1500', '60'].join('\t')
    expect(parsePAF(line)).toHaveLength(0)
  })

  it('skips lines with blockLen = 0', () => {
    const line = pafLine('16S_rRNA', 1500, 0, 1500, '+', 'chr1', 4641652, 100000, 101500, 0, 0, 60)
    expect(parsePAF(line)).toHaveLength(0)
  })

  it('skips lines with invalid strand character', () => {
    const line = pafLine('16S_rRNA', 1500, 0, 1500, '?', 'chr1', 4641652, 100000, 101500, 1490, 1500, 60)
    expect(parsePAF(line)).toHaveLength(0)
  })

  it('returns empty array for empty string', () => {
    expect(parsePAF('')).toHaveLength(0)
  })
})
