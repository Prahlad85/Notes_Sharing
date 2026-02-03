import React from 'react';
import { FileText, Download, Eye, Share2 } from 'lucide-react';

const NoteCard = ({ note, onView }) => {
  const date = new Date(note.created_at).toLocaleDateString();

  const handleShare = async (e) => {
    e.stopPropagation();
    const shareData = {
      title: note.subject,
      text: `Check out this note: ${note.subject} by ${note.written_by}`,
      url: note.file_url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
           console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(note.file_url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="note-card animate-fade-in">
      <div className="note-header">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="badge">Sem {note.semester}</div>
          <div className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
            {note.exam_type === 'Class Note' ? 'Note' : (note.exam_type || 'Note')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleShare}
            className="btn btn-ghost"
            style={{ 
              padding: '0.4rem', 
              height: '36px', 
              width: '36px', 
              borderRadius: '0.5rem',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
            title="Share"
          >
            <Share2 size={18} />
          </button>
          <div className="note-icon">
            <FileText size={20} />
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem', flex: 1 }}>
        <h4 title={note.subject} style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          {note.subject}
        </h4>
        <div className="note-meta">
          <span>By {note.written_by}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>

      <div className="note-actions">
        <button 
          onClick={() => onView(note)}
          className="btn btn-outline btn-full"
        >
          <Eye size={16} /> View
        </button>
        
        {/* For direct download, we add 'download' attribute, 
            though for some cloud providers this requires response header config */}
        <a 
          href={`${note.file_url}?download=`} 
          download
          target="_blank" 
          rel="noreferrer"
          className="btn btn-primary btn-full"
        >
          <Download size={16} /> Save
        </a>
      </div>
    </div>
  );
};

export default NoteCard;
