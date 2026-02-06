import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Edit2, X, Home, LogOut, ChevronDown, Filter, Loader2, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = ({ role }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manage'
  const [uploading, setUploading] = useState(false);
  // ... (rest of state)


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
    exam_type: 'Class Note', // Default
  });
  const [files, setFiles] = useState([]); // Array of files
  const [currentFileIndex, setCurrentFileIndex] = useState(0); 
  const [message, setMessage] = useState(null); 
  const [filterType, setFilterType] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  
  // Managing Notes State
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editNote, setEditNote] = useState(null); // Note object being edited
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

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
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one file.' });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        const file = files[i];
        setUploadProgress(0);

        // Size Check (50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 50MB limit.`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`; // Add index to avoid collision
        const filePath = `${fileName}`;

        // Upload single file via XHR
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
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Upload failed for ${file.name}: ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error uploading ${file.name}`));
          xhr.send(file); 
        });

        // Get URL
        const { data: { publicUrl } } = supabase.storage
          .from('notes')
          .getPublicUrl(filePath);

        // Insert Record
        const { error: dbError } = await supabase
          .from('notes')
          .insert([
            {
              written_by: formData.written_by,
              subject: formData.subject,
              semester: parseInt(formData.semester),
              exam_type: formData.exam_type || 'Class Note', // Save Exam Type
              file_url: publicUrl,
              user_id: session.user.id,
            },
          ]);

        if (dbError) throw dbError;
      }

      setMessage({ type: 'success', text: `Successfully uploaded ${files.length} notes!` });
      setFormData({ ...formData, subject: '' });
      setFiles([]);
      document.getElementById('file-upload').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: error.message || 'Error uploading notes.' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFileIndex(0);
    }
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
      showToast('Note deleted successfully!', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete note.', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const togglePin = async (note) => {
    try {
      const newStatus = !note.is_pinned;
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: newStatus })
        .eq('id', note.id);

      if (error) throw error;

      setNotes(notes.map(n => n.id === note.id ? { ...n, is_pinned: newStatus } : n));
      showToast(newStatus ? 'Note Pinned!' : 'Note Unpinned', 'success');
    } catch (error) {
        console.error('Pin error', error);
        showToast('Failed to update pin status. Ensure "is_pinned" column exists in DB.', 'error');
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
      setNotes(notes.map(n => n.id === editNote.id ? editNote : n));
      setEditNote(null);
      showToast('Note updated successfully!', 'success');
    } catch (error) {
      console.error('Update error:', error);
      showToast('Failed to update note.', 'error');
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
      
      <div className="dashboard-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem' 
      }}>
        <div>
          <h2 style={{ fontSize: '2rem', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>Admin Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Welcome back, Dashrath</p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="btn btn-danger"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LogOut size={16} /> Sign Out
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
        {role === 'super_admin' && (
          <button 
            className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('admins')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Users size={18} /> Admins
          </button>
        )}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Material Type</label>
                  <select
                    className="input-field"
                    value={formData.exam_type || 'Class Note'}
                    onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                  >
                    <option value="Class Note">Note</option>
                    <option value="MST1">MST1</option>
                    <option value="MST2">MST2</option>
                    <option value="Final Exam">Final Exam</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Files (PDF & Images)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    required
                  />
                  <label 
                    htmlFor="file-upload"
                    className="input-field"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem', 
                      cursor: 'pointer',
                      borderStyle: 'dashed',
                      minHeight: '120px',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <Upload size={24} color="var(--primary)" />
                    {files.length > 0 ? (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{files.length} file(s) selected</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {Array.from(files).map(f => f.name).join(', ')}
                        </p>
                      </div>
                    ) : (
                      <span>Click to select PDFs or Images</span>
                    )}
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Uploading {currentFileIndex + 1}/{files.length}... {uploadProgress}%</span>
                  </div>
                ) : (
                  <><FileText size={18} /> Upload All Files</>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : activeTab === 'manage' ? (
        /* MANAGE TAB */
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Manage Notes</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ width: '200px' }}>
                <CustomDropdown
                  icon={Filter}
                  value={filterSemester}
                  onChange={setFilterSemester}
                  options={[
                    { value: 'All', label: 'All Semesters' },
                    ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: n, label: `Semester ${n}` }))
                  ]}
                />
              </div>

              <div style={{ width: '200px' }}>
                <CustomDropdown
                    icon={Filter}
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'All', label: 'All Materials' },
                      { value: 'Class Note', label: 'Notes' },
                      { value: 'MST1', label: 'MST1 Papers' },
                      { value: 'MST2', label: 'MST2 Papers' },
                      { value: 'Final Exam', label: 'Final Exams' }
                    ]}
                  />
              </div>
            </div>
          </div>

          {loadingNotes ? (
             <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : notes.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notes uploaded yet.</div>
          ) : (
            <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem' }}>Type</th>
                    <th style={{ padding: '1rem' }}>Subject</th>
                    <th style={{ padding: '1rem' }}>Written By</th>
                    <th style={{ padding: '1rem' }}>Sem</th>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.filter(n => {
                    const matchType = filterType === 'All' || n.exam_type === filterType;
                    const matchSem = filterSemester === 'All' || n.semester.toString() === filterSemester.toString();
                    return matchType && matchSem;
                  }).map(note => (
                    <tr key={note.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={{ fontSize: '0.8rem', background: 'var(--primary)', color: 'white' }}>
                          {note.exam_type === 'Class Note' ? 'Note' : (note.exam_type || 'Note')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{note.subject}</td>
                      <td style={{ padding: '1rem' }}>{note.written_by}</td>
                      <td style={{ padding: '1rem' }}>{note.semester}</td>
                      <td style={{ padding: '1rem' }}>{new Date(note.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => togglePin(note)}
                          className={`btn ${note.is_pinned ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={note.is_pinned ? "Unpin Note" : "Pin Note"}
                        >
                          <Pin size={16} fill={note.is_pinned ? "currentColor" : "none"} />
                        </button>
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
              {notes.filter(n => {
                const matchType = filterType === 'All' || n.exam_type === filterType;
                const matchSem = filterSemester === 'All' || n.semester.toString() === filterSemester.toString();
                return matchType && matchSem;
              }).length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notes found for this category.</div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'admins' ? (
        <AdminManager showToast={showToast} />
      ) : (
        /* NOTICE TAB */
        <NoticeManager showToast={showToast} />
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 2000,
          background: 'var(--bg-card)',
          border: `1px solid ${toast.type === 'success' ? '#22c55e' : toast.type === 'loading' ? '#3b82f6' : '#ef4444'}`,
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: '300px'
        }}>
           <div style={{
             width: '24px',
             height: '24px',
             borderRadius: '50%',
             background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : toast.type === 'loading' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             color: toast.type === 'success' ? '#22c55e' : toast.type === 'loading' ? '#3b82f6' : '#ef4444'
           }}>
             {toast.type === 'success' ? <CheckCircle size={14} /> : toast.type === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
           </div>
           <div>
             <h4 style={{ fontSize: '0.9rem', margin: 0 }}>
              {toast.type === 'success' ? 'Success' : toast.type === 'loading' ? 'Processing' : 'Error'}
             </h4>
             <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{toast.message}</p>
           </div>
           <button 
             onClick={() => setToast(prev => ({ ...prev, show: false }))}
             style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
           >
             <X size={16} />
           </button>
        </div>
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

const NoticeManager = ({ showToast }) => {
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
    showToast('Saving changes...', 'loading');
    
    // Upsert ID 1
    const { error } = await supabase.from('notices').upsert({
      id: 1,
      content: notice,
      is_active: isActive
    });

    if (error) {
      showToast('Error updating notice', 'error');
    } else {
      showToast('Notice updated successfully!', 'success');
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

const AdminManager = ({ showToast }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .neq('id', session.user.id); // Don't show self

    if (error) console.error(error);
    else setAdmins(data || []);
    setLoading(false);
  };

  const updateRole = async (id, updates) => {
    const { error } = await supabase
      .from('user_roles')
      .update(updates)
      .eq('id', id);

    if (error) {
      showToast('Error updating admin', 'error');
    } else {
      setAdmins(admins.map(a => a.id === id ? { ...a, ...updates } : a));
      showToast('Admin updated successfully!', 'success');
    }
  };

  const deleteAllContent = async (userId) => {
    if (!window.confirm('Are you sure you want to delete ALL notes uploaded by this user? This cannot be undone.')) return;

    showToast('Deleting content...', 'loading');
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('user_id', userId);

    if (error) {
      showToast('Error deleting content', 'error');
      console.error(error);
    } else {
      showToast('All notes by this user deleted.', 'success');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Manage Admins</h3>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
      ) : admins.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No other admins found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Joined</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{admin.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {admin.id.substring(0, 8)}...</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {admin.is_blocked ? (
                      <span className="badge" style={{ background: '#ef4444', color: 'white' }}>Blocked</span>
                    ) : admin.role === 'pending' ? (
                       <span className="badge" style={{ background: '#f59e0b', color: 'black' }}>Pending</span>
                    ) : (
                       <span className="badge" style={{ background: '#22c55e', color: 'white' }}>Active</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Approve Button */}
                    {admin.role === 'pending' && (
                      <button 
                         onClick={() => updateRole(admin.id, { role: 'admin' })}
                         className="btn btn-sm btn-primary"
                      >
                         Approve
                      </button>
                    )}
                    
                    {/* Block/Unblock Button */}
                    <button 
                       onClick={() => updateRole(admin.id, { is_blocked: !admin.is_blocked })}
                       className={`btn btn-sm ${admin.is_blocked ? 'btn-outline' : 'btn-danger'}`}
                    >
                       {admin.is_blocked ? 'Unblock' : 'Block'}
                    </button>

                    {/* Delete Content Button */}
                    <button 
                       onClick={() => deleteAllContent(admin.id)}
                       className="btn btn-sm btn-ghost"
                       style={{ color: '#ef4444' }}
                       title="Delete all notes by this user"
                    >
                       <Trash2 size={16} /> Content
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Custom Dropdown Component
const CustomDropdown = ({ options, value, onChange, icon: Icon, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value == value);
  const label = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative" ref={dropdownRef} style={{ userSelect: 'none', position: 'relative' }}>
       <div 
        className="custom-dropdown-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderColor: isOpen ? 'var(--primary)' : '' }}
      >
        {Icon && <Icon size={16} style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />}
        <span style={{ flex: 1 }}>{label}</span>
        <ChevronDown size={16} style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </div>

       {isOpen && (
        <div className="custom-options-list">
          {options.map((option) => (
            <div 
              key={option.value} 
              className={`custom-option ${value == option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {value == option.value && <CheckCircle size={14} style={{ color: 'var(--primary)' }} />}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
