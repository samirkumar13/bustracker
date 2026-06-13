const prisma = require('../lib/prisma');

/**
 * Log an admin/user action to the audit trail.
 * Never throws — audit logging must never crash the main request.
 *
 * @param {object} req         - Express request (for user + IP)
 * @param {string} action      - e.g. STUDENT_CREATED, USER_DELETED
 * @param {string} targetType  - e.g. STUDENT, USER, BUS, ROUTE
 * @param {string} [targetId]  - ID of the affected resource
 * @param {object} [detail]    - Extra context (will be JSON-stringified)
 */
async function audit(req, action, targetType, targetId = null, detail = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     req.user.id,
        userName:   req.user.name || req.user.email || 'Unknown',
        action,
        targetType,
        targetId,
        detail:     detail ? JSON.stringify(detail) : null,
        ip:         req.headers['x-forwarded-for'] || req.ip || null,
      },
    });
  } catch (err) {
    console.error('[Audit] Failed to write log:', err.message);
  }
}

module.exports = { audit };
