import type { Fragment, ClassifiedFragment, AlignmentHit } from './types'

export function classifyFragments(
  fragments: Fragment[],
  fragmentHits: AlignmentHit[],
  markerHits: AlignmentHit[],
): ClassifiedFragment[] {
  return fragments.map(frag => {
    // Find best hit for this fragment against reference fragments
    const queryName = `fragment_${frag.number}`
    const hits = fragmentHits.filter(h => h.queryName === queryName)

    let bestHit: AlignmentHit | null = null
    let bestMatches = 0

    for (const hit of hits) {
      if (hit.numMatches > bestMatches) {
        bestMatches = hit.numMatches
        bestHit = hit
      }
    }

    // Determine reference fragment number from target name (e.g. "ref_1", "ref_2")
    let refNumber = frag.number // default to self if no match
    let orientation: '+' | '-' = '+'

    if (bestHit) {
      const match = bestHit.targetName.match(/(\d+)/)
      if (match) refNumber = parseInt(match[1], 10)
      orientation = bestHit.strand
    }

    // Check for dnaA and dif markers in this fragment's region
    const dnaA = markerHits.some(h => {
      if (!h.queryName.toLowerCase().includes('dnaa')) return false
      const pos = h.targetStart
      return isInFragmentRegion(pos, frag)
    })

    const dif = markerHits.some(h => {
      if (!h.queryName.toLowerCase().includes('dif')) return false
      const pos = h.targetStart
      return isInFragmentRegion(pos, frag)
    })

    return {
      ...frag,
      refNumber,
      orientation,
      identity: bestHit ? (bestHit.numMatches / bestHit.blockLen) * 100 : 0,
      dnaA,
      dif,
    }
  })
}

function isInFragmentRegion(pos: number, frag: Fragment): boolean {
  if (frag.startPos <= frag.endPos) {
    return pos >= frag.startPos && pos < frag.endPos
  }
  // Wrapping fragment
  return pos >= frag.startPos || pos < frag.endPos
}
