import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchQuoteRequests } from '../../client';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        // per_page: 1 because we only need the `total` count from each
        // response, not the actual list of items -- keeps these two
        // stat-card queries cheap regardless of how many quotes exist.
        const [products, allQuotes, newQuotes] = await Promise.all([
          fetchProducts(),
          fetchQuoteRequests({ perPage: 1 }),
          fetchQuoteRequests({ status: 'new', perPage: 1 }),
        ]);
        setStats({
          productCount: products.length,
          quoteCount: allQuotes.total,
          newQuoteCount: newQuotes.total,
        });
      } catch (err) {
        setError('Could not load dashboard data.');
      }
    }
    loadStats();
  }, []);

  return (
    <>
      <div className="admin-header-row">
        <div>
          <h1>Dashboard</h1>
          <p>A quick snapshot of what's happening on the site.</p>
        </div>
      </div>

      {error && <div className="admin-status error">{error}</div>}

      {stats && (
        <div className="stat-grid">
          <Link to="/products" className="stat-card">
            <div className="label">Products</div>
            <div className="value">{stats.productCount}</div>
          </Link>
          <Link to="/quotes" className="stat-card">
            <div className="label">Quote Requests</div>
            <div className="value">{stats.quoteCount}</div>
          </Link>
          <Link to="/quotes" className="stat-card">
            <div className="label">New / Unread Quotes</div>
            <div className="value">{stats.newQuoteCount}</div>
          </Link>
        </div>
      )}

      {!stats && !error && (
        <p style={{ fontFamily: 'var(--mono)', color: 'var(--graphite-soft)' }}>Loading…</p>
      )}
    </>
  );
}
