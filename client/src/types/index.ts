export type UserRole = 'SUPER_ADMIN' | 'CONSULTANT' | 'OPERATOR' | 'CLIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  company_name?: string;
  phone?: string;
  active?: number;
}

export interface Company {
  id: string;
  name: string;
  tax_id?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  active: number;
}

export type InspectionStatus = 
  | 'BORRADOR' 
  | 'ASIGNADA' 
  | 'EN_PROCESO' 
  | 'PENDIENTE_REVISION' 
  | 'EN_CORRECCION' 
  | 'APROBADA' 
  | 'RECHAZADA' 
  | 'FINALIZADA';

export type OverallResult = 'PENDING' | 'PASS' | 'FAIL' | 'CONDITIONAL';

export interface Inspection {
  id: string;
  code: string;
  company_id: string;
  company_name?: string;
  type_id?: string;
  type_name?: string;
  operator_id?: string;
  operator_name?: string;
  consultant_id?: string;
  consultant_name?: string;
  status: InspectionStatus;
  progress: number;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  approved_at?: string;
  overall_result: OverallResult;
  notes?: string;
  consultant_notes?: string;
  client_feedback?: string;
  current_step: number;
  created_at: string;
  updated_at: string;
  container_number?: string;
  product_name?: string;
  findings_count?: number;
  evidences_count?: number;
}

export interface ContainerDetails {
  id?: string;
  inspection_id?: string;
  container_number?: string;
  container_type?: string;
  size?: string;
  condition?: string;
  transporter?: string;
  license_plate?: string;
  location?: string;
  seal_number?: string;
}

export interface CargoDetails {
  id?: string;
  inspection_id?: string;
  total_quantity?: number;
  unit?: string;
  gross_weight?: number;
  net_weight?: number;
  volume?: number;
  packaging_type?: string;
  remarks?: string;
}

export interface LoadingProcess {
  id?: string;
  inspection_id?: string;
  started_at?: string;
  finished_at?: string;
  personnel_count?: number;
  equipment_used?: string;
  weather_conditions?: string;
  observations?: string;
}

export interface ProductDetails {
  id?: string;
  inspection_id?: string;
  product_name?: string;
  reference?: string;
  brand?: string;
  quantity?: number;
  batch_lot?: string;
  condition?: string;
  observations?: string;
}

export interface VehicleDetails {
  id?: string;
  inspection_id?: string;
  vehicle_type?: string;
  license_plate?: string;
  driver_name?: string;
  driver_id?: string;
  condition?: string;
  observations?: string;
}

export interface ChecklistQuestion {
  id: string;
  category_id: string;
  question_text: string;
  requires_evidence_on_fail: number;
  order_index: number;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  order_index: number;
  questions?: ChecklistQuestion[];
}

export interface ChecklistAnswer {
  id?: string;
  inspection_id?: string;
  question_id: string;
  question_text?: string;
  category_name?: string;
  status: 'OK' | 'NO_OK' | 'NA';
  observations?: string;
}

export interface Finding {
  id: string;
  code: string;
  inspection_id: string;
  category: string;
  severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  description: string;
  evidence_id?: string;
  status: 'ABIERTO' | 'EN_TRATAMIENTO' | 'RESUELTO';
  responsible?: string;
  corrective_action?: string;
  created_at: string;
}

export type EvidenceSection = 
  | 'CONTENEDOR' 
  | 'CARGUE' 
  | 'PRODUCTO' 
  | 'VEHICULO' 
  | 'DANOS' 
  | 'DOCUMENTACION' 
  | 'OTRAS';

export interface Evidence {
  id: string;
  inspection_id: string;
  section: EvidenceSection;
  type: 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  description?: string;
  is_primary: number;
  rotation: number;
  uploaded_by?: string;
  created_at: string;
}

export interface Signature {
  id: string;
  inspection_id: string;
  signer_type: 'OPERATOR' | 'CONSULTANT' | 'CLIENT' | 'FACTORY';
  signer_name: string;
  signature_data: string;
  signed_at: string;
}

export interface TimelineEvent {
  id: string;
  inspection_id: string;
  previous_status?: string;
  new_status: string;
  changed_by?: string;
  user_name?: string;
  comment?: string;
  created_at: string;
}

export interface Report {
  id: string;
  inspection_id: string;
  inspection_code: string;
  report_code: string;
  pdf_path: string;
  version: number;
  company_name: string;
  overall_result: OverallResult;
  generated_by_name?: string;
  generated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  role?: string;
  action: string;
  ip_address?: string;
  affected_table?: string;
  record_id?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}
