export type UserRole = 'ADMIN' | 'FACULTY' | 'COUNSELOR' | 'STUDENT';

export interface UserResponse {
  id: number;
  email: string;
  role: UserRole;
  department: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  message: string;
  user: UserResponse;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
}

export interface AuthSetupStatus {
  needs_bootstrap: boolean;
  admin_exists: boolean;
  total_users: number;
}

export type RiskSegment = 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'CRITICAL' | 'HIGH_PERFORMER' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK' | 'NO_DATA' | string;

export interface StudentSummary {
  id: number;
  student_id_str: string;
  full_name: string;
  department: string;
  program: string;
  year_of_study: number;
  current_semester: number;
  is_active: boolean;
  total_score: number | null;
  risk_segment: RiskSegment | null;
  data_completeness_pct: number | null;
}

export interface StudentDetail extends StudentSummary {
  email: string;
  phone: string | null;
  enrollment_date: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface StudentListResponse {
  success: boolean;
  data: StudentSummary[];
  meta: PaginationMeta;
}

export interface StudentDetailResponse {
  success: boolean;
  data: StudentDetail;
  message?: string;
}

export interface StudentCreateParams {
  student_id_str: string;
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  program: string;
  year_of_study: number;
  current_semester: number;
  enrollment_date: string; // YYYY-MM-DD
}

export interface StudentListQueryParams {
  page?: number;
  per_page?: number;
  department?: string;
  year_of_study?: number;
  semester?: number;
  risk_segment?: string;
  search?: string;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string | Record<string, unknown> | Array<unknown>;
}

export interface AIAssistantRequest {
  message: string;
  context_topic?: string;
}

export interface AIAssistantResponse {
  success: boolean;
  answer: string;
  model: string;
  context_topic?: string | null;
}

export interface PolicyMatchItem {
  doc_id: string;
  title: string;
  category: string;
  location: string;
  schedule: string;
  contact_lead: string;
}

export interface GenerateActionPlanResponse {
  success: boolean;
  student_id: number;
  student_id_str: string;
  student_name: string;
  risk_segment: string;
  composite_score: number | null;
  deficiencies: {
    attendance_pct: number;
    failing_subjects: Array<{
      code: string;
      name: string;
      marks?: number;
      max_marks?: number;
      percentage: number;
      grade: string;
    }>;
    lms_completion_pct: number;
    active_flags: string[];
  };
  retrieved_policies: PolicyMatchItem[];
  action_plan_markdown: string;
  intervention_id?: number | null;
  generated_at: string;
  model_used?: string | null;
}

export interface UploadDatasetResponse {
  success: boolean;
  message: string;
  detected_format: string;
  detected_dimension: string;
  inserted_records: number;
  superseded_records: number;
  skipped_records: number;
  total_records_in_payload: number;
  scores_recalculated: number;
  upload_batch_id: number;
  errors: string[];
}

export interface RecalculateScoresResponse {
  success: boolean;
  message: string;
  scores_computed: number;
  details: Array<{
    student_id: number;
    student_id_str: string;
    score: number | null;
    risk_segment: string;
  }>;
}

export interface PolicyDocumentDetail {
  doc_id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  contact_lead: string;
  location: string;
  schedule: string;
  relevance_score: number;
}

export interface PolicyQueryResponse {
  success: boolean;
  query: string;
  answer: string;
  policies: PolicyDocumentDetail[];
  model_used: string;
}

export interface TrajectorySimulateRequest {
  student_id_str?: string;
  current_attendance: number;
  current_academics: number;
  current_lms_logins: number;
  simulated_attendance: number;
  simulated_academics: number;
  simulated_lms_logins: number;
  simulated_assignments_pct: number;
}

export interface TrajectorySimulateResponse {
  success: boolean;
  current_score: number;
  current_risk: string;
  projected_score: number;
  projected_risk: string;
  delta_score: number;
  risk_transition: string;
  trajectory_insights: string[];
  recovery_milestones: string[];
  urgency_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DepartmentHealth {
  department: string;
  total_students: number;
  avg_score: number;
  at_risk_count: number;
  at_risk_pct: number;
  critical_count: number;
  high_risk_count: number;
  safe_count: number;
  health_status: 'Optimal' | 'Warning' | 'Critical';
}

export interface CohortBreakdownResponse {
  success: boolean;
  total_cohort_count: number;
  departments: DepartmentHealth[];
}

export type ActiveTab =
  | 'dashboard'
  | 'students'
  | 'analytics'
  | 'interventions'
  | 'ai-assistant'
  | 'simulator'
  | 'policy-copilot'
  | 'settings';
