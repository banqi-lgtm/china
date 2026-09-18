// Client-side fallback dataset and mock handlers for static deployment on EdgeOne / CDN

export const MOCK_USERS: Record<string, any> = {
  'admin@inspectionpro.com': {
    id: 'usr-admin-1',
    name: 'Super Admin',
    email: 'admin@inspectionpro.com',
    role: 'SUPER_ADMIN',
    company_id: null,
    company_name: 'Plataforma Central',
    phone: '+1 (800) 555-0199',
    active: 1,
  },
  'mateo@inspectionpro.com': {
    id: 'usr-mateo-2',
    name: 'Mateo (Lead Quality Consultant)',
    email: 'mateo@inspectionpro.com',
    role: 'CONSULTANT',
    company_id: null,
    company_name: 'Consultoría Especializada',
    phone: '+1 (800) 555-0122',
    active: 1,
  },
  'operario@inspectionpro.com': {
    id: 'usr-operario-3',
    name: 'Carlos Pérez (Operario de Calidad)',
    email: 'operario@inspectionpro.com',
    role: 'OPERATOR',
    company_id: 'comp-demo-1',
    company_name: 'Empresa Demo / TransLogix Global',
    phone: '+57 310 456 7890',
    active: 1,
  },
  'cliente@demologistics.com': {
    id: 'usr-cliente-4',
    name: 'Gerente TransLogix (Cliente Demo)',
    email: 'cliente@demologistics.com',
    role: 'CLIENT',
    company_id: 'comp-demo-1',
    company_name: 'Empresa Demo / TransLogix Global',
    phone: '+57 320 111 2233',
    active: 1,
  },
};

export const MOCK_COMPANIES = [
  {
    id: 'comp-demo-1',
    name: 'Empresa Demo / TransLogix Global',
    tax_id: 'NIT-901.849.201-4',
    address: 'Av. Empresarial 100, Zona Franca',
    contact_email: 'contacto@translogix.com',
    contact_phone: '+57 (1) 745-9000',
    active: 1,
  },
  {
    id: 'comp-agro-2',
    name: 'AgroExport del Pacífico S.A.',
    tax_id: 'NIT-800.123.456-7',
    address: 'Parque Logístico Portuario Muelle 3',
    contact_email: 'operaciones@agroexport.com',
    contact_phone: '+57 (2) 240-5500',
    active: 1,
  },
];

export const MOCK_CHECKLIST_TEMPLATE = [
  {
    category_id: 'cat-1',
    category_name: '1. Estructura Exterior y Precintos',
    questions: [
      { id: 'q-1', text: 'Inspección de 7 puntos del contenedor conforme a normas internacionales BASC/CTU.', requires_photo: 1 },
      { id: 'q-2', text: 'Puertas, fallebas y empaques de jebe en estado hermético sin filtraciones.', requires_photo: 0 },
      { id: 'q-3', text: 'Verificación y trazabilidad del precinto de alta seguridad (High Security Seal ISO/PAS 17712).', requires_photo: 1 },
    ],
  },
  {
    category_id: 'cat-2',
    category_name: '2. Interior y Condiciones Sanitarias',
    questions: [
      { id: 'q-4', text: 'Piso de madera o aluminio limpio, barrido, seco y libre de clavos o astillas.', requires_photo: 0 },
      { id: 'q-5', text: 'Paredes y techo sin perforaciones (prueba de luz / hermeticidad realizada).', requires_photo: 0 },
      { id: 'q-6', text: 'Ausencia de olores residuales, humedad visible o plagas vivas/muertas.', requires_photo: 0 },
    ],
  },
  {
    category_id: 'cat-3',
    category_name: '3. Estiba y Aseguramiento de Carga',
    questions: [
      { id: 'q-7', text: 'Pallets zunchados con esquineros protectores y flejes en tensión correcta.', requires_photo: 1 },
      { id: 'q-8', text: 'Instalación de bolsas de aire (dunnage airbags) y barras de trincaje para evitar desplazamiento.', requires_photo: 1 },
    ],
  },
];

export const MOCK_INSPECTIONS: any[] = [
  {
    id: 'insp-full-showcase-001',
    code: 'INS-2026-000888',
    company_id: 'comp-demo-1',
    company_name: 'Empresa Demo / TransLogix Global',
    type_id: 'type-loading',
    type_name: 'Inspección de Cargue y Contenedores',
    operator_id: 'usr-operario-3',
    operator_name: 'Carlos Pérez (Operario de Calidad)',
    consultant_id: 'usr-mateo-2',
    consultant_name: 'Mateo (Lead Quality Consultant)',
    status: 'APROBADA',
    progress: 100,
    latitude: 3.8812,
    longitude: -77.0345,
    location_address: 'Terminal Portuario Internacional de Carga - Muelle Principal Andén 4',
    scheduled_date: '2026-09-18',
    started_at: '2026-09-18 07:30:00',
    completed_at: '2026-09-18 11:00:00',
    approved_at: '2026-09-18 11:45:00',
    overall_result: 'PASS',
    notes: 'Inspección de cargue completada conforme a normas internacionales CTU/ISO. Carga estibada y trincada sin observaciones.',
    consultant_notes: 'Mateo (Consultor Senior): Revisión técnica finalizada satisfactoriamente. Fotografías de alta nitidez, precinto verificado con escaneo y empaque íntegro. Aprobado formalmente.',
    client_feedback: 'Cliente (TransLogix): Visto bueno recibido. Documento descargado para trámites aduaneros.',
    current_step: 10,
    container_number: 'MSKU-994120-3',
    product_name: 'Aguacate Hass de Exportación Extra & Café Grano Supremo',
    findings_count: 1,
    evidences_count: 4,
    created_at: '2026-09-18 07:00:00',
    updated_at: '2026-09-18 11:45:00',
  },
  {
    id: 'insp-demo-002',
    code: 'INS-2026-000887',
    company_id: 'comp-agro-2',
    company_name: 'AgroExport del Pacífico S.A.',
    type_id: 'type-loading',
    type_name: 'Inspección de Cargue y Contenedores',
    operator_id: 'usr-operario-3',
    operator_name: 'Carlos Pérez (Operario de Calidad)',
    consultant_id: 'usr-mateo-2',
    consultant_name: 'Mateo (Lead Quality Consultant)',
    status: 'PENDIENTE_REVISION',
    progress: 95,
    latitude: 3.8810,
    longitude: -77.0340,
    location_address: 'Bodega de Fríos 3 - Zona Franca del Pacífico',
    scheduled_date: '2026-09-18',
    started_at: '2026-09-18 08:30:00',
    overall_result: 'PASS',
    notes: 'Cargue refrigerado completado. Esperando validación de temperatura por Mateo.',
    current_step: 10,
    container_number: 'CMAU-128904-2',
    product_name: 'Filete de Trucha Congelado',
    findings_count: 0,
    evidences_count: 3,
    created_at: '2026-09-18 08:00:00',
    updated_at: '2026-09-18 10:30:00',
  }
];

export const MOCK_INSPECTION_DETAIL = {
  inspection: MOCK_INSPECTIONS[0],
  container: {
    id: 'cont-showcase',
    inspection_id: 'insp-full-showcase-001',
    container_number: 'MSKU-994120-3',
    container_type: 'High Cube Dry Box (HC)',
    size: '40ft HC',
    condition: 'Excelente - Piso limpio sin clavos, paredes sin perforaciones y gomas herméticas',
    transporter: 'Maersk Intermodal Logistics Colombia S.A.S.',
    license_plate: 'WZK-410',
    location: 'Muelle 4 - Patio de Consolidación A2',
    seal_number: 'CO-CUSTOMS-882104'
  },
  cargo: {
    id: 'cargo-showcase',
    inspection_id: 'insp-full-showcase-001',
    total_quantity: 1850,
    unit: 'Cajas Paletizadas',
    gross_weight: 24100.0,
    net_weight: 22800.0,
    volume: 69.5,
    packaging_type: 'Tarimas Europeas Tratadas NIMF-15',
    remarks: 'Embalaje con esquineros de alta densidad, flejes de polipropileno y bolsas de aire (dunnage airbags).'
  },
  loading: {
    id: 'load-showcase',
    inspection_id: 'insp-full-showcase-001',
    started_at: '07:30',
    finished_at: '10:45',
    personnel_count: 5,
    equipment_used: 'Montacargas Toyota 3.5T + 2 Transpaletas eléctricas Linde',
    weather_conditions: 'Despejado / Sin lluvia, temperatura ambiente 26°C',
    observations: 'Distribución uniforme del peso en ejes. Aseguramiento frontal con barras de bloqueo.'
  },
  product: {
    id: 'prod-showcase',
    inspection_id: 'insp-full-showcase-001',
    product_name: 'Aguacate Hass de Exportación Extra & Café Grano Supremo',
    reference: 'EXP-GLOBAL-2026',
    brand: 'Andina Premier Select',
    quantity: 1850,
    batch_lot: 'LOT-2026-COL-99',
    condition: 'Óptimo - Calidad Extra Export',
    observations: 'Cajas ventiladas con etiquetas de trazabilidad QR y sello de calidad ICA.'
  },
  vehicle: {
    id: 'veh-showcase',
    inspection_id: 'insp-full-showcase-001',
    vehicle_type: 'Tractocamión Kenworth T800 Modelo 2024',
    license_plate: 'WZK-410',
    driver_name: 'Javier Morales R.',
    driver_id: 'CC 80.123.456',
    condition: 'Excelente estado mecánico',
    observations: 'Planilla de viaje RNDC-2026-9912 al día. Pólizas y SOAT vigentes.'
  },
  answers: [
    { question_id: 'q-1', question_text: 'Inspección de 7 puntos del contenedor conforme a normas internacionales BASC/CTU.', category_name: 'Estructura Exterior', status: 'OK', observations: 'Verificado exterior e interior sin daños estructurales.' },
    { question_id: 'q-2', question_text: 'Puertas, fallebas y empaques de jebe en estado hermético sin filtraciones.', category_name: 'Estructura Exterior', status: 'OK', observations: 'Gomas herméticas íntegras.' },
    { question_id: 'q-3', question_text: 'Verificación y trazabilidad del precinto de alta seguridad.', category_name: 'Estructura Exterior', status: 'OK', observations: 'Precinto CO-CUSTOMS-882104 bloqueado.' },
    { question_id: 'q-4', question_text: 'Piso de madera o aluminio limpio, barrido, seco y libre de clavos o astillas.', category_name: 'Interior Sanitario', status: 'OK', observations: 'Piso seco y limpio.' },
    { question_id: 'q-5', question_text: 'Paredes y techo sin perforaciones (prueba de luz realizada).', category_name: 'Interior Sanitario', status: 'OK', observations: 'Prueba de luz satisfactoria.' },
    { question_id: 'q-6', question_text: 'Ausencia de olores residuales o humedad visible.', category_name: 'Interior Sanitario', status: 'OK', observations: 'Ambiente neutro sin humedad.' },
    { question_id: 'q-7', question_text: 'Pallets zunchados con esquineros protectores y flejes en tensión.', category_name: 'Estiba y Trincaje', status: 'OK', observations: 'Carga paletizada compacta.' },
    { question_id: 'q-8', question_text: 'Instalación de bolsas de aire (dunnage airbags) y barras de trincaje.', category_name: 'Estiba y Trincaje', status: 'OK', observations: 'Bolsas neumáticas infladas a 3 PSI.' },
  ],
  findings: [
    {
      id: 'fnd-showcase',
      code: 'FND-8801',
      category: 'Estructura Exterior',
      severity: 'BAJA',
      description: 'Leve raspadura superficial en pintura de puerta izquierda sin pérdida de grosor ni óxido.',
      status: 'RESUELTO',
      responsible: 'Inspector de Patio',
      corrective_action: 'Verificación de hermeticidad con prueba de luz interior. Conforme.',
      created_at: '2026-09-18 08:30:00'
    }
  ],
  evidences: [
    {
      id: 'ev-1',
      inspection_id: 'insp-full-showcase-001',
      section: 'CONTENEDOR',
      type: 'PHOTO',
      file_path: 'uploads/demo/1_container_exterior.jpg',
      file_name: '1_container_exterior.jpg',
      file_size: 1008020,
      description: 'Vista exterior de 7 puntos del contenedor MSKU-994120-3 en patio de muelle',
      is_primary: 1,
      rotation: 0
    },
    {
      id: 'ev-2',
      inspection_id: 'insp-full-showcase-001',
      section: 'CARGUE',
      type: 'PHOTO',
      file_path: 'uploads/demo/2_loading_process.jpg',
      file_name: '2_loading_process.jpg',
      file_size: 982877,
      description: 'Proceso de estiba de pallets y colocación de bolsas neumáticas dunnage',
      is_primary: 1,
      rotation: 0
    },
    {
      id: 'ev-3',
      inspection_id: 'insp-full-showcase-001',
      section: 'PRODUCTO',
      type: 'PHOTO',
      file_path: 'uploads/demo/3_product_quality.jpg',
      file_name: '3_product_quality.jpg',
      file_size: 1068834,
      description: 'Muestreo aleatorio de producto con etiquetas QC Passed y sacos de café',
      is_primary: 1,
      rotation: 0
    },
    {
      id: 'ev-4',
      inspection_id: 'insp-full-showcase-001',
      section: 'DOCUMENTACION',
      type: 'PHOTO',
      file_path: 'uploads/demo/4_container_seal.jpg',
      file_name: '4_container_seal.jpg',
      file_size: 792666,
      description: 'Precinto de seguridad aduanero CO-CUSTOMS-882104 trabado en manija',
      is_primary: 1,
      rotation: 0
    }
  ],
  signatures: [
    { signer_type: 'OPERATOR', signer_name: 'Carlos Pérez (Operario)', signed_at: '2026-09-18 11:00:00' },
    { signer_type: 'CONSULTANT', signer_name: 'Mateo (Lead Auditor)', signed_at: '2026-09-18 11:45:00' }
  ],
  timeline: [
    { previous_status: null, new_status: 'BORRADOR', user_name: 'Super Admin', comment: 'Inspección programada para cargue.', created_at: '2026-09-18 07:00:00' },
    { previous_status: 'BORRADOR', new_status: 'ASIGNADA', user_name: 'Mateo', comment: 'Asignado a Carlos Pérez.', created_at: '2026-09-18 07:15:00' },
    { previous_status: 'ASIGNADA', new_status: 'EN_PROCESO', user_name: 'Carlos Pérez', comment: 'Inicio de inspección con GPS.', created_at: '2026-09-18 07:30:00' },
    { previous_status: 'EN_PROCESO', new_status: 'PENDIENTE_REVISION', user_name: 'Carlos Pérez', comment: '10 pasos completados y firmas listas.', created_at: '2026-09-18 11:00:00' },
    { previous_status: 'PENDIENTE_REVISION', new_status: 'APROBADA', user_name: 'Mateo', comment: 'Revisión técnica aprobada.', created_at: '2026-09-18 11:45:00' }
  ],
  report: {
    report_code: 'INS-2026-000888',
    pdf_path: '/uploads/reports/REPORT_INS-2026-000888_1789753679935.pdf'
  }
};

export const MOCK_STATS = {
  total: 24,
  in_process: 5,
  pending_review: 4,
  approved: 12,
  in_correction: 2,
  rejected: 1,
  approval_rate: 92.3,
  findings_total: 14,
  findings_pending: 3,
  avg_inspection_time_hours: 3.2,
  by_month: [
    { month: '2026-05', count: 18 },
    { month: '2026-06', count: 22 },
    { month: '2026-07', count: 26 },
    { month: '2026-08', count: 31 },
    { month: '2026-09', count: 24 }
  ],
  by_type: [
    { type_name: 'Inspección de Cargue y Contenedores', count: 16 },
    { type_name: 'Auditoría Pre-Embarque', count: 8 }
  ]
};

export const MOCK_REPORTS = [
  {
    id: 'rep-001',
    report_code: 'INS-2026-000888',
    inspection_id: 'insp-full-showcase-001',
    inspection_code: 'INS-2026-000888',
    company_name: 'Empresa Demo / TransLogix Global',
    inspection_status: 'APROBADA',
    overall_result: 'PASS',
    pdf_path: '/uploads/reports/REPORT_INS-2026-000888_1789753679935.pdf',
    version: 1,
    generated_by_name: 'Mateo (Lead Quality Consultant)',
    generated_at: '2026-09-18 11:45:00'
  }
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 'log-1',
    user_name: 'Mateo (Lead Quality Consultant)',
    user_email: 'mateo@inspectionpro.com',
    role: 'CONSULTANT',
    action: 'INSPECTION_APPROVED',
    ip_address: '190.158.42.11',
    affected_table: 'inspections',
    record_id: 'insp-full-showcase-001',
    created_at: '2026-09-18 11:45:00'
  },
  {
    id: 'log-2',
    user_name: 'Carlos Pérez',
    user_email: 'operario@inspectionpro.com',
    role: 'OPERATOR',
    action: 'EVIDENCE_UPLOADED',
    ip_address: '181.61.12.98',
    affected_table: 'evidences',
    record_id: 'ev-4',
    created_at: '2026-09-18 10:50:00'
  }
];
