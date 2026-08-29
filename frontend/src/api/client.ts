import axios from 'axios';
import type {
  AuditLogEntry,
  BulkVerificationResult,
  Credential,
  Institution,
  MfaSetup,
  Role,
  ShareLink,
  User,
  VerificationResult
} from './types';

export const TOKEN_STORAGE_KEY = 'univerify.token';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const apiMessage = typeof data?.error === 'string' ? data.error : data?.error?.message ?? data?.message;
    return apiMessage ?? error.message;
  }
  return fallback;
}

export interface LoginResponse {
  token?: string;
  user?: User;
  mfaRequired?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role: Extract<Role, 'graduate' | 'university_admin'>;
  institutionId?: number;
}

export const authApi = {
  async login(email: string, password: string, mfaToken?: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password, mfaToken });
    return data;
  },
  async register(input: RegisterInput) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', input);
    return data;
  },
  async requestPasswordReset(email: string) {
    const { data } = await api.post<{ message: string }>('/auth/password/reset', { email });
    return data.message;
  },
  async resetPassword(token: string, password: string) {
    const { data } = await api.post<{ message: string }>(`/auth/password/reset/${token}`, {
      password,
      confirmPassword: password
    });
    return data.message;
  },
  async setupMFA() {
    const { data } = await api.post<MfaSetup>('/auth/mfa/setup');
    return data;
  },
  async verifyMFA(token: string) {
    const { data } = await api.post<{ message: string }>('/auth/mfa/verify', { token });
    return data.message;
  },
  async updateProfile(input: { fullName?: string; email?: string }) {
    const { data } = await api.put<{ user: User }>('/auth/me', input);
    return data.user;
  },
  async me() {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  }
};

export const verifyApi = {
  async byHash(hash: string) {
    const { data } = await api.get<VerificationResult>(`/verify/${hash}`);
    return data;
  },
  async byFile(file: File) {
    const form = new FormData();
    form.append('certificateFile', file);
    const { data } = await api.post<VerificationResult>('/verify/file', form);
    return data;
  },
  async bulk(files: File[]) {
    const form = new FormData();
    files.forEach((file) => form.append('certificateFiles', file));
    const { data } = await api.post<{ count: number; results: BulkVerificationResult[] }>('/verify/bulk', form);
    return data.results;
  },
  certificateUrl(hash: string) {
    return `${api.defaults.baseURL}/verify/${hash}/certificate`;
  }
};

export interface IssueCredentialInput {
  studentName: string;
  studentId: string;
  degree: string;
  graduationDate: string;
  program?: string;
  honors?: string;
}

export const adminApi = {
  async listCredentials(search?: string) {
    const { data } = await api.get<{ total: number; credentials: Credential[] }>('/admin/credentials', {
      params: search ? { search } : undefined
    });
    return data.credentials;
  },
  async issueCredential(input: IssueCredentialInput) {
    const { data } = await api.post<{ credential: Credential }>('/admin/credentials', input);
    return data.credential;
  },
  async revokeCredential(hash: string, reason: string) {
    const { data } = await api.post<{ credential: Credential }>(`/admin/credentials/${hash}/revoke`, { reason });
    return data.credential;
  },
  async listInstitutions() {
    const { data } = await api.get<{ institutions: Institution[] }>('/admin/institutions');
    return data.institutions;
  },
  async createInstitution(input: { name: string; registrationCode: string; contactEmail?: string }) {
    const { data } = await api.post<{ institution: Institution }>('/admin/institutions', input);
    return data.institution;
  },
  async listUsers() {
    const { data } = await api.get<{ users: User[] }>('/admin/users');
    return data.users;
  },
  async listAuditLogs(pageSize = 50) {
    const { data } = await api.get<{ logs: AuditLogEntry[] }>('/admin/audit-logs', { params: { pageSize } });
    return data.logs;
  }
};

export const graduateApi = {
  async listCredentials() {
    const { data } = await api.get<{ credentials: Credential[] }>('/graduate/credentials');
    return data.credentials;
  },
  async shareLink(hash: string) {
    const { data } = await api.get<ShareLink>(`/graduate/credentials/${hash}/share`);
    return data;
  }
};

export default api;
