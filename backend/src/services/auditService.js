const { AuditLog } = require('../models');
const { logger } = require('../utils/logger');

async function record(action, { req = null, userId = null, entityType = null, entityId = null, metadata = null } = {}) {
  if (process.env.AUDIT_ENABLED === 'false') {
    return null;
  }

  try {
    return await AuditLog.create({
      action,
      userId: userId ?? req?.user?.id ?? null,
      entityType,
      entityId: entityId === null || entityId === undefined ? null : String(entityId),
      ipAddress: req?.ip ?? null,
      userAgent: req?.get?.('user-agent') ?? null,
      metadata
    });
  } catch (error) {
    logger.error('Failed to write audit log', { action, error: error.message });
    return null;
  }
}

module.exports = { record };
