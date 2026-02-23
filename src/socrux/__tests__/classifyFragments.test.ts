import { describe, it, expect } from 'vitest'
import { classifyFragments } from '../classifyFragments'
import type { Fragment, AlignmentHit } from '../types'

function makeFrag(num: number, startPos: number, endPos: number): Fragment {
  return { number: num, startPos, endPos, sequence: 'ATCG' }
}

function makeHit(
  queryName: string,
  targetName: string,
  strand: '+' | '-',
  numMatches: number,
  blockLen: number,
  targetStart = 0,
): AlignmentHit {
  return {
    queryName,
    queryLen: 0,
    queryStart: 0,
    queryEnd: 0,
    strand,
    targetName,
    targetLen: 0,
    targetStart,
    targetEnd: 0,
    numMatches,
    blockLen,
    mapQ: 0,
  }
}

describe('classifyFragments', () => {
  it('empty fragments returns []', () => {
    const result = classifyFragments([], [], [])
    expect(result).toEqual([])
  })

  it('fragment with no matching hits defaults to original number, + orientation, 0 identity, no markers', () => {
    const frags = [makeFrag(3, 0, 100)]
    const result = classifyFragments(frags, [], [])
    expect(result).toHaveLength(1)
    expect(result[0].refNumber).toBe(3)
    expect(result[0].orientation).toBe('+')
    expect(result[0].identity).toBe(0)
    expect(result[0].dnaA).toBe(false)
    expect(result[0].dif).toBe(false)
  })

  it('extracts refNumber from target name "ref_1"', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [makeHit('fragment_1', 'ref_1', '+', 80, 100)]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].refNumber).toBe(1)
  })

  it('extracts refNumber from target name "ref_7"', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [makeHit('fragment_1', 'ref_7', '+', 80, 100)]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].refNumber).toBe(7)
  })

  it('extracts refNumber from multi-digit target "ref_12"', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [makeHit('fragment_1', 'ref_12', '+', 80, 100)]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].refNumber).toBe(12)
  })

  it('uses hit strand "+" as orientation', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [makeHit('fragment_1', 'ref_1', '+', 80, 100)]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].orientation).toBe('+')
  })

  it('uses hit strand "-" as orientation', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [makeHit('fragment_1', 'ref_1', '-', 80, 100)]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].orientation).toBe('-')
  })

  it('multiple hits for same fragment — picks best identity (90/100 beats 60/100)', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [
      makeHit('fragment_1', 'ref_2', '+', 60, 100),
      makeHit('fragment_1', 'ref_5', '-', 90, 100),
    ]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].refNumber).toBe(5)
    expect(result[0].orientation).toBe('-')
    expect(result[0].identity).toBe(90)
  })

  it('hits for fragment_2 do not affect fragment_1 result', () => {
    const frags = [makeFrag(1, 0, 100), makeFrag(2, 100, 200)]
    const hits = [
      makeHit('fragment_2', 'ref_9', '+', 95, 100),
    ]
    const result = classifyFragments(frags, hits, [])
    // fragment_1 has no hits — should fall back to defaults
    expect(result[0].refNumber).toBe(1)
    expect(result[0].identity).toBe(0)
    // fragment_2 should pick up its hit
    expect(result[1].refNumber).toBe(9)
  })

  it('identity equals numMatches/blockLen * 100 exactly: 75/100 → 75.0', () => {
    const frags = [makeFrag(1, 0, 100)]
    const hits = [makeHit('fragment_1', 'ref_1', '+', 75, 100)]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].identity).toBe(75.0)
  })

  it('dnaA marker: queryName includes "dnaa", targetStart inside fragment region → dnaA = true', () => {
    const frags = [makeFrag(1, 0, 200)]
    const markerHits = [makeHit('dnaa', 'genome', '+', 100, 100, 50)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(true)
  })

  it('dif marker: queryName includes "dif", targetStart inside fragment region → dif = true', () => {
    const frags = [makeFrag(1, 0, 200)]
    const markerHits = [makeHit('dif', 'genome', '+', 100, 100, 100)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dif).toBe(true)
  })

  it('dnaA marker queryName is case-insensitive: "DnaA" matches', () => {
    const frags = [makeFrag(1, 0, 200)]
    const markerHits = [makeHit('DnaA', 'genome', '+', 100, 100, 50)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(true)
  })

  it('dnaA marker queryName is case-insensitive: "DNAA" matches', () => {
    const frags = [makeFrag(1, 0, 200)]
    const markerHits = [makeHit('DNAA', 'genome', '+', 100, 100, 50)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(true)
  })

  it('marker targetStart outside fragment region → dnaA = false', () => {
    const frags = [makeFrag(1, 0, 100)]
    const markerHits = [makeHit('dnaa', 'genome', '+', 100, 100, 500)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(false)
  })

  it('wrapping fragment: startPos=900, endPos=100, pos=950 → in region (dnaA = true)', () => {
    const frags = [makeFrag(1, 900, 100)]
    const markerHits = [makeHit('dnaa', 'genome', '+', 100, 100, 950)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(true)
  })

  it('wrapping fragment: startPos=900, endPos=100, pos=50 → in region (dnaA = true)', () => {
    const frags = [makeFrag(1, 900, 100)]
    const markerHits = [makeHit('dnaa', 'genome', '+', 100, 100, 50)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(true)
  })

  it('wrapping fragment: startPos=900, endPos=100, pos=500 → NOT in region (dnaA = false)', () => {
    const frags = [makeFrag(1, 900, 100)]
    const markerHits = [makeHit('dnaa', 'genome', '+', 100, 100, 500)]
    const result = classifyFragments(frags, [], markerHits)
    expect(result[0].dnaA).toBe(false)
  })

  it('3 independent fragments each get correct refNumber from their own best hits', () => {
    const frags = [makeFrag(1, 0, 100), makeFrag(2, 100, 200), makeFrag(3, 200, 300)]
    const hits = [
      makeHit('fragment_1', 'ref_4', '+', 80, 100),
      makeHit('fragment_2', 'ref_6', '+', 90, 100),
      makeHit('fragment_3', 'ref_2', '+', 70, 100),
    ]
    const result = classifyFragments(frags, hits, [])
    expect(result[0].refNumber).toBe(4)
    expect(result[1].refNumber).toBe(6)
    expect(result[2].refNumber).toBe(2)
  })
})
