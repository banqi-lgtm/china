-- Companies / Clientes Contratantes
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Users with RBAC
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'CONSULTANT', 'OPERATOR', 'CLIENT')),
  phone TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Inspection Types (e.g. Loading Inspection, Pre-shipment, Container Sealing)
CREATE TABLE IF NOT EXISTS inspection_types (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1
);

-- Main Inspections Table
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  company_id TEXT NOT NULL,
  type_id TEXT,
  operator_id TEXT,
  consultant_id TEXT,
  status TEXT NOT NULL DEFAULT 'BORRADOR' CHECK(status IN (
    'BORRADOR', 'ASIGNADA', 'EN_PROCESO', 'PENDIENTE_REVISION', 
    'EN_CORRECCION', 'APROBADA', 'RECHAZADA', 'FINALIZADA'
  )),
  progress INTEGER DEFAULT 0,
  latitude REAL,
  longitude REAL,
  location_address TEXT,
  scheduled_date TEXT,
  started_at TEXT,
  completed_at TEXT,
  approved_at TEXT,
  overall_result TEXT DEFAULT 'PENDING' CHECK(overall_result IN ('PENDING', 'PASS', 'FAIL', 'CONDITIONAL')),
  notes TEXT,
  consultant_notes TEXT,
  client_feedback TEXT,
  current_step INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (type_id) REFERENCES inspection_types(id),
  FOREIGN KEY (operator_id) REFERENCES users(id),
  FOREIGN KEY (consultant_id) REFERENCES users(id)
);

-- Step 2: Container Information
CREATE TABLE IF NOT EXISTS container_details (
  id TEXT PRIMARY KEY,
  inspection_id TEXT UNIQUE NOT NULL,
  container_number TEXT NOT NULL,
  container_type TEXT,
  size TEXT,
  condition TEXT,
  transporter TEXT,
  license_plate TEXT,
  location TEXT,
  seal_number TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Step 3: Cargo / Quantity
CREATE TABLE IF NOT EXISTS cargo_details (
  id TEXT PRIMARY KEY,
  inspection_id TEXT UNIQUE NOT NULL,
  total_quantity REAL,
  unit TEXT,
  gross_weight REAL,
  net_weight REAL,
  volume REAL,
  packaging_type TEXT,
  remarks TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Step 4 & Dynamic Checklist Architecture
CREATE TABLE IF NOT EXISTS checklist_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checklist_questions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  requires_evidence_on_fail INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES checklist_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_answers (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OK' CHECK(status IN ('OK', 'NO_OK', 'NA')),
  observations TEXT,
  UNIQUE(inspection_id, question_id),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES checklist_questions(id) ON DELETE CASCADE
);

-- Step 5: Loading Process
CREATE TABLE IF NOT EXISTS loading_process (
  id TEXT PRIMARY KEY,
  inspection_id TEXT UNIQUE NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  personnel_count INTEGER,
  equipment_used TEXT,
  weather_conditions TEXT,
  observations TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Step 7: Product Details
CREATE TABLE IF NOT EXISTS product_details (
  id TEXT PRIMARY KEY,
  inspection_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  reference TEXT,
  brand TEXT,
  quantity REAL,
  batch_lot TEXT,
  condition TEXT,
  observations TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Step 8: Vehicle / Machinery
CREATE TABLE IF NOT EXISTS vehicle_details (
  id TEXT PRIMARY KEY,
  inspection_id TEXT UNIQUE NOT NULL,
  vehicle_type TEXT,
  license_plate TEXT,
  driver_name TEXT,
  driver_id TEXT,
  condition TEXT,
  observations TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Step 6 & System-wide Evidences (Photos, Videos, Documents)
CREATE TABLE IF NOT EXISTS evidences (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK(section IN (
    'CONTENEDOR', 'CARGUE', 'PRODUCTO', 'VEHICULO', 'DANOS', 'DOCUMENTACION', 'OTRAS'
  )),
  type TEXT NOT NULL CHECK(type IN ('PHOTO', 'VIDEO', 'DOCUMENT')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  description TEXT,
  is_primary INTEGER DEFAULT 0,
  rotation INTEGER DEFAULT 0,
  uploaded_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Findings / Hallazgos Module
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  inspection_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  description TEXT NOT NULL,
  evidence_id TEXT,
  status TEXT NOT NULL DEFAULT 'ABIERTO' CHECK(status IN ('ABIERTO', 'EN_TRATAMIENTO', 'RESUELTO')),
  responsible TEXT,
  corrective_action TEXT,
  comments TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id) REFERENCES evidences(id) ON DELETE SET NULL
);

-- Digital Signatures
CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  signer_type TEXT NOT NULL CHECK(signer_type IN ('OPERATOR', 'CONSULTANT', 'CLIENT', 'FACTORY')),
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL, -- base64 data url or file path
  signed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Inspection Lifecycle Timeline
CREATE TABLE IF NOT EXISTS inspection_status_history (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Official Generated PDF Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  report_code TEXT UNIQUE NOT NULL,
  pdf_path TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  generated_by TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- System Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comprehensive Enterprise Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  role TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  affected_table TEXT,
  record_id TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
