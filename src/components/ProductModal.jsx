import { useState, useEffect } from 'react';
import { uploadProductImage, API_BASE } from '../client';

const emptyForm = {
  name: '', category: 'aluminium', use_case: 'residential', description: '',
  dimensions: '', glass_thickness: '', frame_colors: '', energy_rating: '',
  base_rate_per_m2: '', image_url: '',
};

export default function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isEditing = Boolean(product);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        category: product.category || 'aluminium',
        use_case: product.use_case || 'residential',
        description: product.description || '',
        dimensions: product.dimensions || '',
        glass_thickness: product.glass_thickness || '',
        frame_colors: (product.frame_colors || []).join(','),
        energy_rating: product.energy_rating || '',
        base_rate_per_m2: product.base_rate_per_m2 ?? '',
        image_url: product.image_url || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [product]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const { url } = await uploadProductImage(file);
      // Store the full URL (API_BASE + relative path) so the image renders
      // correctly both in this modal's preview and later on the public
      // site, which reads image_url directly with no base-path logic.
      updateField('image_url', `${API_BASE}${url}`);
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = ''; // allow re-selecting the same file if needed
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <h2>{isEditing ? 'Edit Product' : 'Add Product'}</h2>

        {error && <div className="admin-status error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fName">Name</label>
            <input id="fName" required value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="fCategory">Category</label>
              <select id="fCategory" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                <option value="aluminium">Aluminium</option>
                <option value="upvc">uPVC</option>
                <option value="glass">Glass</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="fUseCase">Use case</label>
              <select id="fUseCase" value={form.use_case} onChange={(e) => updateField('use_case', e.target.value)}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="residential,commercial">Both</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="fDescription">Description</label>
            <textarea id="fDescription" rows={2} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="fDimensions">Dimensions</label>
              <input id="fDimensions" placeholder="e.g. Up to 2400x1800mm" value={form.dimensions} onChange={(e) => updateField('dimensions', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fGlassThickness">Glass thickness</label>
              <input id="fGlassThickness" placeholder="e.g. 4mm / 6mm / 8mm" value={form.glass_thickness} onChange={(e) => updateField('glass_thickness', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="fFrameColors">Frame colors (comma-separated)</label>
              <input id="fFrameColors" placeholder="Charcoal,Champagne,White" value={form.frame_colors} onChange={(e) => updateField('frame_colors', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fEnergyRating">Energy rating</label>
              <input id="fEnergyRating" placeholder="e.g. Std / Double-glazed" value={form.energy_rating} onChange={(e) => updateField('energy_rating', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="fRate">Base rate per m² (KES)</label>
              <input id="fRate" type="number" step="0.01" required value={form.base_rate_per_m2} onChange={(e) => updateField('base_rate_per_m2', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fImageFile">Product image</label>
              <input
                id="fImageFile"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && (
                <p style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--graphite-soft)', marginTop: 6 }}>
                  Uploading…
                </p>
              )}
              {uploadError && (
                <p style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#c0392b', marginTop: 6 }}>
                  {uploadError}
                </p>
              )}
              {form.image_url && !uploading && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    style={{ width: 72, height: 54, objectFit: 'cover', border: '1.5px solid var(--charcoal)' }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--graphite-soft)', wordBreak: 'break-all' }}>
                    {form.image_url}
                  </span>
                </div>
              )}
              <input
                type="url"
                placeholder="…or paste an image URL directly"
                value={form.image_url}
                onChange={(e) => updateField('image_url', e.target.value)}
                style={{ marginTop: 10 }}
              />
            </div>
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
