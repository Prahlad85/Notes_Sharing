import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Edit2, X } from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manage'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ loaded: 0, total: 0 });
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [formData, setFormData] = useState({
    written_by: 'Dashrath Nandan',
    subject: '',
    semester: '1',
  });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null); 
  
  // Managing Notes State
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editNote, setEditNote] = useState(null); // Note object being edited

  // Fetch notes on mount AND tab change to keep stats fresh
  useEffect(() => {
    fetchNotes();
  }, [activeTab]);

  const fetchNotes = async () => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching notes:', error);
    else setNotes(data || []);
    setLoadingNotes(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file to upload.' });
      return;
    }

    // Check File Size (Limit to 50MB)
    const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 50MB
    if (file.size > FILE_SIZE_LIMIT) {
      setMessage({ type: 'error', text: 'File exceeds 100MB limit. Please compress your PDF.' });
      return;
    }

    // -----------------------------------------------------------------------
    // REAL UPLOAD WITH PROGRESS (using XHR)
    // -----------------------------------------------------------------------
    try {
      setUploading(true);
      setUploadProgress(0);
      setMessage(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // 1. Get Session for Auth Token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // 2. Upload via XHR for Progress Tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/notes/${filePath}`;
        
        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('Content-Type', file.type); 

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
            setUploadStats({ loaded: event.loaded, total: event.total });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        xhr.send(file); 
      });

      // 3. Get Public URL (Standard Supabase)
      const { data: { publicUrl } } = supabase.storage
        .from('notes')
        .getPublicUrl(filePath);

      // 4. Insert into Database
      const { error: dbError } = await supabase
        .from('notes')
        .insert([
          {
            written_by: formData.written_by,
            subject: formData.subject,
            semester: parseInt(formData.semester),
            file_url: publicUrl,
          },
        ]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      setMessage({ type: 'success', text: 'Note uploaded successfully!' });
      setFormData({ written_by: 'Dashrath Nandan', subject: '', semester: '1' });
      setFile(null);
      document.getElementById('file-upload').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: error.message || 'Error uploading note.' });
      setUploading(false);
      setUploadProgress(0);
    }
    // No finally block needed here as we handle state in try/catch
  };

  const [deleteConfirm, setDeleteConfirm] = useState(null); // ID of note to delete

  // Trigger modal
  const handleDeleteClick = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;

    try {
      // 1. Delete from Database
      const { error: dbError } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Delete from Storage (Find URL to get filename)
      const noteToDelete = notes.find(n => n.id === id);
      if (noteToDelete) {
        const fileName = noteToDelete.file_url.split('/').pop();
        if (fileName) {
            await supabase.storage.from('notes').remove([fileName]);
        }
      }

      setNotes(notes.filter(n => n.id !== id));
      // alert('Note deleted.'); // No alert needed with modal
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete note.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editNote) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          written_by: editNote.written_by,
          subject: editNote.subject,
          semester: editNote.semester
        })
        .eq('id', editNote.id);

      if (error) throw error;

      setNotes(notes.map(n => n.id === editNote.id ? editNote : n));
      setEditNote(null);
      alert('Note updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update note.');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, Admin</p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="btn btn-danger"
        >
          Sign Out
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6' }}>
            <FileText size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>{notes.length}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Total Notes</p>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>Active</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Server Status</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}>
            <AlertCircle size={24} />
          </div>
          <div>
             <h3 style={{ fontSize: '1rem', margin: '0 0 0.2rem 0' }}>Notice Board</h3>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Update Exam News</p>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid var(--border-color)', 
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        <button 
          className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('upload')}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <Upload size={18} /> Upload
        </button>
        <button 
          className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('manage')}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <Edit2 size={18} /> Notes List
        </button>
        <button 
          className={`btn ${activeTab === 'notice' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('notice')}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <AlertCircle size={18} /> Notices
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
          {/* ... Upload Code ... */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Upload New Note</h3>
            
            {message && (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: message.type === 'success' ? '#22c55e' : '#ef4444',
                border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}>
                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               {/* ... (Existing Form Content) ... */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Subject</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Physics"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Written By</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Prof. Smith"
                    value={formData.written_by}
                    onChange={(e) => setFormData({ ...formData, written_by: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Semester</label>
                <select
                  className="input-field"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>Semester {num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>File (PDF - Max 100MB)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    required
                  />
                  <label 
                    htmlFor="file-upload"
                    className="input-field"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem', 
                      cursor: 'pointer',
                      borderStyle: 'dashed',
                      minHeight: '100px',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <Upload size={24} color="var(--primary)" />
                    {file ? file.name : 'Click to select PDF'}
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={uploading} style={{ position: 'relative', overflow: 'hidden' }}>
                {uploading ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Uploading... {uploadProgress}%</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total)}
                    </div>
                  </div>
                ) : (
                  <><FileText size={18} /> Upload Note</>
                )}
                
                {uploading && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'rgba(255,255,255,0.2)',
                    transition: 'width 0.5s ease-in-out',
                    zIndex: 1
                  }} />
                )}
              </button>
            </form>
          </div>
        </div>
      ) : activeTab === 'manage' ? (
        /* MANAGE TAB */
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Manage Notes</h3>
          {loadingNotes ? (
             <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : notes.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notes uploaded yet.</div>
          ) : (
            <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem' }}>Written By</th>
                    <th style={{ padding: '1rem' }}>Subject</th>
                    <th style={{ padding: '1rem' }}>Sem</th>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map(note => (
                    <tr key={note.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>{note.written_by}</td>
                      <td style={{ padding: '1rem' }}>{note.subject}</td>
                      <td style={{ padding: '1rem' }}>{note.semester}</td>
                      <td style={{ padding: '1rem' }}>{new Date(note.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-ghost"
                          onClick={() => setEditNote(note)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleDeleteClick(note.id)}
                          style={{ padding: '0.5rem' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* NOTICE TAB */
        <NoticeManager />
      )}

      {/* Edit Modal */}
      {editNote && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Edit Note</h3>
              <button onClick={() => setEditNote(null)} className="btn btn-ghost"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Written By</label>
                <input 
                  className="input-field"
                  value={editNote.written_by} 
                  onChange={e => setEditNote({...editNote, written_by: e.target.value})}
                />
              </div>
              <div>
                <label>Subject</label>
                <input 
                  className="input-field"
                  value={editNote.subject} 
                  onChange={e => setEditNote({...editNote, subject: e.target.value})}
                />
              </div>
              <div>
                <label>Semester</label>
                <select 
                  className="input-field"
                  value={editNote.semester}
                  onChange={e => setEditNote({...editNote, semester: e.target.value})}
                >
                   {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>Semester {num}</option>
                  ))}
                </select>
              </div>
              
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setDeleteConfirm(null)}>
          <div 
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '400px',
              padding: '2rem',
              textAlign: 'center',
              border: '1px solid var(--glass-border)'
            }}
          >
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Trash2 size={24} />
            </div>
            
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Delete Note?</h3>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-ghost"
                style={{ justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="btn btn-danger"
                style={{ justifyContent: 'center' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const NoticeManager = () => {
  const [notice, setNotice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotice();
  }, []);

  const fetchNotice = async () => {
    const { data } = await supabase.from('notices').select('*').eq('id', 1).single();
    if (data) {
      setNotice(data.content);
      setIsActive(data.is_active);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Upsert ID 1
    const { error } = await supabase.from('notices').upsert({
      id: 1,
      content: notice,
      is_active: isActive
    });

    if (error) {
      alert('Error updating notice');
    } else {
      alert('Notice updated! It will appear on the marquee.');
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Update Notice Board</h3>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Notice Message</label>
          <input 
            className="input-field"
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="e.g. Next Exam: Maths - 5 Days Left!"
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            id="active-check"
            style={{ width: '1.2rem', height: '1.2rem' }}
          />
          <label htmlFor="active-check">Show on Home Page</label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Update Notice'}
        </button>
      </form>
    </div>
  );
};

export default Dashboard;
