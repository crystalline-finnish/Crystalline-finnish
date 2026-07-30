import { useEffect, useState, Fragment } from 'react';
import { fetchQuoteRequests, updateQuoteStatus, API_BASE } from '../../client';

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

function isImageFile(filename) {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function QuoteRequestsPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 10;

  async function loadQuotes(currentFilter = filter, currentPage = page) {
    setLoading(true);
    try {
      const data = await fetchQuoteRequests({
        status: currentFilter,
        page: currentPage,
        perPage: PER_PAGE,
      });
      setQuotes(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setStatus({ message: 'Could not load quote requests.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(newFilter) {
    setFilter(newFilter);
    setPage(1);
    loadQuotes(newFilter, 1);
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadQuotes(filter, newPage);
  }

  async function handleStatusChange(quote, newStatus) {
    try {
      await updateQuoteStatus(quote.id, newStatus);
      setQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, status: newStatus } : q))
      );
      setStatus({ message: `Marked "${quote.name}" as ${newStatus}.`, type: 'success' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <>
      <div className="admin-header-row">
        <div>
          <h1>Quote Requests</h1>
          <p>Submissions from the "Request a Quote" form on the public site.</p>
        </div>
      </div>

      <div className="filter-bar">
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            className={filter === s ? 'active' : ''}
            onClick={() => handleFilterChange(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {status && <div className={`admin-status ${status.type}`}>{status.message}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Location</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="admin-empty">Loading quote requests…</td></tr>
            )}
            {!loading && quotes.length === 0 && (
              <tr><td colSpan={6} className="admin-empty">No quote requests match this filter.</td></tr>
            )}
            {!loading && quotes.map((q) => (
              <Fragment key={q.id}>
                <tr>
                  <td>
                    <div className="admin-name-cell">
                      <div>
                        <b>{q.name}</b>
                        <span>{q.phone} &middot; {q.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{q.product}</td>
                  <td>{q.location}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{formatDate(q.created_at)}</td>
                  <td>
                    <span className={`status-pill ${q.status}`}>{q.status}</span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <select
                        className="status-select"
                        value={q.status}
                        onChange={(e) => handleStatusChange(q, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                        {expandedId === q.id ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === q.id && (
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--cream)' }}>
                      <div style={{ padding: '12px 4px', fontSize: '0.9rem' }}>
                        <p><b>Measurements:</b> {q.measurements || '—'}</p>
                        <p style={{ marginTop: 8 }}><b>Notes:</b> {q.notes || '—'}</p>
                        {q.files && q.files.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <b>Uploaded files ({q.files.length}):</b>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                              {q.files.map((file, i) => {
                                const fullUrl = `${API_BASE}${file.url}`;
                                return isImageFile(file.filename) ? (
                                  <a
                                    key={i}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={file.filename}
                                    style={{ display: 'block' }}
                                  >
                                    <img
                                      src={fullUrl}
                                      alt={file.filename}
                                      style={{
                                        width: 90, height: 68, objectFit: 'cover',
                                        border: '1.5px solid var(--charcoal)',
                                      }}
                                    />
                                  </a>
                                ) : (
                                  <a
                                    key={i}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn outline"
                                    style={{ fontSize: '0.72rem', padding: '10px 14px' }}
                                  >
                                    📄 {file.filename}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && total > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 20, flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--graphite-soft)' }}>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn outline"
              style={{ padding: '9px 16px', fontSize: '0.75rem' }}
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              ← Prev
            </button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn outline"
              style={{ padding: '9px 16px', fontSize: '0.75rem' }}
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
