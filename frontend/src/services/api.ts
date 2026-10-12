import type {
  HealthResponse,
  LoginResponse,
  UserResponse,
  AuthSetupStatus,
  StudentListResponse,
  StudentDetailResponse,
  StudentListQueryParams,
  StudentCreateParams,
  AIAssistantRequest,
  AIAssistantResponse,
  GenerateActionPlanResponse,
  UploadDatasetResponse,
  RecalculateScoresResponse,
} from '../types';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('edusuccess_api_url');
    if (custom) return custom.trim().replace(/\/$/, '');

    // In HTTPS environments (e.g. Firebase Hosting edus-1150d.web.app),
    // default to live HTTPS API endpoint to prevent browser Mixed Content blocks
    if (window.location.protocol === 'https:') {
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      if (envUrl && envUrl.startsWith('https://')) {
        return envUrl.replace(/\/$/, '');
      }
      return 'https://edusuccess-api.loca.lt';
    }
  }
  return (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('edusuccess_api_url', url.trim().replace(/\/$/, ''));
  }
}

export class ApiRequestError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('edusuccess_token') : null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Bypass-Tunnel-Reminder': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      // Essential for HttpOnly cookie session handling
      credentials: 'include',
    });

    // If 401 Unauthorized, attempt a silent token refresh once if refresh_token is available
    if (
      response.status === 401 &&
      !isRetry &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/setup-status') &&
      !endpoint.includes('/auth/refresh')
    ) {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('edusuccess_refresh_token') : null;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
            credentials: 'include',
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.access_token) {
              localStorage.setItem('edusuccess_token', refreshData.access_token);
              if (refreshData.refresh_token) {
                localStorage.setItem('edusuccess_refresh_token', refreshData.refresh_token);
              }
              // Retry original request with newly refreshed token
              return request<T>(endpoint, options, true);
            }
          }
        } catch {
          // Token refresh failed, continue to standard error handling
        }
      }
    }

    // Check if empty response (e.g. 204 or logout)
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      if (data && typeof data === 'object') {
        if ('detail' in data && typeof (data as { detail: unknown }).detail === 'string') {
          errorMessage = (data as { detail: string }).detail;
        } else if ('message' in data && typeof (data as { message: unknown }).message === 'string') {
          errorMessage = (data as { message: string }).message;
        }
      }
      throw new ApiRequestError(errorMessage, response.status, data?.detail);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiRequestError) {
      throw err;
    }
    // Network errors (e.g. backend server not running / connection refused)
    const networkMessage = err instanceof Error ? err.message : 'Unknown network error';
    throw new ApiRequestError(
      `Unable to reach backend server at ${baseUrl}. (${networkMessage})`,
      0
    );
  }
}

export const api = {
  // System Health
  async checkHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  // Authentication
  auth: {
    async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
      const res = await request<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (res.access_token) {
        localStorage.setItem('edusuccess_token', res.access_token);
      }
      if (res.refresh_token) {
        localStorage.setItem('edusuccess_refresh_token', res.refresh_token);
      }
      return res;
    },

    async register(data: { email: string; password: string; role?: string; department?: string }): Promise<UserResponse> {
      return request<UserResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async logout(): Promise<{ message: string }> {
      try {
        return await request<{ message: string }>('/api/v1/auth/logout', {
          method: 'POST',
        });
      } finally {
        localStorage.removeItem('edusuccess_token');
        localStorage.removeItem('edusuccess_refresh_token');
      }
    },

    async getMe(): Promise<UserResponse> {
      return request<UserResponse>('/api/v1/auth/me');
    },

    async refreshToken(): Promise<{ message: string; access_token?: string }> {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('edusuccess_refresh_token') : null;
      const res = await request<{ message: string; access_token?: string; refresh_token?: string }>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.access_token) {
        localStorage.setItem('edusuccess_token', res.access_token);
      }
      if (res.refresh_token) {
        localStorage.setItem('edusuccess_refresh_token', res.refresh_token);
      }
      return res;
    },

    async getSetupStatus(): Promise<AuthSetupStatus> {
      return request<AuthSetupStatus>('/api/v1/auth/setup-status');
    },
  },

  // Students
  students: {
    async list(params: StudentListQueryParams = {}): Promise<StudentListResponse> {
      const searchParams = new URLSearchParams();
      if (params.page !== undefined) searchParams.append('page', params.page.toString());
      if (params.per_page !== undefined) searchParams.append('per_page', params.per_page.toString());
      if (params.department) searchParams.append('department', params.department);
      if (params.year_of_study !== undefined) searchParams.append('year_of_study', params.year_of_study.toString());
      if (params.semester !== undefined) searchParams.append('semester', params.semester.toString());
      if (params.risk_segment) searchParams.append('risk_segment', params.risk_segment);
      if (params.search) searchParams.append('search', params.search);

      const qs = searchParams.toString();
      const endpoint = `/api/v1/students${qs ? `?${qs}` : ''}`;
      return request<StudentListResponse>(endpoint);
    },

    async getById(id: number): Promise<StudentDetailResponse> {
      return request<StudentDetailResponse>(`/api/v1/students/${id}`);
    },

    async getMyProfile(): Promise<StudentDetailResponse> {
      return request<StudentDetailResponse>('/api/v1/students/me');
    },

    async getMarks(studentId: number): Promise<{ success: boolean; data: any[] }> {
      return request<{ success: boolean; data: any[] }>(`/api/v1/students/${studentId}/marks`);
    },

    async addMarks(
      studentId: number,
      payload: {
        subject_code: string;
        subject_name: string;
        marks_obtained: number;
        max_marks?: number;
        semester?: number;
        academic_year?: string;
      }
    ): Promise<{ success: boolean; message: string; data: any }> {
      return request<{ success: boolean; message: string; data: any }>(`/api/v1/students/${studentId}/marks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async create(student: StudentCreateParams): Promise<StudentDetailResponse> {
      return request<StudentDetailResponse>('/api/v1/students', {
        method: 'POST',
        body: JSON.stringify(student),
      });
    },

    async update(id: number, payload: Partial<StudentCreateParams>): Promise<StudentDetailResponse> {
      return request<StudentDetailResponse>(`/api/v1/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    async delete(id: number): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>(`/api/v1/students/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Data Ingestion & Batch Seeding Engine
  data: {
    async upload(
      file: File,
      options?: {
        dimension?: string;
        semester?: number;
        academic_year?: string;
        auto_recompute?: boolean;
      }
    ): Promise<UploadDatasetResponse> {
      const formData = new FormData();
      formData.append('file', file);
      if (options?.dimension) formData.append('dimension', options.dimension);
      if (options?.semester !== undefined) formData.append('semester', options.semester.toString());
      if (options?.academic_year) formData.append('academic_year', options.academic_year);
      if (options?.auto_recompute !== undefined) formData.append('auto_recompute', options.auto_recompute.toString());

      return request<UploadDatasetResponse>('/api/v1/data/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async recalculateScores(params?: {
      semester?: number;
      academic_year?: string;
    }): Promise<RecalculateScoresResponse> {
      return request<RecalculateScoresResponse>('/api/v1/data/recalculate-scores', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });
    },

    async seedBenchmark(count: number = 50): Promise<{ success: boolean; message: string; records_created: number }> {
      const formData = new FormData();
      formData.append('count', String(count));
      return request<{ success: boolean; message: string; records_created: number }>('/api/v1/data/seed-benchmark', {
        method: 'POST',
        body: formData,
      });
    },

    async getCohortBreakdown(): Promise<import('../types').CohortBreakdownResponse> {
      return request<import('../types').CohortBreakdownResponse>('/api/v1/data/cohort-breakdown');
    },
  },

  // Gemini AI Assistant, RAG Recovery Advisor & 2026 Predictive Engines
  ai: {
    async ask(params: AIAssistantRequest): Promise<AIAssistantResponse> {
      return request<AIAssistantResponse>('/api/v1/ai/ask', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async generateActionPlan(
      studentId: string | number,
      options?: { save_as_intervention?: boolean; custom_notes?: string }
    ): Promise<GenerateActionPlanResponse> {
      return request<GenerateActionPlanResponse>(`/api/v1/ai/generate-action-plan/${studentId}`, {
        method: 'POST',
        body: JSON.stringify(options || { save_as_intervention: true }),
      });
    },

    async queryPolicies(query: string, topK: number = 3): Promise<import('../types').PolicyQueryResponse> {
      return request<import('../types').PolicyQueryResponse>('/api/v1/ai/policy-query', {
        method: 'POST',
        body: JSON.stringify({ query, top_k: topK }),
      });
    },

    async simulateTrajectory(
      params: import('../types').TrajectorySimulateRequest
    ): Promise<import('../types').TrajectorySimulateResponse> {
      return request<import('../types').TrajectorySimulateResponse>('/api/v1/ai/simulate-trajectory', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  },
};
