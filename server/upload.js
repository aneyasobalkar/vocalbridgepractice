// Backend route for uploading travel documents (passport scans, itineraries,
// booking confirmations) so the agent can reference them during a call.
// Mount with:
//   const upload = require('./server/upload');
//   app.use('/api', upload);
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

// Disk filename -> original metadata, so DELETE never has to trust a
// client-supplied path (avoids path traversal entirely).
const fileIndex = new Map();

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const id = path.parse(req.file.filename).name;
    fileIndex.set(id, {
      diskFilename: req.file.filename,
      originalName: req.file.originalname,
    });

    res.status(201).json({
      id,
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

router.delete('/upload/:id', (req, res) => {
  const entry = fileIndex.get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlink(path.join(UPLOAD_DIR, entry.diskFilename), (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Failed to delete file:', err);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
    fileIndex.delete(req.params.id);
    res.status(204).end();
  });
});

module.exports = router;
