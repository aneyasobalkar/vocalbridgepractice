// Upload button for travel documents (passport scans, itineraries, etc.)
// referenced during a voice session. Uploads go straight to the backend
// (server/upload.js) so the agent can look them up mid-call.
import { useRef, useState } from 'react';
import { CloseIcon, FileIcon, ImageFileIcon, PaperclipIcon, PdfFileIcon } from './icons';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ name }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfFileIcon />;
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <ImageFileIcon />;
  return <FileIcon />;
}

export default function AttachmentUpload({ uploadUrl = '/api/upload' }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);

  function updateFile(localId, patch) {
    setFiles((prev) => prev.map((f) => (f.localId === localId ? { ...f, ...patch } : f)));
  }

  async function uploadOne(file) {
    const localId = `${file.name}-${Date.now()}-${Math.random()}`;
    setFiles((prev) => [...prev, { localId, name: file.name, size: file.size, status: 'uploading' }]);

    if (file.size > MAX_FILE_SIZE) {
      updateFile(localId, { status: 'error', error: 'File too large (max 20MB)' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(uploadUrl, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      updateFile(localId, { status: 'done', id: data.id });
    } catch (err) {
      updateFile(localId, { status: 'error', error: err.message });
    }
  }

  function handleFiles(fileList) {
    Array.from(fileList).forEach(uploadOne);
  }

  async function removeFile(file) {
    setFiles((prev) => prev.filter((f) => f.localId !== file.localId));
    if (file.id) {
      try {
        await fetch(`${uploadUrl}/${file.id}`, { method: 'DELETE' });
      } catch {
        // best-effort cleanup; the file just becomes orphaned server-side
      }
    }
  }

  return (
    <div className="attachments">
      <div className="attachments-header">
        <div>
          <h2>Travel documents</h2>
          <span className="card-subtitle">Passport, itinerary, or booking confirmations</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          <PaperclipIcon /> Add attachment
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {files.length === 0 ? (
        <p className="attachments-empty">No documents attached yet</p>
      ) : (
        <ul className="attachment-list">
          {files.map((file) => (
            <li key={file.localId} className={`attachment-item status-${file.status}`}>
              <span className="attachment-icon">
                <FileTypeIcon name={file.name} />
              </span>
              <div className="attachment-info">
                <span className="attachment-name">{file.name}</span>
                <span className="attachment-meta">
                  {file.status === 'error' ? file.error : formatSize(file.size)}
                </span>
              </div>
              {file.status === 'uploading' && <span className="attachment-spinner" />}
              <button
                type="button"
                className="attachment-remove"
                onClick={() => removeFile(file)}
                aria-label={`Remove ${file.name}`}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
