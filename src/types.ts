export enum Role {
  Admin = "Admin",
  AssetManager = "AssetManager",
  DepartmentHead = "DepartmentHead",
  Employee = "Employee",
}

export enum UserStatus {
  Active = "Active",
  Inactive = "Inactive",
  OnLeave = "OnLeave",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string | null;
  status: UserStatus;
  avatar: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  headId: string | null; // User ID of department head
  parentId: string | null; // For hierarchy
  status: "Active" | "Inactive";
  createdAt: string;
}

export enum AssetCategory {
  Laptop = "Laptop",
  Monitor = "Monitor",
  Server = "Server",
  Mobile = "Mobile",
  Vehicle = "Vehicle",
  MeetingRoom = "MeetingRoom",
  Desk = "Desk",
  Other = "Other"
}

export enum AssetCondition {
  New = "New",
  Excellent = "Excellent",
  Good = "Good",
  Fair = "Fair",
  Poor = "Poor",
  Broken = "Broken",
}

export enum AssetStatus {
  Available = "Available",
  Allocated = "Allocated",
  Reserved = "Reserved",
  UnderMaintenance = "UnderMaintenance",
  Lost = "Lost",
  Retired = "Retired",
  Disposed = "Disposed",
}

export interface AssetHistoryEntry {
  id: string;
  action: string;
  performedBy: string;
  date: string;
  details: string;
}

export interface Asset {
  id: string;
  tag: string; // Dynamic e.g. AST-001
  name: string;
  serialNumber: string;
  category: AssetCategory;
  purchaseDate: string;
  purchaseCost: number;
  warrantyMonths: number;
  condition: AssetCondition;
  location: string;
  status: AssetStatus;
  isBookable: boolean;
  departmentId: string | null;
  currentHolderId: string | null;
  qrCodeUrl: string; // Simulated base64 or custom code
  customFields?: Record<string, string>;
  history: AssetHistoryEntry[];
}

export interface Booking {
  id: string;
  assetId: string;
  assetName: string;
  assetCategory: AssetCategory;
  userId: string;
  userName: string;
  title: string;
  start: string;
  end: string;
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
  createdAt: string;
}

export interface Transfer {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  requestedById: string;
  requestedByName: string;
  sourceDepartmentId: string | null;
  targetDepartmentId: string;
  targetHolderId: string | null;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  approvedById?: string;
  approvedByName?: string;
  comments?: string;
}

export interface Maintenance {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  reportedById: string;
  reportedByName: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Approved" | "In-Progress" | "Resolved" | "Rejected";
  createdAt: string;
  technicianName?: string;
  resolvedDate?: string;
  photoUrl?: string;
}

export interface AuditItem {
  assetId: string;
  assetTag: string;
  assetName: string;
  category: string;
  expectedHolderName: string;
  verified: boolean;
  actualHolderId: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string;
}

export interface AuditCycle {
  id: string;
  title: string;
  auditorId: string;
  auditorName: string;
  departmentId: string | null; // Null means all departments
  location: string | null; // Null means all locations
  startDate: string;
  endDate: string;
  status: "Draft" | "In-Progress" | "Completed";
  items: AuditItem[];
  discrepancyReport?: string; // AI generated
  closedDate?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}
