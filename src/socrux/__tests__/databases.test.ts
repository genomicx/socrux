import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadSpeciesManifest, loadSpeciesDB } from '../databases'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => fetchMock.mockReset())
afterEach(() => vi.restoreAllMocks())

function mockOkResponse(data: unknown): Response {
  return { ok: true, json: () => Promise.resolve(data) } as unknown as Response
}
function mockFailResponse(): Response {
  return { ok: false, json: () => Promise.resolve({}) } as unknown as Response
}

const MANIFEST_DATA = {
  species: [{ id: 'Escherichia_coli', name: 'Escherichia coli', fragmentCount: 7 }],
}
const FRAGMENTS_DATA = { '1': 'ATCG', '2': 'GCTA' }
const PROFILES_DATA = [{ gs: 'GS1.0', fragments: ['1', '2'] }]
const METADATA_DATA = { dnaaFragment: 1, difFragment: 2, dnaaForwardOrientation: true }
const RRNA_DATA = { '16S': 'AAA', '23S': 'BBB', '5S': 'CCC' }

function setupHappyPathMocks(): void {
  fetchMock
    .mockResolvedValueOnce(mockOkResponse(FRAGMENTS_DATA))
    .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
    .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
    .mockResolvedValueOnce(mockOkResponse(RRNA_DATA))
    .mockResolvedValueOnce(mockOkResponse(MANIFEST_DATA))
}

describe('loadSpeciesManifest', () => {
  it('returns species array on success', async () => {
    fetchMock.mockResolvedValueOnce(mockOkResponse(MANIFEST_DATA))
    const result = await loadSpeciesManifest()
    expect(result).toEqual(MANIFEST_DATA.species)
  })

  it('throws when response not ok', async () => {
    fetchMock.mockResolvedValueOnce(mockFailResponse())
    await expect(loadSpeciesManifest()).rejects.toThrow('Failed to load species manifest')
  })
})

describe('loadSpeciesDB', () => {
  it('fetches exactly 5 URLs', async () => {
    const speciesId = 's3'
    setupHappyPathMocks()
    await loadSpeciesDB(speciesId)
    expect(fetchMock).toHaveBeenCalledTimes(5)
    const urls: string[] = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(urls).toContain(`/data/${speciesId}/fragments.json`)
    expect(urls).toContain(`/data/${speciesId}/profiles.json`)
    expect(urls).toContain(`/data/${speciesId}/metadata.json`)
    expect(urls).toContain(`/data/${speciesId}/rrna.json`)
    expect(urls).toContain('/data/manifest.json')
  })

  it('builds correct SpeciesDB', async () => {
    const speciesId = 'Species_A'
    setupHappyPathMocks()
    const db = await loadSpeciesDB(speciesId)
    expect(db.id).toBe(speciesId)
    expect(db.fragments).toEqual(FRAGMENTS_DATA)
    expect(db.profiles).toEqual(PROFILES_DATA)
    expect(db.rrna).toEqual(RRNA_DATA)
    expect(db.metadata).toEqual(METADATA_DATA)
  })

  it('uses name from manifest entry', async () => {
    const speciesId = 'Species_B'
    const manifestWithEntry = {
      species: [{ id: speciesId, name: 'My Species', fragmentCount: 5 }],
    }
    fetchMock
      .mockResolvedValueOnce(mockOkResponse(FRAGMENTS_DATA))
      .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
      .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
      .mockResolvedValueOnce(mockOkResponse(RRNA_DATA))
      .mockResolvedValueOnce(mockOkResponse(manifestWithEntry))
    const db = await loadSpeciesDB(speciesId)
    expect(db.name).toBe('My Species')
  })

  it('falls back to underscore-replaced id when not in manifest', async () => {
    const speciesId = 'Unknown_Species'
    fetchMock
      .mockResolvedValueOnce(mockOkResponse(FRAGMENTS_DATA))
      .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
      .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
      .mockResolvedValueOnce(mockOkResponse(RRNA_DATA))
      .mockResolvedValueOnce(mockOkResponse({ species: [] }))
    const db = await loadSpeciesDB(speciesId)
    expect(db.name).toBe('Unknown Species')
  })

  it('falls back to fragment key count when manifest entry absent', async () => {
    const speciesId = 'Species_C'
    fetchMock
      .mockResolvedValueOnce(mockOkResponse(FRAGMENTS_DATA))
      .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
      .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
      .mockResolvedValueOnce(mockOkResponse(RRNA_DATA))
      .mockResolvedValueOnce(mockOkResponse({ species: [] }))
    const db = await loadSpeciesDB(speciesId)
    expect(db.fragmentCount).toBe(Object.keys(FRAGMENTS_DATA).length)
  })

  it('throws when fragments.json fails', async () => {
    const speciesId = 'Species_D'
    fetchMock
      .mockResolvedValueOnce(mockFailResponse())
      .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
      .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
      .mockResolvedValueOnce(mockOkResponse(RRNA_DATA))
      .mockResolvedValueOnce(mockOkResponse(MANIFEST_DATA))
    await expect(loadSpeciesDB(speciesId)).rejects.toThrow(speciesId)
  })

  it('throws when rrna.json fails', async () => {
    const speciesId = 'Species_E'
    fetchMock
      .mockResolvedValueOnce(mockOkResponse(FRAGMENTS_DATA))
      .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
      .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
      .mockResolvedValueOnce(mockFailResponse())
      .mockResolvedValueOnce(mockOkResponse(MANIFEST_DATA))
    await expect(loadSpeciesDB(speciesId)).rejects.toThrow()
  })

  it('throws error message contains speciesId', async () => {
    const speciesId = 'Species_F'
    fetchMock
      .mockResolvedValueOnce(mockFailResponse())
      .mockResolvedValueOnce(mockOkResponse(PROFILES_DATA))
      .mockResolvedValueOnce(mockOkResponse(METADATA_DATA))
      .mockResolvedValueOnce(mockOkResponse(RRNA_DATA))
      .mockResolvedValueOnce(mockOkResponse(MANIFEST_DATA))
    await expect(loadSpeciesDB(speciesId)).rejects.toThrow('Failed to load database for')
  })
})

describe('loadSpeciesDB caching', () => {
  it('second call does not re-fetch', async () => {
    const speciesId = 'cached_species'
    setupHappyPathMocks()
    await loadSpeciesDB(speciesId)
    const countAfterFirst = fetchMock.mock.calls.length
    await loadSpeciesDB(speciesId)
    const countAfterSecond = fetchMock.mock.calls.length
    expect(countAfterSecond).toBe(countAfterFirst)
    expect(countAfterFirst).toBe(5)
  })

  it('second call returns same DB object reference', async () => {
    const speciesId = 'cached_species'
    const db1 = await loadSpeciesDB(speciesId)
    const db2 = await loadSpeciesDB(speciesId)
    expect(db1).toBe(db2)
  })
})
