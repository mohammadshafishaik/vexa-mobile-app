import { Request } from 'express';
import prisma from '../../lib/prisma';

interface LogAdminActionParams {
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  previousState?: unknown;
  newState?: unknown;
  req?: Request;
}

const getIpAddress = (req?: Request): string | undefined => {
  if (!req) return undefined;

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || undefined;
};

export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  const {
    entityType,
    entityId,
    action,
    performedById,
    previousState,
    newState,
    req,
  } = params;

  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      performedById,
      previousState: (previousState as any) ?? undefined,
      newState: (newState as any) ?? undefined,
      ipAddress: getIpAddress(req),
    },
  });
}
