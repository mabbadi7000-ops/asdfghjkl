import { AuditLog, UserProfile } from '../types';
import { createDocument } from './dataService';

export async function logAuditAction(
  user: UserProfile | null,
  action: string,
  entityType: string,
  recordId: string,
  details: string
): Promise<void> {
  const logData: Omit<AuditLog, 'id'> = {
    userId: user?.id || 'system',
    userName: user?.fullName || 'System Automated',
    userRole: user?.role || 'system',
    action,
    entityType,
    recordId,
    details,
    timestamp: new Date().toISOString(),
  };

  try {
    await createDocument('audit_logs', logData as any);
  } catch (error) {
    console.warn('[AuditLogger] Failed to write audit log to D1:', error);
  }
}
