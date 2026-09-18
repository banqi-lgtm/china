import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './database';
import { UPLOAD_DIR } from '../config';
import { generateInspectionPDF } from '../services/pdfGenerator.service';

// Ultra-realistic PNG graphic for photographic evidence
const samplePngBase64 = 
  'iVBORw0KGgoAAAANSUhEUgAAAlgAAAGQCAYAAAByNR6YAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAA' +
  'EnQAABJ0Ad5mPtUAABBTSURBVHhe7d0xihxJFoDh/x/am1uwt2Av1o0E74bZG8jeyHsj6A1gb4BwE3oz3pvhN4G7wBuwb8DO' +
  'YF2fWVEZWRlZlVnp/r7nAT05lZVZ8edHZERmRj7956effgMAAIA/vHn706fffv0rAAAAvHnzzZ+++fM/fv2LAACANz/879e/' +
  'f/2/rwAAAPBfX/3tN//2v/4DAADAm7/98T9//uOv/wQAAPBff/r7r//837/9MwAAALz56Z9///U///cTAAAA//iPf/35r///' +
  'EwAAwJv/fPj627999W8AAAD446d//f7r3/8HAAAAAPj/AAAAAAD//wMAH4kXvT0rKxEAAAAASUVORK5CYII=';

export async function createFullShowcaseExample() {
  await initDatabase();
  console.log('--- Creando Ejemplo Completo de Inspección e Informe Multi-Rol ---');

  const compId = 'comp-demo-1';
  const operarioId = 'usr-operario-3';
  const mateoId = 'usr-mateo-2';
  const inspId = 'insp-full-showcase-001';
  const reportCode = 'INS-2026-000888';

  // Ensure photo sample directory exists
  const photosDir = path.join(UPLOAD_DIR, 'companies', compId, 'inspections', inspId, 'photos');
  fs.mkdirSync(photosDir, { recursive: true });

  const p1 = path.join(photosDir, '1_contenedor_exterior.png');
  const p2 = path.join(photosDir, '2_proceso_cargue.png');
  const p3 = path.join(photosDir, '3_inspeccion_producto.png');
  const p4 = path.join(photosDir, '4_vehiculo_transporte.png');
  const p5 = path.join(photosDir, '5_precinto_seguridad.png');

  fs.writeFileSync(p1, Buffer.from(samplePngBase64, 'base64'));
  fs.writeFileSync(p2, Buffer.from(samplePngBase64, 'base64'));
  fs.writeFileSync(p3, Buffer.from(samplePngBase64, 'base64'));
  fs.writeFileSync(p4, Buffer.from(samplePngBase64, 'base64'));
  fs.writeFileSync(p5, Buffer.from(samplePngBase64, 'base64'));

  // 1. Insert Main Inspection Record (Status: APROBADA, Result: PASS, Progress: 100%)
  await db.run(
    `INSERT OR REPLACE INTO inspections (
      id, code, company_id, type_id, operator_id, consultant_id, status, progress,
      latitude, longitude, location_address, scheduled_date, started_at, completed_at, approved_at,
      overall_result, notes, consultant_notes, client_feedback, current_step
    ) VALUES (
      ?, ?, ?, 'type-loading', ?, ?, 'APROBADA', 100,
      3.8812, -77.0345, 'Terminal Portuario Internacional de Carga - Muelle Principal Andén 4',
      '2026-09-18', '2026-09-18 07:30:00', '2026-09-18 11:00:00', '2026-09-18 11:45:00',
      'PASS',
      'Inspección de cargue completada conforme a normas internacionales CTU/ISO. Carga estibada y trincada sin observaciones.',
      'Mateo (Consultor Senior): Revisión técnica finalizada satisfactoriamente. Fotografías de alta nitidez, precinto verificado con escaneo y empaque íntegro. Aprobado formalmente.',
      'Cliente (TransLogix): Visto bueno recibido. Documento descargado para trámites aduaneros.',
      10
    )`,
    [inspId, reportCode, compId, operarioId, mateoId]
  );

  // 2. Step 2: Container Details
  await db.run(
    `INSERT OR REPLACE INTO container_details (
      id, inspection_id, container_number, container_type, size, condition, transporter, license_plate, location, seal_number
    ) VALUES (
      'cont-showcase', ?, 'MSKU-994120-3', 'High Cube Dry Box (HC)', '40ft HC',
      'Excelente - Piso limpio sin clavos, paredes sin perforaciones y gomas herméticas',
      'Maersk Intermodal Logistics Colombia S.A.S.', 'WZK-410',
      'Muelle 4 - Patio de Consolidación A2', 'CO-CUSTOMS-882104'
    )`,
    [inspId]
  );

  // 3. Step 3: Cargo Details
  await db.run(
    `INSERT OR REPLACE INTO cargo_details (
      id, inspection_id, total_quantity, unit, gross_weight, net_weight, volume, packaging_type, remarks
    ) VALUES (
      'cargo-showcase', ?, 1850, 'Cajas Paletizadas', 24100.0, 22800.0, 69.5,
      'Tarimas Europeas Tratadas NIMF-15',
      'Embalaje con esquineros de alta resistencia, flejes de polipropileno y bolsas de aire (dunnage airbags).'
    )`,
    [inspId]
  );

  // 4. Step 5: Loading Process
  await db.run(
    `INSERT OR REPLACE INTO loading_process (
      id, inspection_id, started_at, finished_at, personnel_count, equipment_used, weather_conditions, observations
    ) VALUES (
      'load-showcase', ?, '07:30', '10:45', 5,
      'Montacargas Toyota 3.5T + 2 Transpaletas eléctricas Linde',
      'Despejado / Sin lluvia, temperatura ambiente 26°C',
      'Distribución uniforme del peso en ejes. Aseguramiento frontal con barras de bloqueo.'
    )`,
    [inspId]
  );

  // 5. Step 7: Product Details
  await db.run(
    `INSERT OR REPLACE INTO product_details (
      id, inspection_id, product_name, reference, brand, quantity, batch_lot, condition, observations
    ) VALUES (
      'prod-showcase', ?, 'Aguacate Hass de Exportación Extra & Café Grano Supremo',
      'EXP-GLOBAL-2026', 'Andina Premier Select', 1850, 'LOT-2026-COL-99',
      'Óptimo - Calidad Extra Export',
      'Cajas ventiladas con etiquetas de trazabilidad QR y sello de calidad ICA.'
    )`,
    [inspId]
  );

  // 6. Step 8: Vehicle Details
  await db.run(
    `INSERT OR REPLACE INTO vehicle_details (
      id, inspection_id, vehicle_type, license_plate, driver_name, driver_id, condition, observations
    ) VALUES (
      'veh-showcase', ?, 'Tractocamión Kenworth T800 Modelo 2024', 'WZK-410',
      'Javier Morales R.', 'CC 80.123.456', 'Excelente estado mecánico',
      'Planilla de viaje RNDC-2026-9912 al día. Pólizas y SOAT vigentes.'
    )`,
    [inspId]
  );

  // 7. Step 4: Checklist Answers (All categories verified)
  const questions = await db.all('SELECT id FROM checklist_questions');
  for (const q of questions) {
    await db.run(
      `INSERT OR REPLACE INTO checklist_answers (id, inspection_id, question_id, status, observations)
       VALUES (?, ?, ?, 'OK', 'Verificado y conforme según estándar de inspección.')`,
      [uuidv4(), inspId, q.id]
    );
  }

  // 8. Findings (1 Finding detected and resolved)
  await db.run(
    `INSERT OR REPLACE INTO findings (
      id, code, inspection_id, category, severity, description, status, responsible, corrective_action, created_at
    ) VALUES (
      'fnd-showcase', 'FND-8801', ?, 'Estructura Exterior', 'BAJA',
      'Leve raspadura superficial en pintura de puerta izquierda sin pérdida de grosor ni óxido.',
      'RESUELTO', 'Inspector de Patio', 'Verificación de hermeticidad con prueba de luz interior. Conforme.',
      datetime('now', '-3 hours')
    )`,
    [inspId]
  );

  // 9. Evidences (Photos organized by sections)
  await db.run(
    `INSERT OR REPLACE INTO evidences (
      id, inspection_id, section, type, file_path, file_name, file_size, mime_type, description, is_primary, rotation, uploaded_by
    ) VALUES 
    (?, ?, 'CONTENEDOR', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/insp-full-showcase-001/photos/1_contenedor_exterior.png', 'contenedor_40hc.png', 320000, 'image/png', 'Vista exterior de 7 puntos del contenedor MSKU-994120-3', 1, 0, ?),
    (?, ?, 'CARGUE', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/insp-full-showcase-001/photos/2_proceso_cargue.png', 'estiba_y_dunnage.png', 280000, 'image/png', 'Proceso de estiba y colocación de bolsas neumáticas de bloqueo', 1, 0, ?),
    (?, ?, 'PRODUCTO', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/insp-full-showcase-001/photos/3_inspeccion_producto.png', 'rotulado_lote.png', 250000, 'image/png', 'Muestreo aleatorio de producto, embalaje y etiquetas de lote', 1, 0, ?),
    (?, ?, 'VEHICULO', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/insp-full-showcase-001/photos/4_vehiculo_transporte.png', 'cabezote_wzk410.png', 310000, 'image/png', 'Cabezote y verificación de placa WZK-410 en báscula de entrada', 1, 0, ?),
    (?, ?, 'DOCUMENTACION', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/insp-full-showcase-001/photos/5_precinto_seguridad.png', 'precinto_oficial.png', 290000, 'image/png', 'Precinto de seguridad aduanero CO-CUSTOMS-882104 debidamente trabado', 1, 0, ?)`,
    [
      uuidv4(), inspId, operarioId,
      uuidv4(), inspId, operarioId,
      uuidv4(), inspId, operarioId,
      uuidv4(), inspId, operarioId,
      uuidv4(), inspId, operarioId
    ]
  );

  // 10. Digital Signatures (Operario Carlos + Consultor Mateo)
  await db.run(
    `INSERT OR REPLACE INTO signatures (id, inspection_id, signer_type, signer_name, signature_data, signed_at)
     VALUES 
     (?, ?, 'OPERATOR', 'Carlos Pérez (Operario de Calidad)', 'data:image/png;base64,${samplePngBase64}', '2026-09-18 11:00:00'),
     (?, ?, 'CONSULTANT', 'Mateo González (Lead Quality Consultant)', 'data:image/png;base64,${samplePngBase64}', '2026-09-18 11:45:00')`,
    [uuidv4(), inspId, uuidv4(), inspId]
  );

  // 11. Complete Status Timeline
  await db.run(
    `INSERT INTO inspection_status_history (id, inspection_id, previous_status, new_status, changed_by, comment, created_at)
     VALUES 
     (?, ?, null, 'BORRADOR', ?, 'Super Admin programó la inspección para cargue en puerto.', datetime('now', '-5 hours')),
     (?, ?, 'BORRADOR', 'ASIGNADA', ?, 'Mateo asignó la operación al operario Carlos Pérez.', datetime('now', '-4 hours')),
     (?, ?, 'ASIGNADA', 'EN_PROCESO', ?, 'Carlos Pérez inició inspección en campo con GPS fijado.', datetime('now', '-3 hours')),
     (?, ?, 'EN_PROCESO', 'PENDIENTE_REVISION', ?, 'Operario completó los 10 pasos, adjuntó evidencias y firmó digitalmente.', datetime('now', '-2 hours')),
     (?, ?, 'PENDIENTE_REVISION', 'APROBADA', ?, 'Mateo revisó fotografías y checklist, aprobando formalmente el cargue.', datetime('now', '-1 hour')),
     (?, ?, 'APROBADA', 'FINALIZADA', ?, 'Informe PDF oficial generado y entregado al cliente.', datetime('now', '-30 minutes'))`,
    [
      uuidv4(), inspId, 'usr-admin-1',
      uuidv4(), inspId, mateoId,
      uuidv4(), inspId, operarioId,
      uuidv4(), inspId, operarioId,
      uuidv4(), inspId, mateoId,
      uuidv4(), inspId, mateoId
    ]
  );

  // 12. Audit Log Records
  await db.run(
    `INSERT INTO audit_logs (id, user_id, user_email, role, action, ip_address, affected_table, record_id, created_at)
     VALUES 
     (?, ?, 'operario@inspectionpro.com', 'OPERATOR', 'INSPECTION_COMPLETED_10_STEPS', '192.168.0.8', 'inspections', ?, datetime('now', '-2 hours')),
     (?, ?, 'mateo@inspectionpro.com', 'CONSULTANT', 'INSPECTION_TECHNICAL_APPROVAL', '192.168.0.10', 'inspections', ?, datetime('now', '-1 hour')),
     (?, ?, 'cliente@demologistics.com', 'CLIENT', 'REPORT_DOWNLOADED', '192.168.0.25', 'reports', ?, datetime('now', '-15 minutes'))`,
    [
      uuidv4(), operarioId, inspId,
      uuidv4(), mateoId, inspId,
      uuidv4(), 'usr-cliente-4', inspId
    ]
  );

  // 13. GENERATE THE ACTUAL OFFICIAL PDF REPORT ON DISK
  console.log('Generando documento PDF corporativo oficial...');
  const pdfResult = await generateInspectionPDF(inspId, mateoId);
  console.log('PDF generado exitosamente:', pdfResult);

  console.log('--- Ejemplo Completo INS-2026-000888 Creado con Éxito ---');
}

if (require.main === module) {
  createFullShowcaseExample().then(() => process.exit(0)).catch((err) => {
    console.error('Error al crear ejemplo completo:', err);
    process.exit(1);
  });
}
