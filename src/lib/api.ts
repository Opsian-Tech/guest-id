import { getApiBaseUrl } from './storage';

export type VerifyAction = 'start' | 'upload_document' | 'verify_face';

export interface StartSessionRequest {
  action: 'start';
  guestName: string;
  roomNumber: string;
}

export interface UploadDocumentRequest {
  action: 'upload_document';
  session_token: string;
  image_data: string;
}

export interface VerifyFaceRequest {
  action: 'verify_face';
  session_token: string;
  image_data: string;
}

export interface VerifyResponse {
  success: boolean;
  session_token?: string;
  verify_url?: string;
  message?: string;
  error?: string;
  data?: {
    liveness_score?: number;
    face_match_score?: number;
    verification_score?: number;
    is_verified?: boolean;
    extracted_text?: string;
  };
}

export interface AdminStats {
  totalVerifications: number;
  successfulVerifications: number;
  successRate: number;
  totalCost: number;
}

export interface Session {
  id: string;
  guest_name: string;
  room_number: string;
  is_verified: boolean;
  verification_score: number;
  created_at: string;
}

class ApiService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || error.message || 'API request failed');
    }

    return response.json();
  }

  async verify(data: StartSessionRequest | UploadDocumentRequest | VerifyFaceRequest): Promise<VerifyResponse> {
    return this.fetchApi<VerifyResponse>('/api/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminStats(): Promise<AdminStats> {
    return this.fetchApi<AdminStats>('/api/admin/stats');
  }

  async getAdminSessions(): Promise<Session[]> {
    return this.fetchApi<Session[]>('/api/admin/sessions');
  }
}

export const api = new ApiService();
