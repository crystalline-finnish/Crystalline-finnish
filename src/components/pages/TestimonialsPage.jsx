import { useEffect, useState } from 'react';
import { fetchTestimonials, updateTestimonialStatus, deleteTestimonial } from '../../client';

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [status, setStatus] = useState(null);

  async function load(currentFilter = filter) {
    setLoading(true);
    try {
      const data = await fetchTestimonials(currentFilter);
      setTestimonials(data);
    } catch (err) {
      setStatus({ message: 'Could not load testimonials.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(newFilter) {
    setFilter(newFilter);
    load(newFilter);
  }

  async function handleStatusChange(testimonial, newStatus) {
    try {
      await updateTestimonialStatus(testimonial.id, newStatus);
      setStatus({ message: `Marked "${testimonial.name}"'s review as ${newStatus}.`, type: 'success' });
      setTimeout(() => setStatus(null), 3000);
      await load();
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    }
  }

  async function handleDelete(testimonial) {
    if (!window.confirm(`Permanently delete this review from ${testimonial.name}?`)) return;
    try {
      await deleteTestimonial(testimonial.id);
      setStatus({ message: 'Review deleted.', type: 'success' });
      await load();
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    }
  }

  function stars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  return (
    <>
      <div className="admin-header-row">
        <div>
          <h1>Testimonials</h1>
          <p>Approved reviews show up on the homepage automatically.</p>
        </div>
      </div>

      <div className="filter-bar">
        {['pending', 'approved', 'declined', 'all'].map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => handleFilterChange(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {status && <div className={`admin-status ${status.type}`}>{status.message}</div>}

      {loading && <p style={{ fontFamily: 'var(--mono)', color: 'var(--graphite-soft)' }}>Loading…</p>}

      {!loading && testimonials.length === 0 && (
        <div className="admin-table-wrap">
          <div className="admin-empty">No testimonials in this category.</div>
        </div>
      )}

      {!loading && testimonials.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {testimonials.map((t) => (
            <div key={t.id} className="admin-table-wrap" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ color: 'var(--yellow-dark)', letterSpacing: 2, marginBottom: 6 }}>{stars(t.rating)}</div>
                  <p style={{ marginBottom: 10 }}>{t.message}</p>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--graphite-soft)' }}>
                    {t.name}{t.location ? ` — ${t.location}` : ''} &middot; {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <span className={`status-pill ${t.status}`}>{t.status}</span>
                  <div className="admin-row-actions">
                    {t.status !== 'approved' && (
                      <button onClick={() => handleStatusChange(t, 'approved')}>Approve</button>
                    )}
                    {t.status !== 'declined' && (
                      <button onClick={() => handleStatusChange(t, 'declined')}>Decline</button>
                    )}
                    <button className="danger" onClick={() => handleDelete(t)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
