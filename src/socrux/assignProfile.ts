import type { ClassifiedFragment, GSProfile, SpeciesDB } from './types'

export function assignProfile(
  classified: ClassifiedFragment[],
  db: SpeciesDB,
): GSProfile {
  // Build profile fragment order
  const fragmentOrder = classified.map(f => {
    const num = String(f.refNumber)
    return f.orientation === '-' ? num + "'" : num
  })

  // Compare against known profiles
  for (const known of db.profiles) {
    if (profilesMatch(fragmentOrder, known.fragments)) {
      return {
        gsId: known.gs,
        fragmentOrder,
        quality: 'GREEN',
      }
    }
  }

  // Check validity: dnaA and dif markers should be present
  const hasDnaA = classified.some(f => f.dnaA)
  const hasDif = classified.some(f => f.dif)

  if (!hasDnaA || !hasDif) {
    return {
      gsId: 'Novel',
      fragmentOrder,
      quality: 'RED',
    }
  }

  // Valid arrangement but not in database
  return {
    gsId: 'Novel',
    fragmentOrder,
    quality: 'AMBER',
  }
}

function profilesMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  // Direct match
  if (a.every((v, i) => v === b[i])) return true
  // Try rotations (circular genome - the starting fragment can vary)
  for (let rot = 1; rot < a.length; rot++) {
    const rotated = [...a.slice(rot), ...a.slice(0, rot)]
    if (rotated.every((v, i) => v === b[i])) return true
  }
  return false
}
