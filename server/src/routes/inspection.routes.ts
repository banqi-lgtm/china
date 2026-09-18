import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { checkInspectionCompanyAccess } from '../middleware/rbac';
import { recordAuditLog } from '../services/audit.service';
import { sendNotification } from '../services/notification.service';

const router = Router();

// GET /api/inspections
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { status, company_id, operator_id, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.*, 
             c.name as company_name, 
             u_op.name as operator_name, 
             u_co.name as consultant_name,
             cont.container_number,
             prod.product_name,
             (SELECT COUNT(*) FROM findings WHERE inspection_id = i.id) as findings_count,
             (SELECT COUNT(*) FROM evidences WHERE inspection_id = i.id) as evidences_count
      FROM inspections i
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN users u_op ON i.operator_id = u_op.id
      LEFT JOIN users u_co ON i.consultant_id = u_co.id
      LEFT JOIN container_details cont ON cont.inspection_id = i.id
      LEFT JOIN product_details prod ON prod.inspection_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // RBAC Isolation
    if (user.role === 'CLIENT') {
      query += ' AND i.company_id = ?';
      params.push(user.company_id);
    } else if (user.role === 'OPERATOR') {
      query += ' AND i.operator_id = ?';
      params.push(user.id);
    } else {
      if (company_id) {
        query += ' AND i.company_id = ?';
        params.push(company_id);
      }
      if (operator_id) {
        query += ' AND i.operator_id = ?';
        params.push(operator_id);
      }
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (search) {
      query += ` AND (
        i.code LIKE ? OR 
        c.name LIKE ? OR 
        cont.container_number LIKE ? OR 
        prod.product_name LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const inspections = await db.all(query, params);

    return res.json({ inspections });
  } catch (err: any) {
    console.error('Error fetching inspections:', err);
    return res.status(500).json({ error: 'Error al obtener inspecciones.' });
  }
});

// GET /api/inspections/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const hasAccess = await checkInspectionCompanyAccess(user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta inspección.' });
    }

    const inspection = await db.get<any>(
      `SELECT i.*, 
              c.name as company_name, c.tax_id as company_tax_id,
              u_op.name as operator_name, u_op.email as operator_email,
              u_co.name as consultant_name, u_co.email as consultant_email
       FROM inspections i
       LEFT JOIN companies c ON i.company_id = c.id
       LEFT JOIN users u_op ON i.operator_id = u_op.id
       LEFT JOIN users u_co ON i.consultant_id = u_co.id
       WHERE i.id = ?`,
      [id]
    );

    if (!inspection) {
      return res.status(404).json({ error: 'Inspección no encontrada.' });
    }

    const container = await db.get('SELECT * FROM container_details WHERE inspection_id = ?', [id]) || {};
    const cargo = await db.get('SELECT * FROM cargo_details WHERE inspection_id = ?', [id]) || {};
    const loading = await db.get('SELECT * FROM loading_process WHERE inspection_id = ?', [id]) || {};
    const product = await db.get('SELECT * FROM product_details WHERE inspection_id = ?', [id]) || {};
    const vehicle = await db.get('SELECT * FROM vehicle_details WHERE inspection_id = ?', [id]) || {};

    const answers = await db.all(
      `SELECT a.*, q.question_text, q.requires_evidence_on_fail, cat.name as category_name
       FROM checklist_answers a
       JOIN checklist_questions q ON a.question_id = q.id
       JOIN checklist_categories cat ON q.category_id = cat.id
       WHERE a.inspection_id = ?
       ORDER BY cat.order_index, q.order_index`,
      [id]
    );

    const findings = await db.all('SELECT * FROM findings WHERE inspection_id = ? ORDER BY created_at DESC', [id]);
    const evidences = await db.all('SELECT * FROM evidences WHERE inspection_id = ? ORDER BY is_primary DESC, created_at DESC', [id]);
    const signatures = await db.all('SELECT * FROM signatures WHERE inspection_id = ?', [id]);
    const timeline = await db.all(
      `SELECT h.*, u.name as user_name 
       FROM inspection_status_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.inspection_id = ?
       ORDER BY h.created_at ASC`,
      [id]
    );

    return res.json({
      inspection,
      container,
      cargo,
      loading,
      product,
      vehicle,
      answers,
      findings,
      evidences,
      signatures,
      timeline
    });
  } catch (err: any) {
    console.error('Error getting inspection detail:', err);
    return res.status(500).json({ error: 'Error al cargar detalles de la inspección.' });
  }
});

// POST /api/inspections (Create draft or new assignment)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { company_id, scheduled_date, notes, type_id, operator_id } = req.body;

    const assignedCompanyId = user.role === 'CLIENT' ? user.company_id : (company_id || user.company_id);
    if (!assignedCompanyId) {
      return res.status(400).json({ error: 'La empresa contratante es obligatoria.' });
    }

    const id = uuidv4();
    const countRow = await db.get<any>('SELECT COUNT(*) as cnt FROM inspections');
    const seq = (countRow?.cnt || 0) + 1;
    const code = `INS-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;

    const assignedOperator = operator_id || (user.role === 'OPERATOR' ? user.id : null);
    const consultant = await db.get<any>("SELECT id FROM users WHERE role = 'CONSULTANT' LIMIT 1");
    const consultantId = consultant ? consultant.id : null;

    const initialStatus = user.role === 'OPERATOR' ? 'EN_PROCESO' : (assignedOperator ? 'ASIGNADA' : 'BORRADOR');

    await db.run(
      `INSERT INTO inspections (
        id, code, company_id, type_id, operator_id, consultant_id, status, progress, 
        scheduled_date, notes, current_step, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 10, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'))`,
      [id, code, assignedCompanyId, type_id || null, assignedOperator, consultantId, initialStatus, scheduled_date || null, notes || null]
    );

    // Initialize sub-records
    await db.run('INSERT INTO container_details (id, inspection_id, container_number) VALUES (?, ?, ?)', [uuidv4(), id, 'MSKU-' + Math.floor(100000 + Math.random() * 900000)]);
    await db.run('INSERT INTO cargo_details (id, inspection_id, total_quantity, unit) VALUES (?, ?, 0, ?)', [uuidv4(), id, 'Unidades']);
    await db.run('INSERT INTO loading_process (id, inspection_id) VALUES (?, ?)', [uuidv4(), id]);
    await db.run('INSERT INTO product_details (id, inspection_id, product_name) VALUES (?, ?, ?)', [uuidv4(), id, '']);
    await db.run('INSERT INTO vehicle_details (id, inspection_id) VALUES (?, ?)', [uuidv4(), id]);

    // Initial timeline record
    await db.run(
      `INSERT INTO inspection_status_history (id, inspection_id, previous_status, new_status, changed_by, comment, created_at)
       VALUES (?, ?, null, ?, ?, 'Inspección creada', datetime('now'))`,
      [uuidv4(), id, initialStatus, user.id]
    );

    // Pre-populate checklist answers with active template questions
    const questions = await db.all('SELECT id FROM checklist_questions');
    for (const q of questions) {
      await db.run(
        `INSERT OR IGNORE INTO checklist_answers (id, inspection_id, question_id, status, observations)
         VALUES (?, ?, ?, 'OK', 'Verificado')`,
        [uuidv4(), id, q.id]
      );
    }

    await recordAuditLog(req, {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'INSPECTION_CREATED',
      affectedTable: 'inspections',
      recordId: id,
      newValue: { code, company_id: assignedCompanyId, status: initialStatus }
    });

    return res.status(201).json({ id, code, status: initialStatus });
  } catch (err: any) {
    console.error('Error creating inspection:', err);
    return res.status(500).json({ error: 'Error al crear la inspección.' });
  }
});

// PUT /api/inspections/:id (Autosave and step progression)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const hasAccess = await checkInspectionCompanyAccess(user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'No autorizado para editar esta inspección.' });
    }

    const {
      general,
      container,
      cargo,
      loading,
      product,
      vehicle,
      current_step,
      progress,
      overall_result,
      consultant_notes,
      client_feedback
    } = req.body;

    // Update main inspection fields
    if (general || current_step !== undefined || progress !== undefined || overall_result || consultant_notes || client_feedback) {
      await db.run(
        `UPDATE inspections 
         SET progress = COALESCE(?, progress),
             current_step = COALESCE(?, current_step),
             overall_result = COALESCE(?, overall_result),
             consultant_notes = COALESCE(?, consultant_notes),
             client_feedback = COALESCE(?, client_feedback),
             latitude = COALESCE(?, latitude),
             longitude = COALESCE(?, longitude),
             location_address = COALESCE(?, location_address),
             notes = COALESCE(?, notes),
             updated_at = datetime('now')
         WHERE id = ?`,
        [
          progress !== undefined ? progress : null,
          current_step !== undefined ? current_step : null,
          overall_result || null,
          consultant_notes || null,
          client_feedback || null,
          general?.latitude || null,
          general?.longitude || null,
          general?.location_address || null,
          general?.notes || null,
          id
        ]
      );
    }

    // Update Container Details
    if (container) {
      await db.run(
        `UPDATE container_details
         SET container_number = COALESCE(?, container_number),
             container_type = COALESCE(?, container_type),
             size = COALESCE(?, size),
             condition = COALESCE(?, condition),
             transporter = COALESCE(?, transporter),
             license_plate = COALESCE(?, license_plate),
             location = COALESCE(?, location),
             seal_number = COALESCE(?, seal_number)
         WHERE inspection_id = ?`,
        [
          container.container_number,
          container.container_type,
          container.size,
          container.condition,
          container.transporter,
          container.license_plate,
          container.location,
          container.seal_number,
          id
        ]
      );
    }

    // Update Cargo Details
    if (cargo) {
      await db.run(
        `UPDATE cargo_details
         SET total_quantity = COALESCE(?, total_quantity),
             unit = COALESCE(?, unit),
             gross_weight = COALESCE(?, gross_weight),
             net_weight = COALESCE(?, net_weight),
             volume = COALESCE(?, volume),
             packaging_type = COALESCE(?, packaging_type),
             remarks = COALESCE(?, remarks)
         WHERE inspection_id = ?`,
        [
          cargo.total_quantity,
          cargo.unit,
          cargo.gross_weight,
          cargo.net_weight,
          cargo.volume,
          cargo.packaging_type,
          cargo.remarks,
          id
        ]
      );
    }

    // Update Loading Process
    if (loading) {
      await db.run(
        `UPDATE loading_process
         SET started_at = COALESCE(?, started_at),
             finished_at = COALESCE(?, finished_at),
             personnel_count = COALESCE(?, personnel_count),
             equipment_used = COALESCE(?, equipment_used),
             weather_conditions = COALESCE(?, weather_conditions),
             observations = COALESCE(?, observations)
         WHERE inspection_id = ?`,
        [
          loading.started_at,
          loading.finished_at,
          loading.personnel_count,
          loading.equipment_used,
          loading.weather_conditions,
          loading.observations,
          id
        ]
      );
    }

    // Update Product Details
    if (product) {
      await db.run(
        `UPDATE product_details
         SET product_name = COALESCE(?, product_name),
             reference = COALESCE(?, reference),
             brand = COALESCE(?, brand),
             quantity = COALESCE(?, quantity),
             batch_lot = COALESCE(?, batch_lot),
             condition = COALESCE(?, condition),
             observations = COALESCE(?, observations)
         WHERE inspection_id = ?`,
        [
          product.product_name,
          product.reference,
          product.brand,
          product.quantity,
          product.batch_lot,
          product.condition,
          product.observations,
          id
        ]
      );
    }

    // Update Vehicle Details
    if (vehicle) {
      await db.run(
        `UPDATE vehicle_details
         SET vehicle_type = COALESCE(?, vehicle_type),
             license_plate = COALESCE(?, license_plate),
             driver_name = COALESCE(?, driver_name),
             driver_id = COALESCE(?, driver_id),
             condition = COALESCE(?, condition),
             observations = COALESCE(?, observations)
         WHERE inspection_id = ?`,
        [
          vehicle.vehicle_type,
          vehicle.license_plate,
          vehicle.driver_name,
          vehicle.driver_id,
          vehicle.condition,
          vehicle.observations,
          id
        ]
      );
    }

    return res.json({ success: true, message: 'Inspección actualizada correctamente.' });
  } catch (err: any) {
    console.error('Error updating inspection:', err);
    return res.status(500).json({ error: 'Error al actualizar la inspección.' });
  }
});

// POST /api/inspections/:id/checklist-answers
router.post('/:id/checklist-answers', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of { question_id, status, observations, finding_description, severity }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Array de respuestas requerido.' });
    }

    for (const ans of answers) {
      await db.run(
        `INSERT INTO checklist_answers (id, inspection_id, question_id, status, observations)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(inspection_id, question_id) 
         DO UPDATE SET status = excluded.status, observations = excluded.observations`,
        [uuidv4(), id, ans.question_id, ans.status, ans.observations || '']
      );

      // If status is NO_OK and finding description provided, auto-create finding
      if (ans.status === 'NO_OK' && (ans.finding_description || ans.observations)) {
        const desc = ans.finding_description || ans.observations;
        const findingCode = `FND-${Math.floor(1000 + Math.random() * 9000)}`;
        await db.run(
          `INSERT INTO findings (id, code, inspection_id, category, severity, description, status, created_at)
           VALUES (?, ?, ?, 'Checklist', ?, ?, 'ABIERTO', datetime('now'))`,
          [uuidv4(), findingCode, id, ans.severity || 'MEDIA', desc]
        );
      }
    }

    return res.json({ success: true, message: 'Checklist guardado.' });
  } catch (err: any) {
    console.error('Error saving checklist answers:', err);
    return res.status(500).json({ error: 'Error al guardar respuestas de checklist.' });
  }
});

// POST /api/inspections/:id/signatures
router.post('/:id/signatures', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signer_type, signer_name, signature_data } = req.body;

    if (!signature_data || !signer_name) {
      return res.status(400).json({ error: 'Firma y nombre requeridos.' });
    }

    const sigId = uuidv4();
    await db.run(
      `INSERT INTO signatures (id, inspection_id, signer_type, signer_name, signature_data, signed_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [sigId, id, signer_type || 'OPERATOR', signer_name, signature_data]
    );

    return res.json({ success: true, id: sigId });
  } catch (err: any) {
    console.error('Error saving signature:', err);
    return res.status(500).json({ error: 'Error al registrar firma digital.' });
  }
});

// POST /api/inspections/:id/status (Workflow Transitions)
router.post('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { new_status, comment, overall_result } = req.body;

    const inspection = await db.get<any>('SELECT * FROM inspections WHERE id = ?', [id]);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspección no encontrada.' });
    }

    // Role-based transition enforcement
    if (new_status === 'PENDIENTE_REVISION') {
      if (user.role !== 'OPERATOR' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Solo el operario asignado puede enviar la inspección a revisión.' });
      }
    }

    if (new_status === 'APROBADA' || new_status === 'EN_CORRECCION' || new_status === 'RECHAZADA') {
      if (user.role !== 'CONSULTANT' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Solo el consultor (Mateo) o Super Admin pueden aprobar o solicitar corrección.' });
      }
    }

    const previousStatus = inspection.status;
    let approvedAt = inspection.approved_at;
    let completedAt = inspection.completed_at;

    if (new_status === 'PENDIENTE_REVISION' && !completedAt) {
      completedAt = new Date().toISOString();
    }
    if (new_status === 'APROBADA' && !approvedAt) {
      approvedAt = new Date().toISOString();
    }

    await db.run(
      `UPDATE inspections 
       SET status = ?, 
           overall_result = COALESCE(?, overall_result),
           consultant_notes = COALESCE(?, consultant_notes),
           approved_at = ?,
           completed_at = COALESCE(?, completed_at),
           progress = CASE WHEN ? = 'APROBADA' OR ? = 'FINALIZADA' THEN 100 ELSE progress END,
           updated_at = datetime('now')
       WHERE id = ?`,
      [new_status, overall_result || null, comment || null, approvedAt, completedAt, new_status, new_status, id]
    );

    // Add status history
    await db.run(
      `INSERT INTO inspection_status_history (id, inspection_id, previous_status, new_status, changed_by, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), id, previousStatus, new_status, user.id, comment || `Estado cambiado a ${new_status}`]
    );

    // Notify appropriate user
    if (new_status === 'PENDIENTE_REVISION' && inspection.consultant_id) {
      await sendNotification(
        inspection.consultant_id,
        'Nueva inspección lista para revisión',
        `La inspección ${inspection.code} fue completada y enviada por el operario.`,
        'INFO',
        `/inspections/${id}`
      );
    } else if (new_status === 'EN_CORRECCION' && inspection.operator_id) {
      await sendNotification(
        inspection.operator_id,
        'Inspección devuelta para corrección',
        `El consultor solicitó cambios en la inspección ${inspection.code}: ${comment || ''}`,
        'WARNING',
        `/inspections/${id}/wizard`
      );
    } else if (new_status === 'APROBADA') {
      if (inspection.operator_id) {
        await sendNotification(
          inspection.operator_id,
          'Inspección Aprobada',
          `La inspección ${inspection.code} ha sido aprobada exitosamente.`,
          'SUCCESS',
          `/inspections/${id}`
        );
      }
    }

    await recordAuditLog(req, {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: `STATUS_CHANGE_${new_status}`,
      affectedTable: 'inspections',
      recordId: id,
      oldValue: { status: previousStatus },
      newValue: { status: new_status, comment }
    });

    return res.json({ success: true, previous_status: previousStatus, new_status });
  } catch (err: any) {
    console.error('Error changing status:', err);
    return res.status(500).json({ error: 'Error al cambiar estado de la inspección.' });
  }
});

export default router;
