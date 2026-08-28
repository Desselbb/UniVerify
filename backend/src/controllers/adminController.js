const { Op } = require('sequelize');
const { Credential, Institution, User, AuditLog } = require('../models');
const { hashCredentialData } = require('../services/hashService');
const blockchain = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const audit = require('../services/auditService');
const { logger } = require('../utils/logger');

// Institutions must exist on-chain before their credentials can be anchored.
async function ensureOnChainInstitution(institution) {
  if (institution.onChainId) {
    return institution.onChainId;
  }

  const onChainId = await blockchain.registerInstitution({
    name: institution.name,
    registrationCode: institution.registrationCode
  });
  await institution.update({ onChainId });
  return onChainId;
}

async function createInstitution(req, res, next) {
  try {
    const institution = await Institution.create(req.body);

    try {
      await ensureOnChainInstitution(institution);
    } catch (error) {
      logger.warn('On-chain institution registration failed', {
        institutionId: institution.id,
        error: error.message
      });
    }
    await audit.record('institution_created', { req, entityType: 'institution', entityId: institution.id });
    res.status(201).json({ institution });
  } catch (error) {
    next(error);
  }
}

async function listInstitutions(req, res, next) {
  try {
    const institutions = await Institution.findAll({ order: [['name', 'ASC']] });
    res.json({ institutions });
  } catch (error) {
    next(error);
  }
}

async function issueCredential(req, res, next) {
  try {
    const institutionId = req.user.role === 'system_admin'
      ? req.body.institutionId
      : req.user.institutionId;

    if (!institutionId) {
      throw new ApiError(400, 'institutionId is required');
    }

    const institution = await Institution.findByPk(institutionId);
    if (!institution || !institution.isActive) {
      throw new ApiError(400, 'Institution not found or inactive');
    }

    const { studentName, studentId, degree, graduationDate, program, honors, metadataUri } = req.body;
    const hash = hashCredentialData({ studentName, studentId, degree, graduationDate, institutionId });

    const duplicate = await Credential.findOne({ where: { hash } });
    if (duplicate) {
      throw new ApiError(409, 'Credential already issued');
    }

    let onChain = null;
    try {
      const onChainInstitutionId = await ensureOnChainInstitution(institution);
      onChain = await blockchain.issueCredential({
        hash,
        institutionId: onChainInstitutionId,
        metadataUri: metadataUri ?? ''
      });
    } catch (error) {
      logger.warn('On-chain issuance failed; storing credential off-chain only', { hash, error: error.message });
    }

    const credential = await Credential.create({
      hash,
      studentName,
      studentId,
      degree,
      graduationDate,
      program: program ?? null,
      honors: honors ?? null,
      graduationYear: new Date(graduationDate).getUTCFullYear(),
      institutionId,
      issuerId: req.user.id,
      metadataUri: metadataUri ?? null,
      blockchainTxHash: onChain?.txHash ?? null,
      blockNumber: onChain?.blockNumber ?? null,
      blockTimestamp: onChain ? new Date() : null
    });

    await audit.record('credential_issued', { req, entityType: 'credential', entityId: credential.id, metadata: { hash } });

    res.status(201).json({ credential });
  } catch (error) {
    next(error);
  }
}

async function listCredentials(req, res, next) {
  try {
    const { search, page = 1, pageSize = 25 } = req.query;
    const where = {};

    if (req.user.role !== 'system_admin') {
      where.institutionId = req.user.institutionId;
    }
    if (search) {
      where[Op.or] = [
        { studentName: { [Op.iLike]: `%${search}%` } },
        { studentId: { [Op.iLike]: `%${search}%` } },
        { hash: search }
      ];
    }

    const limit = Math.min(parseInt(pageSize, 10) || 25, 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

    const { rows, count } = await Credential.findAndCountAll({ where, limit, offset, order: [['createdAt', 'DESC']] });
    res.json({ total: count, credentials: rows });
  } catch (error) {
    next(error);
  }
}

async function revokeCredential(req, res, next) {
  try {
    const { hash } = req.params;
    const { reason } = req.body;

    const credential = await Credential.findOne({ where: { hash } });
    if (!credential) {
      throw new ApiError(404, 'Credential not found');
    }
    if (req.user.role !== 'system_admin' && credential.institutionId !== req.user.institutionId) {
      throw new ApiError(403, 'Not authorized for this institution');
    }
    if (credential.isRevoked) {
      throw new ApiError(409, 'Credential already revoked');
    }

    try {
      await blockchain.revokeCredential(hash, reason);
    } catch (error) {
      logger.warn('On-chain revocation failed; revoking off-chain only', { hash, error: error.message });
    }

    credential.isRevoked = true;
    credential.revokedAt = new Date();
    credential.revokedById = req.user.id;
    credential.revocationReason = reason;
    await credential.save();

    await audit.record('credential_revoked', { req, entityType: 'credential', entityId: credential.id, metadata: { hash, reason } });

    res.json({ credential });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const where = req.user.role === 'system_admin' ? {} : { institutionId: req.user.institutionId };
    const users = await User.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.pageSize, 10) || 50, 200);
    const logs = await AuditLog.findAll({ limit, order: [['createdAt', 'DESC']] });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createInstitution,
  listInstitutions,
  issueCredential,
  listCredentials,
  revokeCredential,
  listUsers,
  listAuditLogs
};
