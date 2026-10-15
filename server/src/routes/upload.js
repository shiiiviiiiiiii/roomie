// Image uploads → Firebase Cloud Storage.
//
// multer keeps files in memory (never touches local disk); each buffer is
// magic-byte sniffed (mimetype alone is spoofable) and then written to the
// bucket. Returned URLs are Firebase-style download URLs
// (…?alt=media&token=…): the unguessable token in the object's metadata
// grants read access, so the same URL shape works against the Storage
// emulator and in production — no per-object IAM changes needed, and the
// locked-down storage.rules stay as they are.
const express = require('express');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { bucket } = require('../firebase');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (jpg, png, webp, gif) are allowed'));
  },
});

// Verify the actual file signature — the client-supplied mimetype is not
// trustworthy on its own.
function sniffImage(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function downloadUrl(file, token) {
  const path = `/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
  const emuHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  // Production: the firebasestorage.googleapis.com download endpoint.
  // Emulator: the same path shape served locally.
  return emuHost ? `http://${emuHost}${path}` : `https://firebasestorage.googleapis.com${path}`;
}

// POST /api/upload — authenticated image upload, returns download URLs
router.post('/', authRequired, (req, res) => {
  upload.array('images', 8)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const urls = [];
      for (const f of req.files || []) {
        const kind = sniffImage(f.buffer);
        if (!kind) {
          return res.status(400).json({ error: `File "${f.originalname}" is not a valid image` });
        }
        const token = randomUUID();
        const name = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}.${kind}`;
        const file = bucket.file(name);
        await file.save(f.buffer, {
          metadata: {
            contentType: f.mimetype,
            metadata: { firebaseStorageDownloadTokens: token },
          },
        });
        urls.push(downloadUrl(file, token));
      }
      res.status(201).json({ urls });
    } catch (e) {
      console.error('upload failed:', e.message);
      res.status(500).json({ error: 'Upload failed — please try again' });
    }
  });
});

module.exports = router;
