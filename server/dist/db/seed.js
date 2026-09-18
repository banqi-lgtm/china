"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const config_1 = require("../config");
// 1x1 or small valid PNG base64 for sample images
const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAlgAAAGQCAYAAAByNR6YAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAA' +
    'EnQAABJ0Ad5mPtUAABBTSURBVHhe7d0xihxJFoDh/x/am1uwt2Av1o0E74bZG8jeyHsj6A1gb4BwE3oz3pvhN4G7wBuwb8DO' +
    'YF2fWVEZWRlZlVnp/r7nAT05lZVZ8edHZERmRj7956effgMAAIA/vHn706fffv0rAAAAvHnzzZ+++fM/fv2LAACANz/879e/' +
    'f/2/rwAAAPBfX/3tN//2v/4DAADAm7/98T9//uOv/wQAAPBff/r7r//837/9MwAAALz56Z9///U///cTAAAA//iPf/35r///' +
    'EwAAwJv/fPj627999W8AAAD446d//f7r3/8HAAAAAPj/AAAAAAD//wMAH4kXvT0rKxEAAAAASUVORK5CYII=';
async function seedDatabase() {
    await (0, database_1.initDatabase)();
    console.log('Seeding database with enterprise demo dataset...');
    // 1. Companies
    const comp1Id = 'comp-demo-1';
    const comp2Id = 'comp-agro-2';
    await database_1.db.run(`INSERT OR REPLACE INTO companies (id, name, tax_id, address, contact_email, contact_phone, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`, [comp1Id, 'Empresa Demo / TransLogix Global', 'NIT-901.849.201-4', 'Av. Empresarial 100, Zona Franca', 'contacto@translogix.com', '+57 (1) 745-9000']);
    await database_1.db.run(`INSERT OR REPLACE INTO companies (id, name, tax_id, address, contact_email, contact_phone, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`, [comp2Id, 'AgroExport del Pacífico S.A.', 'NIT-800.123.456-7', 'Parque Logístico Portuario Muelle 3', 'operaciones@agroexport.com', '+57 (2) 240-5500']);
    // 2. Users (Passwords: admin123, mateo123, operario123, cliente123)
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashAdmin = await bcryptjs_1.default.hash('admin123', salt);
    const hashMateo = await bcryptjs_1.default.hash('mateo123', salt);
    const hashOperario = await bcryptjs_1.default.hash('operario123', salt);
    const hashCliente = await bcryptjs_1.default.hash('cliente123', salt);
    const adminId = 'usr-admin-1';
    const mateoId = 'usr-mateo-2';
    const operarioId = 'usr-operario-3';
    const clienteId = 'usr-cliente-4';
    await database_1.db.run(`INSERT OR REPLACE INTO users (id, company_id, name, email, password_hash, role, phone, active)
     VALUES (?, NULL, ?, ?, ?, 'SUPER_ADMIN', ?, 1)`, [adminId, 'Super Admin', 'admin@inspectionpro.com', hashAdmin, '+1 (800) 555-0199']);
    await database_1.db.run(`INSERT OR REPLACE INTO users (id, company_id, name, email, password_hash, role, phone, active)
     VALUES (?, NULL, ?, ?, ?, 'CONSULTANT', ?, 1)`, [mateoId, 'Mateo (Lead Quality Consultant)', 'mateo@inspectionpro.com', hashMateo, '+1 (800) 555-0122']);
    await database_1.db.run(`INSERT OR REPLACE INTO users (id, company_id, name, email, password_hash, role, phone, active)
     VALUES (?, ?, ?, ?, ?, 'OPERATOR', ?, 1)`, [operarioId, comp1Id, 'Operario Demo', 'operario@inspectionpro.com', hashOperario, '+57 310 456 7890']);
    await database_1.db.run(`INSERT OR REPLACE INTO users (id, company_id, name, email, password_hash, role, phone, active)
     VALUES (?, ?, ?, ?, ?, 'CLIENT', ?, 1)`, [clienteId, comp1Id, 'Gerente TransLogix (Cliente Demo)', 'cliente@demologistics.com', hashCliente, '+57 320 111 2233']);
    // 3. Inspection Types
    await database_1.db.run(`INSERT OR REPLACE INTO inspection_types (id, code, name, description, active)
     VALUES 
     ('type-loading', 'LOAD_AUDIT', 'Inspección de Cargue y Contenedor', 'Auditoría integral de calidad estructural, estiba y precintado.', 1),
     ('type-preship', 'PRE_SHIP', 'Inspección Pre-embarque', 'Verificación de embalaje y cantidades previo a salida.', 1),
     ('type-seal', 'SEAL_VERIF', 'Control de Precintos y Sellos de Seguridad', 'Protocolo estricto de precintos aduaneros.', 1)`);
    // 4. Checklist Categories & Questions
    const cat1Id = 'cat-container-cond';
    const cat2Id = 'cat-loading-proc';
    const cat3Id = 'cat-seals-sec';
    await database_1.db.run(`INSERT OR REPLACE INTO checklist_categories (id, name, order_index)
     VALUES 
     (?, 'Condiciones Generales del Contenedor', 1),
     (?, 'Proceso de Cargue y Estiba', 2),
     (?, 'Precintos y Seguridad Final', 3)`, [cat1Id, cat2Id, cat3Id]);
    const questions = [
        { id: 'q1', cat: cat1Id, text: '¿El piso se encuentra en buenas condiciones (limpio, sin clavos o manchas de aceite)?', req: 1, ord: 1 },
        { id: 'q2', cat: cat1Id, text: '¿El techo y paredes están libres de perforaciones o filtraciones de luz?', req: 1, ord: 2 },
        { id: 'q3', cat: cat1Id, text: '¿Las puertas cierran y ajustan herméticamente con empaques íntegros?', req: 1, ord: 3 },
        { id: 'q4', cat: cat1Id, text: '¿El contenedor está libre de óxido severo, deformaciones o daños estructurales?', req: 1, ord: 4 },
        { id: 'q5', cat: cat1Id, text: '¿El interior se encuentra seco y completamente libre de olores extraños?', req: 1, ord: 5 },
        { id: 'q6', cat: cat2Id, text: '¿La mercancía fue manipulada con equipo adecuado (montacargas/estibadores)?', req: 0, ord: 1 },
        { id: 'q7', cat: cat2Id, text: '¿Se aplicaron protectores, esquineros, zunchos o bolsas de aire (dunnage)?', req: 1, ord: 2 },
        { id: 'q8', cat: cat2Id, text: '¿La distribución de peso en los ejes es uniforme y segura para transporte marítimo?', req: 1, ord: 3 },
        { id: 'q9', cat: cat3Id, text: '¿Se verificó el número de precinto oficial antes y después del cierre?', req: 1, ord: 1 },
        { id: 'q10', cat: cat3Id, text: '¿El precinto de alta seguridad (tipo botella) quedó firmemente trabado?', req: 1, ord: 2 }
    ];
    for (const q of questions) {
        await database_1.db.run(`INSERT OR REPLACE INTO checklist_questions (id, category_id, question_text, requires_evidence_on_fail, order_index)
       VALUES (?, ?, ?, ?, ?)`, [q.id, q.cat, q.text, q.req, q.ord]);
    }
    // Create sample photo file on disk
    const samplePhotoDir = path_1.default.join(config_1.UPLOAD_DIR, 'companies', comp1Id, 'inspections', 'sample', 'photos');
    fs_1.default.mkdirSync(samplePhotoDir, { recursive: true });
    const samplePhotoPath = path_1.default.join(samplePhotoDir, 'container_sample.png');
    fs_1.default.writeFileSync(samplePhotoPath, Buffer.from(samplePngBase64, 'base64'));
    // 5. Seed Inspections
    // Inspection 1: APROBADA (Complete with generated PDF, perfect for client / consultant review)
    const insp1Id = 'insp-demo-001';
    await database_1.db.run(`INSERT OR REPLACE INTO inspections (
      id, code, company_id, type_id, operator_id, consultant_id, status, progress,
      latitude, longitude, location_address, scheduled_date, started_at, completed_at, approved_at,
      overall_result, notes, consultant_notes, current_step
    ) VALUES (
      ?, 'INS-2026-000001', ?, 'type-loading', ?, ?, 'APROBADA', 100,
      4.7110, -74.0721, 'Terminal Marítimo Buenaventura Muelle 2', '2026-09-18', '2026-09-18 08:30:00',
      '2026-09-18 11:30:00', '2026-09-18 12:00:00', 'PASS',
      'Operación de cargue completada sin demoras.', 'Inspección revisada y aprobada. Cumple con estándares ISO/CTU.', 10
    )`, [insp1Id, comp1Id, operarioId, mateoId]);
    await database_1.db.run(`INSERT OR REPLACE INTO container_details (id, inspection_id, container_number, container_type, size, condition, transporter, license_plate, location, seal_number)
     VALUES (?, ?, 'MSKU-729401-8', 'High Cube Dry Box', '40ft HC', 'Excelente - Estructura 100% íntegra', 'Maersk Logistics Colombia', 'TLX-408', 'Muelle 2 - Bloque C', 'CO-MAERSK-981245')`, ['cont-1', insp1Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO cargo_details (id, inspection_id, total_quantity, unit, gross_weight, net_weight, volume, packaging_type, remarks)
     VALUES (?, ?, 1450, 'Cajas Paletizadas', 22450.0, 21200.0, 68.5, 'Tarimas Europeas Termotratadas', 'Carga embalada con plástico termoencogible y esquineros de alta densidad.')`, ['carg-1', insp1Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO loading_process (id, inspection_id, started_at, finished_at, personnel_count, equipment_used, weather_conditions, observations)
     VALUES (?, ?, '08:30', '11:15', 5, 'Montacargas Toyota 3.5T + Transpaletas eléctricas', 'Despejado / Sin precipitación (31°C)', 'Estiba completada con amarres de trinquete y bolsas de aire.')`, ['load-1', insp1Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO product_details (id, inspection_id, product_name, reference, brand, quantity, batch_lot, condition, observations)
     VALUES (?, ?, 'Café Gourmet Especial Tostado en Grano', 'COF-EXP-2026', 'Mountain Reserve', 1450, 'LOT-2026-A48', 'Óptimo - Sin humedad', 'Humedad de grano verificada en 11.2%.')`, ['prod-1', insp1Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO vehicle_details (id, inspection_id, vehicle_type, license_plate, driver_name, driver_id, condition, observations)
     VALUES (?, ?, 'Tractocamión Kenworth T800', 'SZK-912', 'Carlos Mendoza R.', 'CC 79.432.100', 'Perfecto estado mecánico y llantas', 'SOAT y RTM vigentes.')`, ['veh-1', insp1Id]);
    // Add Answers for Insp 1
    for (const q of questions) {
        await database_1.db.run(`INSERT OR REPLACE INTO checklist_answers (id, inspection_id, question_id, status, observations)
       VALUES (?, ?, ?, 'OK', 'Verificado y conforme.')`, [(0, uuid_1.v4)(), insp1Id, q.id]);
    }
    // Add Signatures
    await database_1.db.run(`INSERT OR REPLACE INTO signatures (id, inspection_id, signer_type, signer_name, signature_data, signed_at)
     VALUES 
     (?, ?, 'OPERATOR', 'Operario Demo', 'data:image/png;base64,${samplePngBase64}', '2026-09-18 11:35:00'),
     (?, ?, 'CONSULTANT', 'Mateo (Lead Quality Consultant)', 'data:image/png;base64,${samplePngBase64}', '2026-09-18 12:00:00')`, [(0, uuid_1.v4)(), insp1Id, (0, uuid_1.v4)(), insp1Id]);
    // Add Evidences for Insp 1
    await database_1.db.run(`INSERT OR REPLACE INTO evidences (id, inspection_id, section, type, file_path, file_name, file_size, mime_type, description, is_primary, rotation, uploaded_by)
     VALUES 
     (?, ?, 'CONTENEDOR', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/sample/photos/container_sample.png', 'contenedor_exterior.png', 245000, 'image/png', 'Vista lateral y estructura del contenedor MSKU-729401-8', 1, 0, ?),
     (?, ?, 'CARGUE', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/sample/photos/container_sample.png', 'cargue_pallets.png', 215000, 'image/png', 'Distribución de tarimas y bolsas de amortiguación (dunnage)', 1, 0, ?),
     (?, ?, 'PRODUCTO', 'PHOTO', 'uploads/companies/comp-demo-1/inspections/sample/photos/container_sample.png', 'producto_lote.png', 198000, 'image/png', 'Inspección de etiquetas y empaque de café especial', 1, 0, ?)`, [(0, uuid_1.v4)(), insp1Id, operarioId, (0, uuid_1.v4)(), insp1Id, operarioId, (0, uuid_1.v4)(), insp1Id, operarioId]);
    // Inspection 2: PENDIENTE_REVISION (Ready for Mateo to review and approve!)
    const insp2Id = 'insp-demo-002';
    await database_1.db.run(`INSERT OR REPLACE INTO inspections (
      id, code, company_id, type_id, operator_id, consultant_id, status, progress,
      latitude, longitude, location_address, scheduled_date, started_at, completed_at,
      overall_result, notes, current_step
    ) VALUES (
      ?, 'INS-2026-000002', ?, 'type-loading', ?, ?, 'PENDIENTE_REVISION', 90,
      3.8801, -77.0311, 'Terminal TCBUEN Puerta 4', '2026-09-18', '2026-09-18 09:15:00',
      '2026-09-18 11:45:00', 'PENDING',
      'Inspección finalizada por operario en campo. Enviada a Mateo para validación final.', 9
    )`, [insp2Id, comp1Id, operarioId, mateoId]);
    await database_1.db.run(`INSERT OR REPLACE INTO container_details (id, inspection_id, container_number, container_type, size, condition, transporter, license_plate, location, seal_number)
     VALUES (?, ?, 'TGHU-834910-2', 'Dry Van Standard', '20ft GP', 'Buen estado general', 'Transportes del Valle', 'WNA-301', 'Patio 1A', 'CO-CUSTOMS-4419')`, ['cont-2', insp2Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO cargo_details (id, inspection_id, total_quantity, unit, gross_weight, net_weight, volume, packaging_type, remarks)
     VALUES (?, ?, 850, 'Cajas de Cartón Corrugado', 14200.0, 13100.0, 32.4, 'Estibas Estándar', 'Mercancía textil de exportación.')`, ['carg-2', insp2Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO loading_process (id, inspection_id, started_at, finished_at, personnel_count, equipment_used, weather_conditions, observations)
     VALUES (?, ?, '09:15', '11:40', 3, 'Montacargas Hyster 2.5T', 'Nublado / Seco', 'Proceso completado sin incidentes.')`, ['load-2', insp2Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO product_details (id, inspection_id, product_name, reference, brand, quantity, batch_lot, condition, observations)
     VALUES (?, ?, 'Prendas de Vestir en Algodón Orgánico', 'APP-2026-COL', 'Andina Apparel', 850, 'LOT-TEX-89', 'Conforme', 'Empaque individual en bolsas herméticas.')`, ['prod-2', insp2Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO vehicle_details (id, inspection_id, vehicle_type, license_plate, driver_name, driver_id, condition, observations)
     VALUES (?, ?, 'Camión Sencillo Chevrolet FVR', 'WNA-301', 'Hernando Duque', 'CC 14.889.321', 'Aceptable', 'Revisión preventiva al día.')`, ['veh-2', insp2Id]);
    for (const q of questions) {
        await database_1.db.run(`INSERT OR REPLACE INTO checklist_answers (id, inspection_id, question_id, status, observations)
       VALUES (?, ?, ?, 'OK', 'Conforme con inspección.')`, [(0, uuid_1.v4)(), insp2Id, q.id]);
    }
    // Inspection 3: EN_PROCESO (Assigned to Operario Demo to test the mobile wizard)
    const insp3Id = 'insp-demo-003';
    await database_1.db.run(`INSERT OR REPLACE INTO inspections (
      id, code, company_id, type_id, operator_id, consultant_id, status, progress,
      latitude, longitude, location_address, scheduled_date, started_at,
      overall_result, notes, current_step
    ) VALUES (
      ?, 'INS-2026-000003', ?, 'type-loading', ?, ?, 'EN_PROCESO', 40,
      4.7110, -74.0721, 'Bodega Central Fontibón', '2026-09-18', '2026-09-18 10:00:00',
      'PENDING', 'Operario diligenciando información del cargue.', 4
    )`, [insp3Id, comp1Id, operarioId, mateoId]);
    await database_1.db.run(`INSERT OR REPLACE INTO container_details (id, inspection_id, container_number, container_type, size, condition, transporter, license_plate, location, seal_number)
     VALUES (?, ?, 'CMAU-551029-4', 'Reefer Container (Refrigerado)', '40ft RF', 'Limpio y pre-enfriado', 'Logística Fría del Pacífico', 'KJN-883', 'Bodega Andina Fríos', 'CMA-COL-9901')`, ['cont-3', insp3Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO cargo_details (id, inspection_id, total_quantity, unit, gross_weight, net_weight, volume, packaging_type, remarks)
     VALUES (?, ?, 1200, 'Cajas Ventiladas', 18500.0, 17200.0, 58.0, 'Tarimas Plastificadas', 'Fruta fresca - Aguacate Hass.')`, ['carg-3', insp3Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO loading_process (id, inspection_id, started_at, finished_at, personnel_count, equipment_used, weather_conditions, observations)
     VALUES (?, ?, '10:00', NULL, 4, 'Transpaletas y rampa de frío', 'Temperatura controlada 6°C', 'En proceso de estiba.')`, ['load-3', insp3Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO product_details (id, inspection_id, product_name, reference, brand, quantity, batch_lot, condition, observations)
     VALUES (?, ?, 'Aguacate Hass Exportación Calibre 14', 'AVO-HASS-2026', 'Green Valley', 1200, 'LOT-HASS-03', 'Calidad Extra', 'Firmeza y temperatura en rango óptimo.')`, ['prod-3', insp3Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO vehicle_details (id, inspection_id, vehicle_type, license_plate, driver_name, driver_id, condition, observations)
     VALUES (?, ?, 'Tractomula ThermoKing', 'KJN-883', 'Mauricio Gómez', 'CC 94.210.880', 'Óptimo - Termógrafo activo', 'Temperatura calibrada.')`, ['veh-3', insp3Id]);
    // Add initial answers for insp 3
    for (const q of questions) {
        await database_1.db.run(`INSERT OR REPLACE INTO checklist_answers (id, inspection_id, question_id, status, observations)
       VALUES (?, ?, ?, 'OK', 'Revisión preliminar.')`, [(0, uuid_1.v4)(), insp3Id, q.id]);
    }
    // Inspection 4: EN_CORRECCION (With a finding and note from Mateo)
    const insp4Id = 'insp-demo-004';
    await database_1.db.run(`INSERT OR REPLACE INTO inspections (
      id, code, company_id, type_id, operator_id, consultant_id, status, progress,
      latitude, longitude, location_address, scheduled_date, started_at,
      overall_result, notes, consultant_notes, current_step
    ) VALUES (
      ?, 'INS-2026-000004', ?, 'type-loading', ?, ?, 'EN_CORRECCION', 75,
      4.7110, -74.0721, 'Parque Industrial Cota', '2026-09-17', '2026-09-17 14:00:00',
      'CONDITIONAL', 'Inspección devuelta por el consultor.',
      'Mateo: Por favor actualizar la fotografía del precinto de seguridad, la imagen anterior está borrosa.', 6
    )`, [insp4Id, comp1Id, operarioId, mateoId]);
    await database_1.db.run(`INSERT OR REPLACE INTO container_details (id, inspection_id, container_number, container_type, size, condition, transporter, license_plate, location, seal_number)
     VALUES (?, ?, 'HLXU-402918-0', 'Dry Container', '40ft GP', 'Pequeñas abolladuras exteriores sin fuga', 'Hapag Lloyd Transports', 'EQZ-119', 'Andén 7', 'HL-SEC-7712')`, ['cont-4', insp4Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO cargo_details (id, inspection_id, total_quantity, unit, gross_weight, net_weight, volume, packaging_type, remarks)
     VALUES (?, ?, 960, 'Tambores Metálicos', 21100.0, 19800.0, 48.0, 'Pallets con fleje de acero', 'Materia prima química no peligrosa.')`, ['carg-4', insp4Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO loading_process (id, inspection_id) VALUES (?, ?)`, ['load-4', insp4Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO product_details (id, inspection_id, product_name) VALUES (?, ?, 'Glicerina Grado Industrial')`, ['prod-4', insp4Id]);
    await database_1.db.run(`INSERT OR REPLACE INTO vehicle_details (id, inspection_id) VALUES (?, ?)`, ['veh-4', insp4Id]);
    // Finding for Insp 4
    await database_1.db.run(`INSERT OR REPLACE INTO findings (id, code, inspection_id, category, severity, description, status, created_at)
     VALUES (?, 'FND-1049', ?, 'Fotografías de Evidencia', 'MEDIA', 'Fotografía del precinto final fuera de foco. Se requiere retoma.', 'EN_TRATAMIENTO', datetime('now'))`, [(0, uuid_1.v4)(), insp4Id]);
    // Status History / Audit records
    await database_1.db.run(`INSERT INTO inspection_status_history (id, inspection_id, previous_status, new_status, changed_by, comment, created_at)
     VALUES 
     (?, ?, 'EN_PROCESO', 'PENDIENTE_REVISION', ?, 'Operario finalizó y envió a revisión.', datetime('now', '-2 hours')),
     (?, ?, 'PENDIENTE_REVISION', 'EN_CORRECCION', ?, 'Mateo solicitó corrección de fotografía de precinto.', datetime('now', '-1 hour'))`, [(0, uuid_1.v4)(), insp4Id, operarioId, (0, uuid_1.v4)(), insp4Id, mateoId]);
    // System Notifications
    await database_1.db.run(`INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
     VALUES 
     (?, ?, 'Inspección asignada', 'Tienes la inspección INS-2026-000003 asignada en Bodega Central.', 'INFO', '/inspections/insp-demo-003', 0, datetime('now')),
     (?, ?, 'Inspección pendiente de aprobación', 'La inspección INS-2026-000002 está lista para tu revisión técnica.', 'ALERT', '/inspections/insp-demo-002', 0, datetime('now'))`, [(0, uuid_1.v4)(), operarioId, (0, uuid_1.v4)(), mateoId]);
    // Initial Audit Log
    await database_1.db.run(`INSERT INTO audit_logs (id, user_id, user_email, role, action, ip_address, affected_table, record_id, created_at)
     VALUES 
     (?, ?, 'admin@inspectionpro.com', 'SUPER_ADMIN', 'SYSTEM_SEED_INITIALIZED', '127.0.0.1', 'all', 'demo-dataset', datetime('now'))`, [(0, uuid_1.v4)(), adminId]);
    console.log('Database seeding successfully completed with full enterprise dataset!');
}
if (require.main === module) {
    seedDatabase().then(() => process.exit(0)).catch((err) => {
        console.error('Seeding error:', err);
        process.exit(1);
    });
}
