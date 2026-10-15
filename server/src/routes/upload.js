// Image uploads → Cloudinary (free tier, no credit card required).
//
// multer keeps files in memory (never touches local disk); each buffer is
// magic-byte sniffed (mimetype alone is spoofable) and then streamed to
// Cloudinary. Returned URLs are the CDN `secure_url`s.
//
// Config: CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
// Get it from cloudinary.com → Dashboard → API Keys. Set it as an env var
// (Netlify → Environment variables); the SDK reads it automatically.
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
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

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'roomie', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/upload — authenticated image upload, returns download URLs
router.post('/', authRequired, (req, res) => {
  upload.array('images', 8)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!process.env.CLOUDINARY_URL) {
      return res.status(500).json({ error: 'Photo uploads are not configured yet' });
    }
    try {
      const files = req.files || [];
      for (const f of files) {
        if (!sniffImage(f.buffer)) {
          return res.status(400).json({ error: `File "${f.originalname}" is not a valid image` });
        }
      }
      // Upload in parallel — keeps serverless invocations well under the
      // platform timeout even with several photos.
      const urls = await Promise.all(
        files.map((f) => uploadBuffer(f.buffer).then((r) => r.secure_url))
      );
      res.status(201).json({ urls });
    } catch (e) {
      console.error('upload failed:', e.message);
      res.status(500).json({ error: 'Upload failed — please try again' });
    }
  });
});

module.exports = router;
