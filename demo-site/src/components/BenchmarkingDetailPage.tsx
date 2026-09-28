interface BenchmarkingDetailPageProps {
  onBack: () => void;
}

export default function BenchmarkingDetailPage({ onBack }: BenchmarkingDetailPageProps) {
  return (
    <section className="section">
      <div className="section-inner api-detail api-detail--wide bench-detail">
        <button className="btn btn-ghost-light btn-sm api-detail__back" onClick={onBack}>
          ← Back to Benchmarking
        </button>

        <p className="bench-detail__kicker">Benchmarking / public summary</p>
        <h1 className="bench-detail__title">
          Can a model read a paper the way an expert annotator does?
        </h1>
        <p className="api-detail__desc">
          A 109-paper automated evaluation of the EmpiRE-Compass extraction
          system across 25 dynamic question fields, measuring pure zero-shot
          capability with no human correction in the loop.
        </p>

        <div className="bench-detail__stat-rail">
          <div className="bench-detail__stat">
            <span className="bench-detail__stat-num">109</span>
            <span className="bench-detail__stat-label">papers evaluated</span>
          </div>
          <div className="bench-detail__stat">
            <span className="bench-detail__stat-num">1,274</span>
            <span className="bench-detail__stat-label">question extractions graded</span>
          </div>
          <div className="bench-detail__stat">
            <span className="bench-detail__stat-num">25</span>
            <span className="bench-detail__stat-label">dynamic question fields per paper</span>
          </div>
          <div className="bench-detail__stat">
            <span className="bench-detail__stat-num">0</span>
            <span className="bench-detail__stat-label">human-in-the-loop corrections</span>
          </div>
        </div>

        {/* 01 — What we measure */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">01 — What we measure</p>

          <blockquote className="bench-detail__pull">
            Can an LLM accurately extract domain-specific scientific research
            parameters when given different structural context configurations?
          </blockquote>

          <p className="api-detail__desc">
            Each scenario is a verified paper extraction task. A model is shown
            a scientific publication under a particular structural context
            configuration and asked to populate the same 25 fields — things
            like research paradigm, analysis methods, and statistical metrics
            — that an expert annotator would fill in by hand.
          </p>
          <p className="api-detail__desc">
            Recommendations are generated through standard API completions,
            with no intervention or correction along the way. That isolates a
            single question: how good is the model's raw, first-pass reading
            of the paper?
          </p>

          <div className="bench-detail__flow">
            <div className="bench-detail__flow-step">
              <span className="bench-detail__flow-tag">input</span>
              <h4>Paper + context config</h4>
              <p>A verified OA or publisher PDF, paired with one structural context setup.</p>
            </div>
            <div className="bench-detail__flow-arrow">→</div>
            <div className="bench-detail__flow-step">
              <span className="bench-detail__flow-tag">process</span>
              <h4>Zero-shot completion</h4>
              <p>Model fills 25 question fields via a single API call, unedited.</p>
            </div>
            <div className="bench-detail__flow-arrow">→</div>
            <div className="bench-detail__flow-step">
              <span className="bench-detail__flow-tag">output</span>
              <h4>Graded extraction</h4>
              <p>Answer is scored against the expert-annotated KG-EmpiRE reference.</p>
            </div>
          </div>
        </div>

        {/* 02 — Three approaches */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">02 — Three approaches (same task, different context)</p>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Approach</th>
                  <th scope="col">What the model sees</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">GPT-3.5</th>
                  <td>Legacy baseline running the standard zero-shot extraction prompt.</td>
                </tr>
                <tr>
                  <th scope="row">GPT-4o-mini</th>
                  <td>Modern baseline running the standard zero-shot extraction prompt.</td>
                </tr>
                <tr>
                  <th scope="row">GPT-4o-mini + Ctx</th>
                  <td>Primary experimental model with dynamic parent and sibling structural context injected.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="api-detail__desc">
            GPT-4o-mini + Ctx is what you deploy in a live curation workflow: a
            context-aware model receiving compounding chains of verified prior
            answers. GPT-4o-mini (Zero-Shot) acts as an unassisted baseline.
          </p>
          <p className="api-detail__desc">
            The gap between the zero-shot baseline and GPT-4o-mini + Ctx
            measures the isolated impact of structural context injection on
            LLM extraction accuracy.
          </p>
        </div>

        {/* 03 — Pass rule */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">03 — Pass rule (all approaches)</p>
          <p className="api-detail__desc">
            An individual extraction passes when all of the following hold:
          </p>

          <ul className="bench-detail__pass-list">
            <li>
              <strong>Categorical &amp; Boolean</strong> — exact or normalized
              string match score must equal 1.0.
            </li>
            <li>
              <strong>Multi-Select Arrays</strong> — set-based F1-score
              (evaluated via exact, stemmed, or split-word algorithms) must be
              ≥ 0.75.
            </li>
            <li>
              <strong>Abstract Text</strong> — composite semantic similarity
              score (BERTScore, all-MiniLM-L6-v2 cosine, and term containment)
              must be ≥ 0.70.
            </li>
          </ul>

          <p className="api-detail__desc">
            Published evaluation results evaluate the Top-1 suggestion under
            these strict thresholds.
          </p>
        </div>

        {/* 04 — Dataset */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">04 — Dataset</p>

          <p className="api-detail__desc">
            109 scientific publications, yielding 1,274 individually evaluated
            question extractions — drawn dynamically from the Open Research
            Knowledge Graph and checked against the expert-annotated
            KG-EmpiRE dataset.
          </p>

          <div className="bench-detail__composition">
            <div>
              <div className="bench-detail__bar-group">
                <div className="bench-detail__bar-label"><span>Papers</span><span>109</span></div>
                <div className="bench-detail__bar-track"><div className="bench-detail__bar-fill" style={{ width: '100%' }} /></div>
              </div>
              <div className="bench-detail__bar-group">
                <div className="bench-detail__bar-label"><span>Question extractions</span><span>1,274</span></div>
                <div className="bench-detail__bar-track"><div className="bench-detail__bar-fill bench-detail__bar-fill--accent" style={{ width: '100%' }} /></div>
              </div>
              <div className="bench-detail__bar-group">
                <div className="bench-detail__bar-label"><span>Fields per paper</span><span>25</span></div>
                <div className="bench-detail__bar-track"><div className="bench-detail__bar-fill" style={{ width: '22%' }} /></div>
              </div>
            </div>

            <ul className="bench-detail__fact-list">
              <li><span>Source</span><span>Open Research Knowledge Graph</span></li>
              <li><span>Reference</span><span>Expert-annotated KG-EmpiRE</span></li>
              <li><span>Document types</span><span>Open Access + publisher PDFs</span></li>
              <li><span>Venues</span><span>RE &amp; REFSQ proceedings</span></li>
              <li><span>Evaluation type</span><span>Zero-shot, unedited</span></li>
            </ul>
          </div>
        </div>

        {/* 05 — Results */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">05 — Results</p>

          <p className="api-detail__desc">
            Overall Top-1 accuracy across all 1,274 evaluated questions, by
            model. GPT-4o-mini + Ctx is the primary experimental
            configuration — the same model as the zero-shot baseline, with
            dynamic structural context injected.
          </p>

          <div className="bench-detail__bar-group">
            <div className="bench-detail__bar-label"><span>GPT-3.5</span><span>40.4% (515/1,274)</span></div>
            <div className="bench-detail__bar-track"><div className="bench-detail__bar-fill" style={{ width: '40.4%' }} /></div>
          </div>
          <div className="bench-detail__bar-group">
            <div className="bench-detail__bar-label"><span>GPT-4o-mini</span><span>54.9% (700/1,274)</span></div>
            <div className="bench-detail__bar-track"><div className="bench-detail__bar-fill" style={{ width: '54.9%' }} /></div>
          </div>
          <div className="bench-detail__bar-group">
            <div className="bench-detail__bar-label"><span>GPT-4o-mini + Ctx</span><span>58.8% (749/1,274)</span></div>
            <div className="bench-detail__bar-track"><div className="bench-detail__bar-fill bench-detail__bar-fill--accent" style={{ width: '58.8%' }} /></div>
          </div>

          <p className="api-detail__desc">
            Breaking accuracy down by question data type shows where
            structural context helps most — and the one place it doesn't:
          </p>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Data type</th>
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

          <p className="api-detail__desc">
            Structural context drives the largest gain on Abstract Text
            (34.6% → 49.6%) and a solid, stable gain on Boolean fields
            (57.4% → 61.7%). Multi-Select sees a minor positive shift
            (59.4% → 60.7%). Single-Select is the one data type where
            context causes a small regression (62.6% → 59.4%) — see{' '}
            <a href="#bench-caveats">what the numbers do not prove</a> below.
          </p>

          <p className="api-detail__desc">
            The table above grades only the first (Top-1) suggestion the
            model returns, even though the interface shows the curator
            three. Under a relaxed Top-3 metric — a success if any of the
            three clears the threshold — accuracy rises across the board:
            64.2% (818/1,274) for GPT-3.5, 76.1% (969/1,274) for
            GPT-4o-mini, and 77.9% (993/1,274) for GPT-4o-mini + Ctx.
          </p>
        </div>

        {/* 06 — Question fields */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">06 — Question fields</p>
          <p className="api-detail__desc">
            Each paper is scored across 25 fields. A representative sample of
            the categories they fall under:
          </p>

          <div className="bench-detail__field-groups">
            <div className="bench-detail__field-group">
              <h4>Research design</h4>
              <ul>
                <li>Research paradigm</li>
                <li>Research method</li>
                <li>Study type</li>
                <li>Data collection approach</li>
              </ul>
            </div>
            <div className="bench-detail__field-group">
              <h4>Analysis</h4>
              <ul>
                <li>Analysis methods</li>
                <li>Statistical metrics</li>
                <li>Validity considerations</li>
                <li>Tooling used</li>
              </ul>
            </div>
            <div className="bench-detail__field-group">
              <h4>Context</h4>
              <ul>
                <li>Sample / population</li>
                <li>Domain of application</li>
                <li>Replication package</li>
                <li>Limitations reported</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 07 — What the numbers support */}
        <div className="bench-detail__section">
          <p className="api-detail__section-label">07 — What the numbers support</p>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Claim</th>
                  <th scope="col">Supported?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Injecting dynamic structural context (+Ctx) improves overall extraction accuracy vs zero-shot models</td>
                  <td>Yes — primary comparison (58.8% vs 54.9%)</td>
                </tr>
                <tr>
                  <td>Structural context yields massive performance gains on free-form Abstract Text extraction</td>
                  <td>Yes — increases accuracy from 34.6% to 49.6% (+15.0%)</td>
                </tr>
                <tr>
                  <td>Top-3 visual UI suggestions capture the correct answer in the majority of user scenarios</td>
                  <td>Yes — reaches 77.9% overall Top-3 accuracy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 08 — What the numbers do not prove */}
        <div className="bench-detail__section" id="bench-caveats">
          <p className="api-detail__section-label">08 — What the numbers do not prove</p>

          <ul className="bench-detail__caveat-list">
            <li>
              <strong>Not a human-in-the-loop dynamic session benchmark</strong>
              {' '}— evaluates headless zero-shot AI generation before user
              feedback, steering, or manual UI edits occur.
            </li>
            <li>
              <strong>Not a full-dataset benchmark run</strong> — sampled
              execution halted after 109 papers due to statistical
              convergence.
            </li>
            <li>
              <strong>Not a multi-turn memory test</strong> — feedback history
              injection and past interaction loops were deliberately disabled
              to establish a pure baseline.
            </li>
            <li>
              <strong>Not guaranteed performance across all field types</strong>
              {' '}— single-select classification tasks experienced a minor
              regression (-3.2%) when context was applied.
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
}
