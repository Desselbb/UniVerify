const PDFDocument = require('pdfkit');
const { Credential, Institution, VerificationRequest } = require('../models');
const { hashFileBuffer, isValidHash } = require('../services/hashService');
const blockchain = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

async function resolve(hash, { method, req }) {
  const credential = await Credential.findOne({
    where: { hash },
    include: [{ model: Institution, as: 'institution' }]
  });

  let onChain = null;
  try {
    onChain = await blockchain.verifyCredential(hash);
  } catch (error) {
    logger.warn('On-chain lookup unavailable', { hash, error: error.message });
  }

  const exists = Boolean(credential) || Boolean(onChain?.exists);
  const revoked = Boolean(credential?.isRevoked) || Boolean(onChain?.revoked);
  const result = !exists ? 'not_found' : revoked ? 'revoked' : 'valid';

  await VerificationRequest.create({
    hash,
    credentialId: credential?.id ?? null,
    method,
    result,
    requesterIp: req.ip,
    userAgent: req.get('user-agent'),
    details: onChain
  });

  return {
    hash,
    status: result,
    onChain,
    credential: credential
      ? {
          studentName: credential.studentName,
          degree: credential.degree,
          program: credential.program,
          honors: credential.honors,
          graduationDate: credential.graduationDate,
          institution: credential.institution?.name ?? null,
          issuedAt: credential.issuedAt,
          revokedAt: credential.revokedAt,
          revocationReason: credential.revocationReason,
          blockchainTxHash: credential.blockchainTxHash
        }
      : null
  };
}

async function verifyFile(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'certificateFile is required');
    }
    const hash = hashFileBuffer(req.file.buffer);
    res.json(await resolve(hash, { method: 'file', req }));
  } catch (error) {
    next(error);
  }
}

async function verifyByHash(req, res, next) {
  try {
    const { hash } = req.params;
    if (!isValidHash(hash)) {
      throw new ApiError(400, 'Invalid credential hash');
    }
    res.json(await resolve(hash, { method: 'hash', req }));
  } catch (error) {
    next(error);
  }
}

async function verifyBulk(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      throw new ApiError(400, 'certificateFiles is required');
    }

    const results = [];
    for (const file of files) {
      const hash = hashFileBuffer(file.buffer);
      // Sequential so a burst of uploads cannot open one DB/RPC call per file at once.
      const outcome = await resolve(hash, { method: 'bulk', req });
      results.push({ fileName: file.originalname, ...outcome });
    }

    res.json({ count: results.length, results });
  } catch (error) {
    next(error);
  }
}

async function downloadVerificationCertificate(req, res, next) {
  try {
    const { hash } = req.params;
    if (!isValidHash(hash)) {
      throw new ApiError(400, 'Invalid credential hash');
    }

    const outcome = await resolve(hash, { method: 'hash', req });
    if (outcome.status === 'not_found') {
      throw new ApiError(404, 'Credential not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="verification-${hash.slice(0, 10)}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text('Uni-Verify Verification Report', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Credential hash: ${hash}`);
    doc.text(`Status: ${outcome.status.toUpperCase()}`);
    doc.text(`Verified at: ${new Date().toISOString()}`).moveDown();

    if (outcome.credential) {
      doc.text(`Student: ${outcome.credential.studentName}`);
      doc.text(`Degree: ${outcome.credential.degree}`);
      doc.text(`Institution: ${outcome.credential.institution ?? 'n/a'}`);
      doc.text(`Graduation date: ${outcome.credential.graduationDate}`);
      if (outcome.credential.blockchainTxHash) {
        doc.text(`Blockchain tx: ${outcome.credential.blockchainTxHash}`);
      }
    }

    doc.end();
  } catch (error) {
    next(error);
  }
}

module.exports = { verifyFile, verifyByHash, verifyBulk, downloadVerificationCertificate };
