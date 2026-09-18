import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from './auth';
import { db } from '../db/database';

export function requireRoles(...allowedRoles: Array<'SUPER_ADMIN' | 'CONSULTANT' | 'OPERATOR' | 'CLIENT'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

export async function checkInspectionCompanyAccess(
  user: AuthenticatedUser,
  inspectionId: string
): Promise<boolean> {
  // Super Admin and Consultant can access all inspections
  if (user.role === 'SUPER_ADMIN' || user.role === 'CONSULTANT') {
    return true;
  }

  const inspection = await db.get<{ company_id: string; operator_id: string }>(
    'SELECT company_id, operator_id FROM inspections WHERE id = ?',
    [inspectionId]
  );

  if (!inspection) return false;

  if (user.role === 'CLIENT') {
    return user.company_id === inspection.company_id;
  }

  if (user.role === 'OPERATOR') {
    return user.id === inspection.operator_id;
  }

  return false;
}
