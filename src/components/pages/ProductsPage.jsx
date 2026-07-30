import { useEffect, useState } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../client';
import ProductModal from '../ProductModal';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null); // { message, type }
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = "add" mode

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      setStatus({ message: 'Could not load products.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function showStatus(message, type) {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 4000);
  }

  function openAddModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleSave(formValues) {
    const payload = { ...formValues, base_rate_per_m2: Number(formValues.base_rate_per_m2) };
    if (editingProduct) {
      const updated = await updateProduct(editingProduct.id, payload);
      showStatus(`Updated "${updated.name}".`, 'success');
    } else {
      const created = await createProduct(payload);
      showStatus(`Added "${created.name}".`, 'success');
    }
    setModalOpen(false);
    await loadProducts();
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    try {
      await deleteProduct(product.id);
      showStatus(`Deleted "${product.name}".`, 'success');
      await loadProducts();
    } catch (err) {
      showStatus(err.message, 'error');
    }
  }

  return (
    <>
      <div className="admin-header-row">
        <div>
          <h1>Products</h1>
          <p>Everything here also drives the public site's Products grid and quote calculator.</p>
        </div>
        <button className="btn" onClick={openAddModal}>+ Add Product</button>
      </div>

      {status && <div className={`admin-status ${status.type}`}>{status.message}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Use case</th>
              <th>Rate / m²</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="admin-empty">Loading products…</td></tr>
            )}
            {!loading && products.length === 0 && (
              <tr><td colSpan={5} className="admin-empty">No products yet — click "+ Add Product" to create one.</td></tr>
            )}
            {!loading && products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="admin-name-cell">
                    <img
                      className="admin-thumb"
                      src={p.image_url || 'https://placehold.co/80x60/EDEFEF/201D1A?text=No+Image'}
                      alt=""
                    />
                    <div>
                      <b>{p.name}</b>
                      <span>#{p.id} &middot; {p.dimensions || '—'}</span>
                    </div>
                  </div>
                </td>
                <td>{p.category}</td>
                <td>{p.use_case}</td>
                <td>KSh {Number(p.base_rate_per_m2).toLocaleString()}</td>
                <td>
                  <div className="admin-row-actions">
                    <button onClick={() => openEditModal(p)}>Edit</button>
                    <button className="danger" onClick={() => handleDelete(p)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ProductModal
          product={editingProduct}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
