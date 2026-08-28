const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificationController = require('../controllers/verificationController');
const { rateLimit } = require('../middleware/rateLimit');

const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG are allowed.'));
    }
  }
});

// Public verification endpoints
router.post('/file',
  rateLimit('verification', { max: 100, windowMs: 3600000 }),
  upload.single('certificateFile'),
  verificationController.verifyFile
);

router.get('/:hash',
  rateLimit('verification', { max: 100, windowMs: 3600000 }),
  verificationController.verifyByHash
);

router.post('/bulk',
  rateLimit('verification-bulk', { max: 20, windowMs: 3600000 }),
  upload.array('certificateFiles', 10),
  verificationController.verifyBulk
);

router.get('/:hash/certificate',
  verificationController.downloadVerificationCertificate
);

module.exports = router;
