import { describe, it, expect } from 'vitest'
import { assignProfile } from '../assignProfile'
import type { ClassifiedFragment, SpeciesDB } from '../types'

const mockDB: SpeciesDB = {
  id: 'test',
  name: 'Test species',
  fragmentCount: 4,
  fragments: { '1': 'ATCG', '2': 'GCTA', '3': 'TTAA', '4': 'CCGG' },
  profiles: [
    { gs: 'GS1.0', fragments: ['1', '2', '3', '4'] },
    { gs: 'GS1.1', fragments: ['1', "2'", '3', '4'] },
  ],
  rrna: { '16S': 'AAA', '23S': 'BBB', '5S': 'CCC' },
  metadata: { dnaaFragment: 1, difFragment: 3, dnaaForwardOrientation: true },
}

function makeFragment(
  num: number,
  refNumber: number,
  orientation: '+' | '-',
  dnaA = false,
  dif = false,
): ClassifiedFragment {
  return {
    number: num,
    startPos: (num - 1) * 100,
    endPos: num * 100,
    sequence: 'ATCG',
    refNumber,
    orientation,
    identity: 99.0,
    dnaA,
    dif,
  }
}

describe('assignProfile', () => {
  it('returns GREEN when fragment order exactly matches a known profile', () => {
    const classified = [
      makeFragment(1, 1, '+'),
      makeFragment(2, 2, '+'),
      makeFragment(3, 3, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('GREEN')
    expect(result.gsId).toBe('GS1.0')
  })

  it('matches GS1.1 profile with a reversed fragment (apostrophe notation)', () => {
    const classified = [
      makeFragment(1, 1, '+'),
      makeFragment(2, 2, '-'),  // reversed → "2'"
      makeFragment(3, 3, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('GREEN')
    expect(result.gsId).toBe('GS1.1')
  })

  it('formats reversed fragments with trailing apostrophe', () => {
    const classified = [
      makeFragment(1, 1, '-'),
      makeFragment(2, 2, '+'),
      makeFragment(3, 3, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    // refNumber 1 reversed → "1'"
    expect(result.fragmentOrder[0]).toBe("1'")
    // refNumber 2 forward → "2" (no apostrophe)
    expect(result.fragmentOrder[1]).toBe('2')
  })

  it('returns GREEN when profile matches after rotation (circular offset)', () => {
    // Fragments in order 2, 3, 4, 1 — a rotation of GS1.0
    const classified = [
      makeFragment(1, 2, '+'),
      makeFragment(2, 3, '+'),
      makeFragment(3, 4, '+'),
      makeFragment(4, 1, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('GREEN')
    expect(result.gsId).toBe('GS1.0')
  })

  it('returns AMBER for unknown profile when both dnaA and dif markers are present', () => {
    // Order 1, 3, 2, 4 does not match any known profile
    const classified = [
      makeFragment(1, 1, '+', true, false),  // dnaA
      makeFragment(2, 3, '+', false, true),  // dif
      makeFragment(3, 2, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('AMBER')
    expect(result.gsId).toBe('Novel')
  })

  it('returns RED for unknown profile when dnaA marker is missing', () => {
    const classified = [
      makeFragment(1, 1, '+', false, false),
      makeFragment(2, 3, '+', false, true),  // dif present
      makeFragment(3, 2, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('RED')
    expect(result.gsId).toBe('Novel')
  })

  it('returns RED for unknown profile when dif marker is missing', () => {
    const classified = [
      makeFragment(1, 1, '+', true, false),  // dnaA present
      makeFragment(2, 3, '+', false, false),
      makeFragment(3, 2, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('RED')
    expect(result.gsId).toBe('Novel')
  })

  it('returns RED when both dnaA and dif markers are missing', () => {
    const classified = [
      makeFragment(1, 1, '+'),
      makeFragment(2, 3, '+'),
      makeFragment(3, 2, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.quality).toBe('RED')
  })

  it('includes the fragment order in the result', () => {
    const classified = [
      makeFragment(1, 1, '+'),
      makeFragment(2, 2, '+'),
      makeFragment(3, 3, '+'),
      makeFragment(4, 4, '+'),
    ]
    const result = assignProfile(classified, mockDB)
    expect(result.fragmentOrder).toEqual(['1', '2', '3', '4'])
  })
})
