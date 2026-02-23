import type { SpeciesManifestEntry, SpeciesDB, Markers } from './types'

const dbCache = new Map<string, SpeciesDB>()
let markersCache: Markers | null = null

export async function loadMarkers(): Promise<Markers> {
  if (markersCache) return markersCache
  const resp = await fetch('/data/markers.json')
  if (!resp.ok) throw new Error('Failed to load marker sequences')
  markersCache = await resp.json()
  return markersCache!
}

export async function loadSpeciesManifest(): Promise<SpeciesManifestEntry[]> {
  const resp = await fetch('/data/manifest.json')
  if (!resp.ok) throw new Error('Failed to load species manifest')
  const data = await resp.json()
  return data.species
}

export async function loadSpeciesDB(speciesId: string): Promise<SpeciesDB> {
  if (dbCache.has(speciesId)) return dbCache.get(speciesId)!

  const base = `/data/${speciesId}`

  const [fragmentsResp, profilesResp, metadataResp, rrnaResp, manifestResp] = await Promise.all([
    fetch(`${base}/fragments.json`),
    fetch(`${base}/profiles.json`),
    fetch(`${base}/metadata.json`),
    fetch(`${base}/rrna.json`),
    fetch('/data/manifest.json'),
  ])

  if (!fragmentsResp.ok || !profilesResp.ok || !metadataResp.ok || !rrnaResp.ok) {
    throw new Error(`Failed to load database for ${speciesId}`)
  }

  const fragments = await fragmentsResp.json()
  const profiles = await profilesResp.json()
  const metadata = await metadataResp.json()
  const rrna = await rrnaResp.json()
  const manifest = await manifestResp.json()

  const entry = manifest.species.find((s: SpeciesManifestEntry) => s.id === speciesId)

  const db: SpeciesDB = {
    id: speciesId,
    name: entry?.name ?? speciesId.replace(/_/g, ' '),
    fragmentCount: entry?.fragmentCount ?? Object.keys(fragments).length,
    fragments,
    profiles,
    rrna,
    metadata,
  }

  dbCache.set(speciesId, db)
  return db
}
