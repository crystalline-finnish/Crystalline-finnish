import { useEffect, useState } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject, API_BASE } from '../../client';
import ProjectModal from '../ProjectModal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setStatus({ message: 'Could not load projects.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function showStatus(message, type) {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 4000);
  }

  function openAddModal() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEditModal(project) {
    setEditingProject(project);
    setModalOpen(true);
  }

  async function handleSave(formValues) {
    if (editingProject) {
      const updated = await updateProject(editingProject.id, formValues);
      showStatus(`Updated "${updated.title}".`, 'success');
    } else {
      const created = await createProject(formValues);
      showStatus(`Added "${created.title}".`, 'success');
    }
    setModalOpen(false);
    await loadProjects();
  }

  async function handleDelete(project) {
    if (!window.confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    try {
      await deleteProject(project.id);
      showStatus(`Deleted "${project.title}".`, 'success');
      await loadProjects();
    } catch (err) {
      showStatus(err.message, 'error');
    }
  }

  function imgUrl(url) {
    return url && url.startsWith('http') ? url : `${API_BASE}${url}`;
  }

  return (
    <>
      <div className="admin-header-row">
        <div>
          <h1>Projects</h1>
          <p>Before/after entries shown on the public Projects page.</p>
        </div>
        <button className="btn" onClick={openAddModal}>+ Add Project</button>
      </div>

      {status && <div className={`admin-status ${status.type}`}>{status.message}</div>}

      {loading && <p style={{ fontFamily: 'var(--mono)', color: 'var(--graphite-soft)' }}>Loading…</p>}

      {!loading && projects.length === 0 && (
        <div className="admin-table-wrap">
          <div className="admin-empty">No projects yet — click "+ Add Project" to create one.</div>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {projects.map((p) => (
            <div key={p.id} className="admin-table-wrap">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <img src={imgUrl(p.before_image_url)} alt="Before" style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                <img src={imgUrl(p.after_image_url)} alt="After" style={{ width: '100%', height: 110, objectFit: 'cover' }} />
              </div>
              <div style={{ padding: 16 }}>
                <b>{p.title}</b>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--graphite-soft)', marginTop: 4 }}>
                  {p.category}{p.caption ? ` · ${p.caption}` : ''}
                </div>
                <div className="admin-row-actions" style={{ marginTop: 12 }}>
                  <button onClick={() => openEditModal(p)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(p)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ProjectModal
          project={editingProject}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
