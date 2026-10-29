# socrux

**Browser-based genome structural typing around ribosomal operons**

Socrux is a client-side reimplementation of [socru](https://github.com/quadram-institute-bioscience/socru) that runs entirely in the browser using WebAssembly. It assigns a Genome Structure (GS) identifier representing the order and orientation of DNA fragments between ribosomal RNA operons in complete bacterial assemblies.

**Live app:** https://socrux.genomicx.org

## What it does

Bacterial chromosomes contain multiple copies of ribosomal RNA operons (16S–23S–5S). These operons divide the chromosome into numbered fragments. The order and orientation of these fragments — which can rearrange through large-scale inversions — defines the genome structure. Socrux:

1. Detects rRNA operons by aligning reference 16S/23S/5S sequences against the input genome using minimap2
2. Extracts the inter-operon DNA fragments
3. Classifies each fragment against a species-specific reference database
4. Assigns a GS profile (e.g. `GS1.0`) by matching the fragment order against known profiles
5. Identifies the origin of replication (oriC, dnaA gene) and terminus (dif site) fragments

Results include a circular genome map, fragment table with identity scores, and TSV export.

## Supported species

| Species | Fragments | Genome size |
|---|---|---|
| *Escherichia coli* | 7 | ~5.0 Mb |
| *Salmonella enterica* | 7 | ~4.8 Mb |
| *Klebsiella pneumoniae* | 8 | ~5.5 Mb |
| *Pseudomonas aeruginosa* | 4 | ~6.3 Mb |
| *Staphylococcus aureus* | 5 | ~2.8 Mb |
| *Acinetobacter baumannii* | 6 | ~4.0 Mb |
| *Enterococcus faecium* | 6 | ~2.8 Mb |
| *Enterococcus faecalis* | 4 | ~3.2 Mb |
| *Streptococcus pneumoniae* | 4 | ~2.1 Mb |
| *Mycobacterium tuberculosis* | 1 | ~4.4 Mb |

## Privacy

All computation runs in your browser using WebAssembly. No sequence data is uploaded to any server.

## Input

A complete bacterial genome assembly in FASTA format (single or multi-contig; the largest contig is used).

## Usage

1. Upload a FASTA file (drag-and-drop or click)
2. Select the matching species
3. Click **Run Analysis**
4. View results and export as TSV

## Development

```bash
npm install
npm run dev        # start dev server at http://localhost:5173
npm run test       # run unit tests
npm run build      # production build
npm run check      # tests + lint + build
```

Requires Node.js 24+.

## Deployment

Hosted on Cloudflare Pages (`socrux`) at https://socrux.genomicx.org. Build with `npm run build`; publish `dist`. Species databases remain bundled under `/data/`; Aioli/minimap2 retains its existing biowasm CDN loading.

## How it differs from the original socru

| | socru (CLI) | socrux (browser) |
|---|---|---|
| rRNA detection | Barrnap (HMMer) | minimap2 2.22 (WASM) |
| Fragment classification | BLAST | minimap2 2.22 (WASM) |
| Runtime | Python + Perl | TypeScript + WebAssembly |
| Data privacy | Server/local | Fully client-side |

## Reference databases

Fragment reference sequences and GS profiles are sourced from the [socru database](https://github.com/quadram-institute-bioscience/socru/tree/master/socru/data). rRNA reference sequences are extracted from *E. coli* K-12 MG1655 (U00096.3); dnaA and dif marker sequences are from the socru marker database.

## Citation

If you use socrux, please cite the original socru paper:

> Page AJ, Ainsworth EV, Langridge GC (2020). socru: typing of genome-level order and orientation around ribosomal operons in bacteria. *Microbial Genomics*, 6(7). https://doi.org/10.1099/mgen.0.000396

## Author

Andrew J. Page

## License

GPL-3.0-only
