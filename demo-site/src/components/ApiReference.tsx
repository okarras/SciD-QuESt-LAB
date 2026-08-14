import type { ApiEntry } from '../data/apiReference';
import { apis, typeColorMap } from '../data/apiReference';

function ApiCardBody({ api }: { api: ApiEntry }) {
  return (
    <>
      <h3 className="api-card__name">{api.name}</h3>
      <span className={`api-card__type ${typeColorMap[api.type] || ''}`}>{api.type}</span>
      <p className="api-card__desc">{api.desc}</p>
    </>
  );
}

export default function ApiReference() {
  return (
    <section className="section section--alt" id="api">
      <div className="section-inner">
        <h2 className="section-title">
          API <span className="gradient-text">Reference</span>
        </h2>
        <p className="section-subtitle">
          Main exports from <code>@orkg/scidquest</code>. See the{' '}
          <a
            href="https://gitlab.com/TIBHannover/orkg/scidquest/-/blob/main/README.md"
            target="_blank"
            rel="noreferrer"
          >
            README
          </a>{' '}
          for full prop tables.
        </p>

        <div className="api-grid">
          {apis.map((api) =>
            api.hasDetailPage ? (
              <a
                className="api-card"
                href={`#api/${encodeURIComponent(api.name)}`}
                aria-label={`View details for ${api.name}`}
                key={api.name}
              >
                <ApiCardBody api={api} />
              </a>
            ) : (
              <article className="api-card" key={api.name}>
                <ApiCardBody api={api} />
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}
