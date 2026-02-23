import { useState, useEffect } from 'react'
import type { SpeciesManifestEntry } from '../socrux/types'

interface SpeciesSelectProps {
  selectedSpecies: string
  onSpeciesChange: (species: string) => void
  disabled: boolean
}

export function SpeciesSelect({ selectedSpecies, onSpeciesChange, disabled }: SpeciesSelectProps) {
  const [species, setSpecies] = useState<SpeciesManifestEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/manifest.json')
      .then(r => r.json())
      .then(data => { setSpecies(data.species); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const selected = species.find(s => s.id === selectedSpecies)

  return (
    <div className="species-select">
      <label htmlFor="species-select">Species Database</label>
      <select
        id="species-select"
        value={selectedSpecies}
        onChange={e => onSpeciesChange(e.target.value)}
        disabled={disabled || loading}
      >
        {loading ? (
          <option>Loading species...</option>
        ) : (
          species.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.fragmentCount} fragments)
            </option>
          ))
        )}
      </select>
      {selected && <p className="species-description">{selected.description} &mdash; {selected.genomeSize}</p>}
    </div>
  )
}
