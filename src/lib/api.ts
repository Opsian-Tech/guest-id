import { getApiBaseUrl } from './storage';

export type VerifyAction = 'start' | 'log_consent' | 'upload_document' | 'verify_face';

export interface StartSessionRequest {
  action: 'start';
  guestName?: string;
  roomNumber?: string;
}

export interface LogConsentRequest {
  action: 'log_consent';
  session_token: string;
  consent_given: boolean;
  consent_time: string;
  consent_locale: string;
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

export type VerifyRequest = StartSessionRequest | LogConsentRequest | UploadDocumentRequest | VerifyFaceRequest;

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
    
    console.log(`[ApiService] ${options?.method || 'GET'} ${url}`);
    if (options?.body) {
      console.log('[ApiService] Request body:', options.body);
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log(`[ApiService] Response status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log('[ApiService] Response body (raw):', responseText);

    let data: T;
    try {
      data = JSON.parse(responseText);
      console.log('[ApiService] Response body (parsed):', data);
    } catch (parseError) {
      console.error('[ApiService] Failed to parse JSON response:', parseError);
      throw new Error(`Failed to parse response: ${responseText}`);
    }

    if (!response.ok) {
      const errorData = data as { error?: string; message?: string };
      throw new Error(errorData.error || errorData.message || `API request failed with status ${response.status}`);
    }

    return data;
  }

  async verify(data: VerifyRequest): Promise<VerifyResponse> {
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
