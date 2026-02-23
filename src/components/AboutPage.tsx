export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h2>About socrux</h2>
        <p>
          Socrux performs genome structural typing of bacterial chromosomes by identifying
          the order and orientation of DNA fragments between ribosomal RNA operons. It assigns
          a Genome Structure (GS) identifier representing the chromosomal architecture of
          complete bacterial assemblies.
        </p>
        <p>
          This is a browser-based reimplementation of{' '}
          <a href="https://github.com/quadram-institute-bioscience/socru" target="_blank" rel="noopener noreferrer">
            socru
          </a>{' '}
          using WebAssembly-compiled minimap2 for sequence alignment. All processing happens
          entirely in your browser.
        </p>
        <div className="privacy-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>No data leaves your machine — all processing happens client-side using WebAssembly.</p>
        </div>
      </section>

      <section>
        <h2>How It Works</h2>
        <p>
          Bacterial chromosomes contain multiple copies of ribosomal RNA operons (16S-23S-5S).
          These operons divide the chromosome into fragments. The order and orientation of these
          fragments define the genome structure, which can rearrange through large-scale inversions
          around rRNA operons.
        </p>
        <p>
          Socrux detects rRNA operons using minimap2 alignment, extracts the inter-operon fragments,
          classifies each fragment against a species-specific reference database, and assigns a
          GS profile identifier.
        </p>
      </section>

      <section>
        <h2>References</h2>
        <p>
          Page AJ, Ainsworth EV, Langridge GC (2020).
          &ldquo;socru: typing of genome-level order and orientation around ribosomal operons in bacteria.&rdquo;{' '}
          <em>Microbial Genomics</em>, 6(7). DOI:{' '}
          <a href="https://doi.org/10.1099/mgen.0.000396" target="_blank" rel="noopener noreferrer">
            10.1099/mgen.0.000396
          </a>
        </p>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Andrew Page</h3>
        <p className="about-role">Chief Technology Officer, Origin Sciences, Cambridge</p>
        <p>Bioinformatics researcher and software developer specialising in genomics. I build widely used open-source tools, publish peer-reviewed research, and co-host the MicroBinfie podcast.</p>
        <div className="about-links">
          <a href="https://mstdn.science/@andrewjpage" target="_blank" rel="noopener noreferrer">Mastodon: @andrewjpage@mstdn.science</a>
        </div>
      </section>
    </div>
  )
}
