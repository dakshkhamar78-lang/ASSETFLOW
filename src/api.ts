import { User, Department, Asset, Booking, Transfer, Maintenance, AuditCycle, Notification, ActivityLog } from "./types";

const API_BASE = "/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("assetflow_token");
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("assetflow_token", token);
  } else {
    localStorage.removeItem("assetflow_token");
  }
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem("assetflow_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem("assetflow_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("assetflow_user");
  }
}

async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: any
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Exported API utilities
export const api = {
  // Auth
  signup: (body: any) => apiRequest<{ token: string; user: User }>("/auth/signup", "POST", body),
  login: (body: any) => apiRequest<{ token: string; user: User }>("/auth/login", "POST", body),
  getMe: () => apiRequest<User>("/auth/me", "GET"),
  updateProfile: (body: { name?: string; avatar?: string }) => apiRequest<User>("/auth/profile", "PUT", body),
  promoteUserRole: (userId: string, role: string) => apiRequest<User>(`/users/${userId}/role`, "PATCH", { role }),

  // Directory
  getUsers: () => apiRequest<User[]>("/users"),
  getDepartments: () => apiRequest<Department[]>("/departments"),
  createDepartment: (body: any) => apiRequest<Department>("/departments", "POST", body),

  // Assets
  getAssets: () => apiRequest<Asset[]>("/assets"),
  createAsset: (body: any) => apiRequest<Asset>("/assets", "POST", body),
  updateAsset: (id: string, body: any) => apiRequest<Asset>(`/assets/${id}`, "PUT", body),
  deleteAsset: (id: string) => apiRequest<{ success: boolean }>(`/assets/${id}`, "DELETE"),
  allocateAsset: (id: string, body: any) => apiRequest<Asset>(`/assets/${id}/allocate`, "POST", body),
  bulkAllocateAssets: (body: any) => apiRequest<{ success: boolean; count: number }>("/assets/bulk-allocate", "POST", body),
  returnAsset: (id: string, body: any) => apiRequest<Asset>(`/assets/${id}/return`, "POST", body),

  // Transfers
  getTransfers: () => apiRequest<Transfer[]>("/transfers"),
  createTransfer: (body: any) => apiRequest<Transfer>("/transfers", "POST", body),
  approveTransfer: (id: string) => apiRequest<Transfer>(`/transfers/${id}/approve`, "POST"),
  rejectTransfer: (id: string, comments?: string) => apiRequest<Transfer>(`/transfers/${id}/reject`, "POST", { comments }),

  // Bookings / Scheduling
  getBookings: () => apiRequest<Booking[]>("/bookings"),
  createBooking: (body: any) => apiRequest<Booking>("/bookings", "POST", body),
  cancelBooking: (id: string) => apiRequest<Booking>(`/bookings/${id}/cancel`, "POST"),
  deleteBooking: (id: string) => apiRequest<{ success: boolean }>(`/bookings/${id}`, "DELETE"),

  // Maintenance
  getMaintenances: () => apiRequest<Maintenance[]>("/maintenances"),
  createMaintenance: (body: any) => apiRequest<Maintenance>("/maintenances", "POST", body),
  approveMaintenance: (id: string, technicianName?: string) => apiRequest<Maintenance>(`/maintenances/${id}/approve`, "POST", { technicianName }),
  resolveMaintenance: (id: string) => apiRequest<Maintenance>(`/maintenances/${id}/resolve`, "POST"),

  // Audits
  getAudits: () => apiRequest<AuditCycle[]>("/audits"),
  createAudit: (body: any) => apiRequest<AuditCycle>("/audits", "POST", body),
  startAudit: (id: string) => apiRequest<AuditCycle>(`/audits/${id}/start`, "POST"),
  updateAuditItem: (id: string, body: any) => apiRequest<AuditCycle>(`/audits/${id}/items`, "PATCH", body),
  closeAudit: (id: string) => apiRequest<AuditCycle>(`/audits/${id}/close`, "POST"),

  // Notifications
  getNotifications: () => apiRequest<Notification[]>("/notifications"),
  readAllNotifications: () => apiRequest<{ success: boolean }>("/notifications/read-all", "POST"),
  approveBooking: (id: string) => apiRequest<Booking>(`/bookings/${id}/approve`, "POST"),
  rejectBooking: (id: string) => apiRequest<Booking>(`/bookings/${id}/reject`, "POST"),

  // Admin CRUD for Employees
  addEmployee: (body: any) => apiRequest<User>("/users", "POST", body),
  updateEmployee: (id: string, body: any) => apiRequest<User>(`/users/${id}`, "PUT", body),
  deleteEmployee: (id: string) => apiRequest<{ success: boolean }>(`/users/${id}`, "DELETE"),

  // Admin System Settings
  getSystemSettings: () => apiRequest<any>("/settings"),
  saveSystemSettings: (body: any) => apiRequest<any>("/settings", "POST", body),

  // Logs
  getLogs: () => apiRequest<ActivityLog[]>("/logs"),

  // Dashboard KPIs
  getDashboardKpis: () => apiRequest<{
    assetsAvailable: number;
    activeBookings: number;
    maintenanceToday: number;
    pendingTransfers: number;
  }>("/dashboard/kpis"),

  // Search
  globalSearch: (q: string) => apiRequest<{ departments: Department[]; users: User[]; assets: Asset[]; bookings: Booking[] }>(`/search?q=${encodeURIComponent(q)}`),

  // Gemini AI Features
  getAiRetirement: (assetId: string) => apiRequest<{
    predictedRetirementDate: string;
    remainingLifespanMonths: number;
    riskScore: number;
    riskAnalysis: string;
    recommendedAction: string;
    estimatedSalvageValue: number;
  }>("/gemini/retirement", "POST", { assetId }),

  getAiAuditReport: (auditId: string) => apiRequest<{ report: string }>("/gemini/audit-report", "POST", { auditId }),
};
