"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = requireRoles;
exports.checkInspectionCompanyAccess = checkInspectionCompanyAccess;
const database_1 = require("../db/database");
function requireRoles(...allowedRoles) {
    return (req, res, next) => {
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
async function checkInspectionCompanyAccess(user, inspectionId) {
    // Super Admin and Consultant can access all inspections
    if (user.role === 'SUPER_ADMIN' || user.role === 'CONSULTANT') {
        return true;
    }
    const inspection = await database_1.db.get('SELECT company_id, operator_id FROM inspections WHERE id = ?', [inspectionId]);
    if (!inspection)
        return false;
    if (user.role === 'CLIENT') {
        return user.company_id === inspection.company_id;
    }
    if (user.role === 'OPERATOR') {
        return user.id === inspection.operator_id;
    }
    return false;
}
