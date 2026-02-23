import { describe, it, expect } from 'vitest'
import { extractFragments } from '../extractFragments'
import type { Operon } from '../types'

function op(start: number, end: number, forward = true): Operon {
  return { start, end, forward }
}

describe('extractFragments', () => {
  it('returns empty array when no operons', () => {
    expect(extractFragments('ATCGATCG', [])).toEqual([])
  })

  it('extracts N fragments from N operons', () => {
    // genome: AAAAABBBBBCCCCCDDDDDEEEEEFFFFF (30 chars)
    const genome = 'AAAAABBBBBCCCCCDDDDDEEEEEFFFFF'
    const operons = [op(0, 5), op(10, 15), op(20, 25)]
    const fragments = extractFragments(genome, operons)
    expect(fragments).toHaveLength(3)
  })

  it('fragment 1 spans between operon 1 end and operon 2 start', () => {
    // genome: GGGGRRRRYYYYCCCC (16 chars)
    //         0   4   8   12
    const genome = 'GGGGRRRRYYYYCCCC'
    const operons = [op(0, 4), op(8, 12)]
    const fragments = extractFragments(genome, operons)
    expect(fragments[0].startPos).toBe(4)
    expect(fragments[0].endPos).toBe(8)
    expect(fragments[0].sequence).toBe('RRRR')
  })

  it('last fragment wraps around from last operon end to first operon start', () => {
    // genome: HHHHHAAAAAABBBBBCCCCCGGGGG (25 chars)
    //         0    5     11   16   21
    const genome = 'HHHHHAAAAAABBBBBCCCCCGGGGG'
    const operons = [op(5, 11), op(16, 21)]
    const fragments = extractFragments(genome, operons)
    expect(fragments).toHaveLength(2)

    // Fragment 1: between op1 end (11) and op2 start (16)
    expect(fragments[0].sequence).toBe('BBBBB')

    // Fragment 2 (last, wraps): from op2 end (21) to start of genome up to op1 start (5)
    expect(fragments[1].sequence).toBe('GGGGGHHHHH')
    expect(fragments[1].startPos).toBe(21)
    expect(fragments[1].endPos).toBe(5)
  })

  it('assigns correct fragment numbers (1-based)', () => {
    const genome = 'AAAAABBBBBCCCCCDDDDDEEEEEFFFFF'
    const operons = [op(0, 5), op(10, 15), op(20, 25)]
    const fragments = extractFragments(genome, operons)
    expect(fragments[0].number).toBe(1)
    expect(fragments[1].number).toBe(2)
    expect(fragments[2].number).toBe(3)
  })

  it('extracts correct sequences for two operons', () => {
    // genome: GGGGRRRRYYYYCCCC (16 chars)
    const genome = 'GGGGRRRRYYYYCCCC'
    const operons = [op(0, 4), op(8, 12)]
    const fragments = extractFragments(genome, operons)

    // Fragment 1: genome[4..8] = 'RRRR'
    expect(fragments[0].sequence).toBe('RRRR')
    // Fragment 2 (last): genome[12..] + genome[0..0] = 'CCCC' + '' = 'CCCC'
    expect(fragments[1].sequence).toBe('CCCC')
  })

  it('handles a single operon (one wrap-around fragment)', () => {
    const genome = 'AAAAABBBBBCCCCC'  // 15 chars
    const operons = [op(5, 10)]
    const fragments = extractFragments(genome, operons)
    expect(fragments).toHaveLength(1)
    // Last (only) fragment: genome[10..] + genome[0..5] = 'CCCCC' + 'AAAAA'
    expect(fragments[0].sequence).toBe('CCCCCAAAAA')
    expect(fragments[0].startPos).toBe(10)
    expect(fragments[0].endPos).toBe(5)
  })

  it('records correct startPos and endPos for non-wrapping fragments', () => {
    const genome = 'AAAAABBBBBCCCCC'
    const operons = [op(0, 5), op(10, 15)]
    const fragments = extractFragments(genome, operons)
    expect(fragments[0].startPos).toBe(5)
    expect(fragments[0].endPos).toBe(10)
  })
})
