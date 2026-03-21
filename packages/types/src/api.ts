// Standard API response envelope
export interface ApiResponse<T> {
  data: T
  meta?: {
    cursor?: string
    hasMore?: boolean
    total?: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

// Pagination
export interface PaginationQuery {
  after?: string
  limit?: number
}

// Sync status
export interface SyncStatus {
  deviceId: string
  deviceType: string
  lastSyncedAt: string | null
  status: 'idle' | 'syncing' | 'error'
  errorMessage: string | null
}

// Auth
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  displayName: string
}
