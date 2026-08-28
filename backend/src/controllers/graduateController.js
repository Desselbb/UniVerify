const qrcode = require('qrcode');
const { Credential, Institution } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

function verificationUrl(hash) {
  const base = process.env.CORS_ORIGIN || 'http://localhost:3000';
  return `${base}/verify/${hash}`;
}

async function listMyCredentials(req, res, next) {
  try {
    const credentials = await Credential.findAll({
      where: { studentName: req.user.fullName },
      include: [{ model: Institution, as: 'institution' }],
      order: [['graduationDate', 'DESC']]
    });
    res.json({ credentials });
  } catch (error) {
    next(error);
  }
}

async function getShareLink(req, res, next) {
  try {
    const credential = await Credential.findOne({ where: { hash: req.params.hash } });
    if (!credential) {
      throw new ApiError(404, 'Credential not found');
    }

    const url = verificationUrl(credential.hash);
    res.json({ url, qrCodeDataUrl: await qrcode.toDataURL(url) });
  } catch (error) {
    next(error);
  }
}

module.exports = { listMyCredentials, getShareLink };
