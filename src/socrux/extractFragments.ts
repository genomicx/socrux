import type { Operon, Fragment } from './types'

export function extractFragments(genome: string, operons: Operon[]): Fragment[] {
  if (operons.length === 0) return []

  const fragments: Fragment[] = []
  const len = genome.length

  // Fragments are the regions BETWEEN operons
  // For a circular genome with N operons, there are N fragments

  for (let i = 0; i < operons.length; i++) {
    const currentOperon = operons[i]
    const nextOperon = operons[(i + 1) % operons.length]

    let startPos: number
    let endPos: number
    let sequence: string

    if (i < operons.length - 1) {
      // Fragment between current operon end and next operon start
      startPos = currentOperon.end
      endPos = nextOperon.start
      sequence = genome.slice(startPos, endPos)
    } else {
      // Last fragment: wraps around (from last operon end to first operon start, crossing origin)
      startPos = currentOperon.end
      endPos = operons[0].start
      if (startPos < len) {
        sequence = genome.slice(startPos) + genome.slice(0, endPos)
      } else {
        sequence = genome.slice(0, endPos)
      }
    }

    fragments.push({
      number: i + 1,
      startPos,
      endPos,
      sequence,
    })
  }

  return fragments
}
