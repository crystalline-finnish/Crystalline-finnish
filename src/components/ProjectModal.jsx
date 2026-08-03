import { useState, useEffect } from 'react';
import { uploadProjectImage, API_BASE } from '../client';

const emptyForm = {
  title: '', caption: '', category: 'residential',
  before_image_url: '', after_image_url: '',
};

export default function ProjectModal({ project, onSave, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(project);

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title || '',
        caption: project.caption || '',
        category: project.category || 'residential',
        before_image_url: project.before_image_url || '',
        after_image_url: project.after_image_url || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [project]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function normalizeImageUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}/${url}`;
  }

  function previewUrl(url) {
    if (!url) return null;
    return normalizeImageUrl(url);
  }

  async function handleImageUpload(e, field, setUploading) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadProjectImage(file);
      updateField(field, normalizeImageUrl(result.url));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.before_image_url || !form.after_image_url) {
      setError('Both a Before and an After photo are required.');
      return;
    }

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
        <h2>{isEditing ? 'Edit Project' : 'Add Project'}</h2>

        {error && <div className="admin-status error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pTitle">Title</label>
            <input id="pTitle" required value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Kileleshwa Residence" />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="pCategory">Category</label>
              <select id="pCategory" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="apartments">Apartments</option>
                <option value="offices">Offices</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="pCaption">Caption (optional)</label>
              <input id="pCaption" value={form.caption} onChange={(e) => updateField('caption', e.target.value)} placeholder="e.g. Aluminium sliding windows, 12 openings" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="pBeforeFile">Before photo</label>
              <input id="pBeforeFile" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'before_image_url', setUploadingBefore)} />
              {uploadingBefore && <p style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', marginTop: 6 }}>Uploading…</p>}
              {form.before_image_url && (
                <img src={previewUrl(form.before_image_url)} alt="Before preview" style={{ marginTop: 10, width: '100%', maxHeight: 120, objectFit: 'cover', border: '1.5px solid var(--charcoal)' }} />
              )}
            </div>
            <div className="field">
              <label htmlFor="pAfterFile">After photo</label>
              <input id="pAfterFile" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'after_image_url', setUploadingAfter)} />
              {uploadingAfter && <p style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', marginTop: 6 }}>Uploading…</p>}
              {form.after_image_url && (
                <img src={previewUrl(form.after_image_url)} alt="After preview" style={{ marginTop: 10, width: '100%', maxHeight: 120, objectFit: 'cover', border: '1.5px solid var(--charcoal)' }} />
              )}
            </div>
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={saving || uploadingBefore || uploadingAfter}>
              {saving ? 'Saving…' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
