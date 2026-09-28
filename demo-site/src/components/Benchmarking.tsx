export default function Benchmarking() {
  return (
    <section className="section" id="benchmarking">
      <div className="section-inner">
        <h2 className="section-title">
          Bench<span className="gradient-text">marking</span>
        </h2>

        <div className="bm-summary">
          <p className="bm-eyebrow">Benchmarking</p>
          <p className="bm-headline">
            Evaluated across 109 papers, zero-shot, no human correction.
          </p>

          <div className="bm-summary-stats">
            <div className="bm-summary-stat">
              <span className="bm-summary-num">109</span>
              <span className="bm-summary-label">papers</span>
            </div>
            <div className="bm-summary-stat">
              <span className="bm-summary-num">1,274</span>
              <span className="bm-summary-label">extractions</span>
            </div>
            <div className="bm-summary-stat">
              <span className="bm-summary-num">25</span>
              <span className="bm-summary-label">question fields</span>
            </div>
          </div>

          <div className="bm-summary-row">
            <div className="bm-summary-block">
              <p className="bm-block-title">Dataset</p>
              <p className="bm-block-body">
                ORKG-sourced, verified against expert-annotated KG-EmpiRE.
                OA and publisher PDFs across RE and REFSQ proceedings.
              </p>
            </div>
            <div className="bm-summary-block">
              <p className="bm-block-title">Pass criteria</p>
              <p className="bm-block-body">
                An extraction passes when it matches the expert-annotated
                reference field for field, graded automatically with no
                manual override.
              </p>
            </div>
          </div>

          <p className="bm-block-title">Results by question type</p>
          <div className="comparison-table-wrap bm-results-table">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Data Type</th>
                  <th scope="col">N</th>
                  <th scope="col">GPT-3.5</th>
                  <th scope="col">GPT-4o-mini</th>
                  <th scope="col">GPT-4o-mini + Ctx</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Boolean</th>
                  <td>413</td>
                  <td>54.7% (226)</td>
                  <td>57.4% (237)</td>
                  <td>61.7% (255)</td>
                </tr>
                <tr>
                  <th scope="row">Multi-Select</th>
                  <td>379</td>
                  <td>29.3% (111)</td>
                  <td>59.4% (225)</td>
                  <td>60.7% (230)</td>
                </tr>
                <tr>
                  <th scope="row">Single-Select</th>
                  <td>254</td>
                  <td>44.9% (114)</td>
                  <td>62.6% (159)</td>
                  <td>59.4% (151)</td>
                </tr>
                <tr>
                  <th scope="row">Abstract Text</th>
                  <td>228</td>
                  <td>28.1% (64)</td>
                  <td>34.6% (79)</td>
                  <td>49.6% (113)</td>
                </tr>
                <tr className="comparison-table__total-row">
                  <th scope="row">TOTAL</th>
                  <td>1,274</td>
                  <td>40.4% (515)</td>
                  <td>54.9% (700)</td>
                  <td>58.8% (749)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <a href="#benchmarking/details" className="bm-summary-link">
            See the full evaluation →
          </a>
        </div>
      </div>
    </section>
  );
}
