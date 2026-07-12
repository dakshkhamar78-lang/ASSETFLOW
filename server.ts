import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  Role,
  User,
  Department,
  Asset,
  Booking,
  Transfer,
  Maintenance,
  AuditCycle,
  Notification,
  ActivityLog,
  AssetCategory,
  AssetCondition,
  AssetStatus,
  UserStatus
} from "./src/types";
import { getMaintenanceImage } from "./src/maintenanceImages";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "database.json");

// Helper to encrypt passwords using Node's native crypto (zero dependencies)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "assetflow-salt").digest("hex");
}

// Generate secure JWT-like tokens using Node native crypto
function generateToken(user: User): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    departmentId: user.departmentId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", "assetflow-super-secret-key")
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

// Verify token
function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", "assetflow-super-secret-key")
      .update(`${header}.${payload}`)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) return null; // Expired
    return decodedPayload;
  } catch (e) {
    return null;
  }
}

// Middleware for authentication
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No token provided." });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
  
  // Resolve latest user details and roles dynamically from the database
  const db = loadDatabase();
  const dbUser = db.users.find((u: any) => u.id === decoded.id || u.email.toLowerCase() === decoded.email.toLowerCase());
  
  req.user = {
    ...decoded,
    role: dbUser ? dbUser.role : decoded.role,
    name: dbUser ? dbUser.name : decoded.name,
    departmentId: dbUser ? dbUser.departmentId : decoded.departmentId
  };
  
  next();
};

// Database Schema interface
interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> hashed_password
  departments: Department[];
  assets: Asset[];
  bookings: Booking[];
  transfers: Transfer[];
  maintenances: Maintenance[];
  auditCycles: AuditCycle[];
  notifications: Notification[];
  logs: ActivityLog[];
  settings?: any;
}

// Get or seed initial database state
function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      if (!db.assets || db.assets.length < 40) {
        throw new Error("Seeded asset count too small. Forcing re-seed.");
      }
      return db;
    } catch (e) {
      console.error("Failed to parse database.json or count too small, re-seeding.", e);
    }
  }

  // Initial Seeding
  const db: DatabaseSchema = {
    users: [],
    passwords: {},
    departments: [],
    assets: [],
    bookings: [],
    transfers: [],
    maintenances: [],
    auditCycles: [],
    notifications: [],
    logs: []
  };

  // 1. Seed Departments
  const deptEngineering: Department = {
    id: "dept-eng",
    name: "Engineering",
    headId: "user-head",
    parentId: null,
    status: "Active",
    createdAt: "2026-01-10T08:00:00Z"
  };
  const deptMarketing: Department = {
    id: "dept-mkt",
    name: "Marketing",
    headId: "user-head-mkt",
    parentId: null,
    status: "Active",
    createdAt: "2026-01-12T09:00:00Z"
  };
  const deptOperations: Department = {
    id: "dept-ops",
    name: "Operations",
    headId: "user-manager",
    parentId: null,
    status: "Active",
    createdAt: "2026-01-01T08:00:00Z"
  };
  const deptFinance: Department = {
    id: "dept-fin",
    name: "Finance",
    headId: null,
    parentId: null,
    status: "Active",
    createdAt: "2026-01-15T10:00:00Z"
  };
  const deptHR: Department = {
    id: "dept-hr",
    name: "HR",
    headId: null,
    parentId: null,
    status: "Active",
    createdAt: "2026-01-15T10:00:00Z"
  };
  db.departments = [deptEngineering, deptMarketing, deptOperations, deptFinance, deptHR];

  // 2. Seed Users
  const adminUser: User = {
    id: "user-admin",
    email: "admin@assetflow.com",
    name: "Alex Mercer",
    role: Role.Admin,
    departmentId: "dept-ops",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-01-01T08:00:00Z"
  };
  const managerUser: User = {
    id: "user-manager",
    email: "manager@assetflow.com",
    name: "Elena Rostova",
    role: Role.AssetManager,
    departmentId: "dept-ops",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-01-02T08:00:00Z"
  };
  const headUser: User = {
    id: "user-head",
    email: "head@assetflow.com",
    name: "Sarah Chen",
    role: Role.DepartmentHead,
    departmentId: "dept-eng",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-01-10T08:00:00Z"
  };
  const headUserMkt: User = {
    id: "user-head-mkt",
    email: "mkthead@assetflow.com",
    name: "Marcus Brody",
    role: Role.DepartmentHead,
    departmentId: "dept-mkt",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-01-12T09:00:00Z"
  };
  const employeeUser: User = {
    id: "user-employee",
    email: "employee@assetflow.com",
    name: "John Doe",
    role: Role.Employee,
    departmentId: "dept-eng",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-01-11T08:00:00Z"
  };
  const employeeUser2: User = {
    id: "user-employee2",
    email: "jane@assetflow.com",
    name: "Jane Smith",
    role: Role.Employee,
    departmentId: "dept-mkt",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-02-15T08:00:00Z"
  };
  const employeeUser3: User = {
    id: "user-employee3",
    email: "bob@assetflow.com",
    name: "Bob Wilson",
    role: Role.Employee,
    departmentId: "dept-ops",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-03-01T08:00:00Z"
  };
  const employeeUser4: User = {
    id: "user-employee4",
    email: "alice@assetflow.com",
    name: "Alice Brown",
    role: Role.Employee,
    departmentId: "dept-fin",
    status: UserStatus.Active,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-03-15T08:00:00Z"
  };

  db.users = [adminUser, managerUser, headUser, headUserMkt, employeeUser, employeeUser2, employeeUser3, employeeUser4];
  
  db.passwords[adminUser.id] = hashPassword("password");
  db.passwords[managerUser.id] = hashPassword("password");
  db.passwords[headUser.id] = hashPassword("password");
  db.passwords[headUserMkt.id] = hashPassword("password");
  db.passwords[employeeUser.id] = hashPassword("password");
  db.passwords[employeeUser2.id] = hashPassword("password");
  db.passwords[employeeUser3.id] = hashPassword("password");
  db.passwords[employeeUser4.id] = hashPassword("password");

  // 3. Seed Assets (40+ assets)
  const assets: Asset[] = [
    {
      id: "ast-101",
      tag: "AST-2026-001",
      name: "MacBook Pro M3 Max 16\"",
      serialNumber: "C02F83KJQ05D",
      category: AssetCategory.Laptop,
      purchaseDate: "2026-01-15",
      purchaseCost: 3499,
      warrantyMonths: 36,
      condition: AssetCondition.New,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-001",
      history: [
        {
          id: "hist-1",
          action: "Asset Registered",
          performedBy: "Elena Rostova",
          date: "2026-01-15T10:00:00Z",
          details: "Registered brand new MacBook Pro into system."
        }
      ]
    },
    {
      id: "ast-102",
      tag: "AST-2026-002",
      name: "ThinkPad X1 Carbon Gen 11",
      serialNumber: "PF3J82AL",
      category: AssetCategory.Laptop,
      purchaseDate: "2026-02-01",
      purchaseCost: 1899,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-002",
      history: [
        {
          id: "hist-3",
          action: "Asset Registered",
          performedBy: "Elena Rostova",
          date: "2026-02-01T09:00:00Z",
          details: "Registered ThinkPad into inventory."
        }
      ]
    },
    {
      id: "ast-103",
      tag: "AST-2026-003",
      name: "Tesla Model 3 (Fleet #4)",
      serialNumber: "5YJ3E1EA8NF",
      category: AssetCategory.Vehicle,
      purchaseDate: "2025-05-10",
      purchaseCost: 42000,
      warrantyMonths: 48,
      condition: AssetCondition.Good,
      location: "Sub-Level Garage (Bay 12)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-003",
      history: [
        {
          id: "hist-4",
          action: "Asset Registered",
          performedBy: "System",
          date: "2025-05-10T14:00:00Z",
          details: "Fleet Vehicle registered to Operations."
        }
      ]
    },
    {
      id: "ast-104",
      tag: "AST-2026-004",
      name: "Conference Room 'Omega' (12 Pax)",
      serialNumber: "ROOM-OMEGA-SF",
      category: AssetCategory.MeetingRoom,
      purchaseDate: "2024-01-01",
      purchaseCost: 15000,
      warrantyMonths: 120,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 5th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-004",
      history: [
        {
          id: "hist-5",
          action: "Asset Registered",
          performedBy: "Alex Mercer",
          date: "2024-01-01T08:00:00Z",
          details: "Omega Meeting Room set up."
        }
      ]
    },
    {
      id: "ast-105",
      tag: "AST-2026-005",
      name: "Dell UltraSharp 32\" 4K Monitor",
      serialNumber: "MX-09K82L",
      category: AssetCategory.Monitor,
      purchaseDate: "2026-03-01",
      purchaseCost: 899,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 2nd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-005",
      history: [
        {
          id: "hist-6",
          action: "Asset Registered",
          performedBy: "Elena Rostova",
          date: "2026-03-01T15:00:00Z",
          details: "Registered Dell 4K display."
        }
      ]
    },
    {
      id: "ast-106",
      tag: "AST-2026-006",
      name: "iPhone 15 Pro Max 256GB",
      serialNumber: "DNQX82LKP",
      category: AssetCategory.Mobile,
      purchaseDate: "2025-10-12",
      purchaseCost: 1199,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "Secure Storage Locker C",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-006",
      history: [
        {
          id: "hist-8",
          action: "Asset Registered",
          performedBy: "Elena Rostova",
          date: "2025-10-12T11:00:00Z",
          details: "Registered mobile device."
        }
      ]
    },
    {
      id: "ast-107",
      tag: "AST-2026-007",
      name: "MacBook Air M3 13\"",
      serialNumber: "C02G23LKQ05E",
      category: AssetCategory.Laptop,
      purchaseDate: "2026-02-10",
      purchaseCost: 1299,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-007",
      history: [{ id: "h-7", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-02-10T10:00:00Z", details: "Registered brand new MacBook Air." }]
    },
    {
      id: "ast-108",
      tag: "AST-2026-008",
      name: "Dell Latitude 7440",
      serialNumber: "DL-93K821L",
      category: AssetCategory.Laptop,
      purchaseDate: "2025-11-05",
      purchaseCost: 1450,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 2nd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-fin",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-008",
      history: [{ id: "h-8", action: "Asset Registered", performedBy: "Elena Rostova", date: "2025-11-05T11:00:00Z", details: "Registered Dell Latitude." }]
    },
    {
      id: "ast-109",
      tag: "AST-2026-009",
      name: "HP EliteBook 840 G10",
      serialNumber: "HP-CNU3921",
      category: AssetCategory.Laptop,
      purchaseDate: "2025-09-18",
      purchaseCost: 1550,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 2nd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-009",
      history: [{ id: "h-9", action: "Asset Registered", performedBy: "Elena Rostova", date: "2025-09-18T10:00:00Z", details: "Registered HP EliteBook." }]
    },
    {
      id: "ast-110",
      tag: "AST-2026-010",
      name: "Surface Laptop 5",
      serialNumber: "SF-0092182K",
      category: AssetCategory.Laptop,
      purchaseDate: "2025-08-20",
      purchaseCost: 1399,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-010",
      history: [{ id: "h-10", action: "Asset Registered", performedBy: "Elena Rostova", date: "2025-08-20T14:00:00Z", details: "Registered Surface Laptop." }]
    },
    {
      id: "ast-111",
      tag: "AST-2026-011",
      name: "ASUS Zenbook S 13 OLED",
      serialNumber: "AS-ZM8219K",
      category: AssetCategory.Laptop,
      purchaseDate: "2026-01-20",
      purchaseCost: 1499,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-011",
      history: [{ id: "h-11", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-01-20T10:00:00Z", details: "Registered ASUS Zenbook." }]
    },
    {
      id: "ast-112",
      tag: "AST-2026-012",
      name: "iPhone 16 Pro Slate 256GB",
      serialNumber: "AP-IP16P-921",
      category: AssetCategory.Mobile,
      purchaseDate: "2026-03-12",
      purchaseCost: 1099,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "Secure Storage Locker C",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-012",
      history: [{ id: "h-12", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-03-12T09:30:00Z", details: "Registered iPhone 16 Pro." }]
    },
    {
      id: "ast-113",
      tag: "AST-2026-013",
      name: "Samsung Galaxy S25 Ultra",
      serialNumber: "SM-S25U-921K",
      category: AssetCategory.Mobile,
      purchaseDate: "2026-02-15",
      purchaseCost: 1299,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "Secure Storage Locker C",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-013",
      history: [{ id: "h-13", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-02-15T11:00:00Z", details: "Registered Samsung Galaxy S25 Ultra." }]
    },
    {
      id: "ast-114",
      tag: "AST-2026-014",
      name: "Google Pixel 9 Pro 128GB",
      serialNumber: "GP-PX9P-821L",
      category: AssetCategory.Mobile,
      purchaseDate: "2025-12-05",
      purchaseCost: 999,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "Secure Storage Locker C",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-014",
      history: [{ id: "h-14", action: "Asset Registered", performedBy: "Elena Rostova", date: "2025-12-05T14:20:00Z", details: "Registered Google Pixel 9 Pro." }]
    },
    {
      id: "ast-115",
      tag: "AST-2026-015",
      name: "Conference Room 'Orion' (8 Pax)",
      serialNumber: "ROOM-ORION-SF",
      category: AssetCategory.MeetingRoom,
      purchaseDate: "2024-01-01",
      purchaseCost: 10000,
      warrantyMonths: 120,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 5th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-015",
      history: [{ id: "h-15", action: "Asset Registered", performedBy: "System", date: "2024-01-01T08:00:00Z", details: "Orion Room set up." }]
    },
    {
      id: "ast-116",
      tag: "AST-2026-016",
      name: "Conference Room 'Venus' (6 Pax)",
      serialNumber: "ROOM-VENUS-SF",
      category: AssetCategory.MeetingRoom,
      purchaseDate: "2024-01-01",
      purchaseCost: 8000,
      warrantyMonths: 120,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 1st Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-016",
      history: [{ id: "h-16", action: "Asset Registered", performedBy: "System", date: "2024-01-01T08:00:00Z", details: "Venus Room set up." }]
    },
    {
      id: "ast-117",
      tag: "AST-2026-017",
      name: "Conference Room 'Mercury' (4 Pax)",
      serialNumber: "ROOM-MERCURY-SF",
      category: AssetCategory.MeetingRoom,
      purchaseDate: "2024-01-01",
      purchaseCost: 5000,
      warrantyMonths: 120,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 1st Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-017",
      history: [{ id: "h-17", action: "Asset Registered", performedBy: "System", date: "2024-01-01T08:00:00Z", details: "Mercury Room set up." }]
    },
    {
      id: "ast-118",
      tag: "AST-2026-018",
      name: "Conference Room 'Neptune' (10 Pax)",
      serialNumber: "ROOM-NEPTUNE-SF",
      category: AssetCategory.MeetingRoom,
      purchaseDate: "2024-01-01",
      purchaseCost: 12000,
      warrantyMonths: 120,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 2nd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-018",
      history: [{ id: "h-18", action: "Asset Registered", performedBy: "System", date: "2024-01-01T08:00:00Z", details: "Neptune Room set up." }]
    },
    {
      id: "ast-119",
      tag: "AST-2026-019",
      name: "Conference Room 'Jupiter' (16 Pax)",
      serialNumber: "ROOM-JUPITER-SF",
      category: AssetCategory.MeetingRoom,
      purchaseDate: "2024-01-01",
      purchaseCost: 18000,
      warrantyMonths: 120,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-019",
      history: [{ id: "h-19", action: "Asset Registered", performedBy: "System", date: "2024-01-01T08:00:00Z", details: "Jupiter Room set up." }]
    },
    {
      id: "ast-120",
      tag: "AST-2026-020",
      name: "Tesla Model Y (Fleet #5)",
      serialNumber: "5YJ3E1EA9NF",
      category: AssetCategory.Vehicle,
      purchaseDate: "2025-06-15",
      purchaseCost: 46000,
      warrantyMonths: 48,
      condition: AssetCondition.Excellent,
      location: "Sub-Level Garage (Bay 13)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-020",
      history: [{ id: "h-20", action: "Asset Registered", performedBy: "System", date: "2025-06-15T10:00:00Z", details: "Tesla Model Y registered." }]
    },
    {
      id: "ast-121",
      tag: "AST-2026-021",
      name: "Toyota Innova HyCross",
      serialNumber: "TY-IN821-LK9",
      category: AssetCategory.Vehicle,
      purchaseDate: "2025-07-20",
      purchaseCost: 35000,
      warrantyMonths: 36,
      condition: AssetCondition.Good,
      location: "Sub-Level Garage (Bay 14)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-021",
      history: [{ id: "h-21", action: "Asset Registered", performedBy: "System", date: "2025-07-20T11:00:00Z", details: "Toyota Innova added." }]
    },
    {
      id: "ast-122",
      tag: "AST-2026-022",
      name: "Mahindra XUV700 AX7",
      serialNumber: "MH-XU700-LM2",
      category: AssetCategory.Vehicle,
      purchaseDate: "2025-08-11",
      purchaseCost: 28000,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "Sub-Level Garage (Bay 15)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-022",
      history: [{ id: "h-22", action: "Asset Registered", performedBy: "System", date: "2025-08-11T14:30:00Z", details: "Mahindra XUV700 registered." }]
    },
    {
      id: "ast-123",
      tag: "AST-2026-023",
      name: "Hyundai Creta SX(O)",
      serialNumber: "HY-CR892-L1A",
      category: AssetCategory.Vehicle,
      purchaseDate: "2025-09-01",
      purchaseCost: 22000,
      warrantyMonths: 36,
      condition: AssetCondition.Good,
      location: "Sub-Level Garage (Bay 16)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-023",
      history: [{ id: "h-23", action: "Asset Registered", performedBy: "System", date: "2025-09-01T15:00:00Z", details: "Hyundai Creta added." }]
    },
    {
      id: "ast-124",
      tag: "AST-2026-024",
      name: "LG UltraFine 5K Display 27\"",
      serialNumber: "LG-5K-UF921K",
      category: AssetCategory.Monitor,
      purchaseDate: "2025-10-15",
      purchaseCost: 1299,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-024",
      history: [{ id: "h-24", action: "Asset Registered", performedBy: "Elena Rostova", date: "2025-10-15T11:00:00Z", details: "Registered LG 5K Display." }]
    },
    {
      id: "ast-125",
      tag: "AST-2026-025",
      name: "Samsung ViewFinity S9 5K",
      serialNumber: "SM-S9-VF8219",
      category: AssetCategory.Monitor,
      purchaseDate: "2025-12-01",
      purchaseCost: 1599,
      warrantyMonths: 36,
      condition: AssetCondition.Good,
      location: "San Francisco Office - 2nd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-fin",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-025",
      history: [{ id: "h-25", action: "Asset Registered", performedBy: "Elena Rostova", date: "2025-12-01T09:00:00Z", details: "Registered Samsung ViewFinity S9." }]
    },
    {
      id: "ast-126",
      tag: "AST-2026-026",
      name: "Sony A7IV Mirrorless Camera",
      serialNumber: "SY-A74-91823K",
      category: AssetCategory.Other,
      purchaseDate: "2025-08-15",
      purchaseCost: 2499,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "Studio A Equipment Closet",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-026",
      history: [{ id: "h-26", action: "Asset Registered", performedBy: "Marcus Brody", date: "2025-08-15T10:00:00Z", details: "Registered Sony A7IV Camera." }]
    },
    {
      id: "ast-127",
      tag: "AST-2026-027",
      name: "Canon EOS R6 Mark II",
      serialNumber: "CN-R6M2-8219K",
      category: AssetCategory.Other,
      purchaseDate: "2025-09-10",
      purchaseCost: 2499,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "Studio A Equipment Closet",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-027",
      history: [{ id: "h-27", action: "Asset Registered", performedBy: "Marcus Brody", date: "2025-09-10T11:00:00Z", details: "Registered Canon EOS R6." }]
    },
    {
      id: "ast-128",
      tag: "AST-2026-028",
      name: "DJI Pocket 3 Creator Combo",
      serialNumber: "DJ-PK3-1928K",
      category: AssetCategory.Other,
      purchaseDate: "2026-01-05",
      purchaseCost: 650,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "Studio A Equipment Closet",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-028",
      history: [{ id: "h-28", action: "Asset Registered", performedBy: "Marcus Brody", date: "2026-01-05T15:00:00Z", details: "Registered DJI Pocket 3." }]
    },
    {
      id: "ast-129",
      tag: "AST-2026-029",
      name: "HP LaserJet Pro Enterprise",
      serialNumber: "HP-LJ-ENT-8291K",
      category: AssetCategory.Other,
      purchaseDate: "2025-04-20",
      purchaseCost: 1100,
      warrantyMonths: 36,
      condition: AssetCondition.Good,
      location: "SF Office - Copy Room 3A",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-029",
      history: [{ id: "h-29", action: "Asset Registered", performedBy: "Alex Mercer", date: "2025-04-20T10:00:00Z", details: "Registered HP LaserJet Printer." }]
    },
    {
      id: "ast-130",
      tag: "AST-2026-030",
      name: "Brother MFC-L8900CDW",
      serialNumber: "BR-MFC-82192L",
      category: AssetCategory.Other,
      purchaseDate: "2025-06-10",
      purchaseCost: 650,
      warrantyMonths: 12,
      condition: AssetCondition.Good,
      location: "SF Office - 2nd Floor Hallway",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-fin",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-030",
      history: [{ id: "h-30", action: "Asset Registered", performedBy: "Alex Mercer", date: "2025-06-10T14:30:00Z", details: "Registered Brother MFC." }]
    },
    {
      id: "ast-131",
      tag: "AST-2026-031",
      name: "Cisco Catalyst 9300 Router",
      serialNumber: "CS-CAT93-1829K",
      category: AssetCategory.Other,
      purchaseDate: "2025-03-12",
      purchaseCost: 4500,
      warrantyMonths: 60,
      condition: AssetCondition.Excellent,
      location: "Main Server Room (Rack A)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-031",
      history: [{ id: "h-31", action: "Asset Registered", performedBy: "Sarah Chen", date: "2025-03-12T09:00:00Z", details: "Registered Cisco Router." }]
    },
    {
      id: "ast-132",
      tag: "AST-2026-032",
      name: "UniFi Pro 48-Port Switch",
      serialNumber: "UF-SW48-9218K",
      category: AssetCategory.Other,
      purchaseDate: "2025-05-18",
      purchaseCost: 1200,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "Main Server Room (Rack B)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-032",
      history: [{ id: "h-32", action: "Asset Registered", performedBy: "Sarah Chen", date: "2025-05-18T11:00:00Z", details: "Registered UniFi Switch." }]
    },
    {
      id: "ast-133",
      tag: "AST-2026-033",
      name: "Fortinet FortiGate 100F Firewall",
      serialNumber: "FT-FG100F-821",
      category: AssetCategory.Other,
      purchaseDate: "2025-07-02",
      purchaseCost: 2800,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "Main Server Room (Rack A)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-033",
      history: [{ id: "h-33", action: "Asset Registered", performedBy: "Sarah Chen", date: "2025-07-02T10:00:00Z", details: "Registered Fortinet Firewall." }]
    },
    {
      id: "ast-134",
      tag: "AST-2026-034",
      name: "Dell PowerEdge R760 Server",
      serialNumber: "DL-PE-R760-8219",
      category: AssetCategory.Server,
      purchaseDate: "2025-02-14",
      purchaseCost: 8500,
      warrantyMonths: 48,
      condition: AssetCondition.Excellent,
      location: "Main Server Room (Rack C)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-034",
      history: [{ id: "h-34", action: "Asset Registered", performedBy: "Sarah Chen", date: "2025-02-14T08:00:00Z", details: "Registered Dell PowerEdge Server." }]
    },
    {
      id: "ast-135",
      tag: "AST-2026-035",
      name: "HPE ProLiant DL380 Gen11",
      serialNumber: "HP-PL-DL380-821",
      category: AssetCategory.Server,
      purchaseDate: "2025-04-10",
      purchaseCost: 9200,
      warrantyMonths: 48,
      condition: AssetCondition.Excellent,
      location: "Main Server Room (Rack C)",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-035",
      history: [{ id: "h-35", action: "Asset Registered", performedBy: "Sarah Chen", date: "2025-04-10T10:00:00Z", details: "Registered HPE ProLiant Server." }]
    },
    {
      id: "ast-136",
      tag: "AST-2026-036",
      name: "Epson Pro EX11000 Projector",
      serialNumber: "EP-EX11K-8219K",
      category: AssetCategory.Other,
      purchaseDate: "2025-09-05",
      purchaseCost: 1199,
      warrantyMonths: 24,
      condition: AssetCondition.Good,
      location: "5th Floor Conference Closet",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-036",
      history: [{ id: "h-36", action: "Asset Registered", performedBy: "Alex Mercer", date: "2025-09-05T14:00:00Z", details: "Registered Epson Projector." }]
    },
    {
      id: "ast-137",
      tag: "AST-2026-037",
      name: "Shure MV7 Microphone Suite",
      serialNumber: "SH-MV7-8219K-S",
      category: AssetCategory.Other,
      purchaseDate: "2025-11-20",
      purchaseCost: 450,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "Studio A Equipment Closet",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-037",
      history: [{ id: "h-37", action: "Asset Registered", performedBy: "Marcus Brody", date: "2025-11-20T11:00:00Z", details: "Registered Shure MV7." }]
    },
    {
      id: "ast-138",
      tag: "AST-2026-038",
      name: "Meta Quest 3 VR Headset 512GB",
      serialNumber: "MT-Q3-8219K2",
      category: AssetCategory.Other,
      purchaseDate: "2025-12-15",
      purchaseCost: 650,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "Engineering R&D Lab 4B",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-038",
      history: [{ id: "h-38", action: "Asset Registered", performedBy: "John Doe", date: "2025-12-15T10:00:00Z", details: "Registered Meta Quest VR Headset." }]
    },
    {
      id: "ast-139",
      tag: "AST-2026-039",
      name: "Zebra DS2208 Barcode Scanner",
      serialNumber: "ZB-DS22-8219K",
      category: AssetCategory.Other,
      purchaseDate: "2025-08-01",
      purchaseCost: 180,
      warrantyMonths: 12,
      condition: AssetCondition.Good,
      location: "Operations Warehouse 1",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-039",
      history: [{ id: "h-39", action: "Asset Registered", performedBy: "Alex Mercer", date: "2025-08-01T09:00:00Z", details: "Registered Zebra Barcode Scanner." }]
    },
    {
      id: "ast-140",
      tag: "AST-2026-040",
      name: "CalDigit TS4 Thunderbolt Dock",
      serialNumber: "CD-TS4-9182K2",
      category: AssetCategory.Other,
      purchaseDate: "2026-01-10",
      purchaseCost: 399,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-040",
      history: [{ id: "h-40", action: "Asset Registered", performedBy: "John Doe", date: "2026-01-10T11:00:00Z", details: "Registered CalDigit Thunderbolt Dock." }]
    },
    {
      id: "ast-141",
      tag: "AST-2026-041",
      name: "Logitech MX Brio Ultra HD Webcam",
      serialNumber: "LT-MXB-8219K2",
      category: AssetCategory.Other,
      purchaseDate: "2026-03-01",
      purchaseCost: 199,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-041",
      history: [{ id: "h-41", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-03-01T10:00:00Z", details: "Registered Logitech MX Brio." }]
    },
    {
      id: "ast-142",
      tag: "AST-2026-042",
      name: "iPad Pro 13\" M4 Slate",
      serialNumber: "AP-IPPM4-92182K",
      category: AssetCategory.Mobile,
      purchaseDate: "2026-02-18",
      purchaseCost: 1299,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-042",
      history: [{ id: "h-42", action: "Asset Registered", performedBy: "Marcus Brody", date: "2026-02-18T14:30:00Z", details: "Registered M4 iPad Pro." }]
    },
    {
      id: "ast-143",
      tag: "AST-2026-043",
      name: "Mac Mini M3 Pro 16GB",
      serialNumber: "AP-MMM3-9218K2",
      category: AssetCategory.Server,
      purchaseDate: "2026-01-15",
      purchaseCost: 1299,
      warrantyMonths: 24,
      condition: AssetCondition.Excellent,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-043",
      history: [{ id: "h-43", action: "Asset Registered", performedBy: "John Doe", date: "2026-01-15T11:00:00Z", details: "Registered brand new Mac Mini." }]
    },
    {
      id: "ast-144",
      tag: "AST-2026-044",
      name: "Dell 27\" 4K USB-C Monitor",
      serialNumber: "DL-27-4K-9218",
      category: AssetCategory.Monitor,
      purchaseDate: "2026-04-01",
      purchaseCost: 699,
      warrantyMonths: 36,
      condition: AssetCondition.New,
      location: "San Francisco Office - 2nd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-044",
      history: [{ id: "h-44", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-04-01T10:00:00Z", details: "Registered Dell 27\" 4K Monitor." }]
    },
    {
      id: "ast-145",
      tag: "AST-2026-045",
      name: "Samsung Galaxy Tab S9 Ultra",
      serialNumber: "SM-TAB-S9-821",
      category: AssetCategory.Mobile,
      purchaseDate: "2026-03-20",
      purchaseCost: 1199,
      warrantyMonths: 24,
      condition: AssetCondition.New,
      location: "Secure Storage Locker C",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-mkt",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-045",
      history: [{ id: "h-45", action: "Asset Registered", performedBy: "Marcus Brody", date: "2026-03-20T11:00:00Z", details: "Registered Samsung Galaxy Tab S9 Ultra." }]
    },
    {
      id: "ast-146",
      tag: "AST-2026-046",
      name: "Lenovo Legion Tower 7i",
      serialNumber: "LN-LT7-9218K2",
      category: AssetCategory.Other,
      purchaseDate: "2026-02-28",
      purchaseCost: 2499,
      warrantyMonths: 36,
      condition: AssetCondition.Excellent,
      location: "Engineering R&D Lab 4B",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-046",
      history: [{ id: "h-46", action: "Asset Registered", performedBy: "Sarah Chen", date: "2026-02-28T09:00:00Z", details: "Registered Lenovo Legion Tower." }]
    },
    {
      id: "ast-147",
      tag: "AST-2026-047",
      name: "Nintendo Switch OLED (Break Room)",
      serialNumber: "NT-SW-OLED-01",
      category: AssetCategory.Other,
      purchaseDate: "2026-01-25",
      purchaseCost: 349,
      warrantyMonths: 12,
      condition: AssetCondition.Excellent,
      location: "Break Room 2A",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-ops",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-047",
      history: [{ id: "h-47", action: "Asset Registered", performedBy: "Alex Mercer", date: "2026-01-25T14:00:00Z", details: "Registered Nintendo Switch for break room." }]
    },
    {
      id: "ast-148",
      tag: "AST-2026-048",
      name: "Sony WH-1000XM5 Headphones",
      serialNumber: "SY-WH1000-01",
      category: AssetCategory.Other,
      purchaseDate: "2026-04-10",
      purchaseCost: 399,
      warrantyMonths: 12,
      condition: AssetCondition.New,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-eng",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-048",
      history: [{ id: "h-48", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-04-10T10:00:00Z", details: "Registered Sony WH-1000XM5 Headphones." }]
    },
    {
      id: "ast-149",
      tag: "AST-2026-049",
      name: "Standing Desk FlexiSpot E7",
      serialNumber: "FS-E7-9218K",
      category: AssetCategory.Other,
      purchaseDate: "2026-03-05",
      purchaseCost: 599,
      warrantyMonths: 60,
      condition: AssetCondition.New,
      location: "San Francisco Office - 3rd Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-hr",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-049",
      history: [{ id: "h-49", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-03-05T11:00:00Z", details: "Registered Standing Desk." }]
    },
    {
      id: "ast-150",
      tag: "AST-2026-050",
      name: "Herman Miller Aeron Chair",
      serialNumber: "HM-AERON-01",
      category: AssetCategory.Other,
      purchaseDate: "2026-02-20",
      purchaseCost: 1495,
      warrantyMonths: 120,
      condition: AssetCondition.New,
      location: "San Francisco Office - 4th Floor",
      status: AssetStatus.Available,
      isBookable: true,
      departmentId: "dept-hr",
      currentHolderId: null,
      qrCodeUrl: "AST-2026-050",
      history: [{ id: "h-50", action: "Asset Registered", performedBy: "Elena Rostova", date: "2026-02-20T10:00:00Z", details: "Registered Herman Miller Chair." }]
    }
  ];
  db.assets = assets;

  // 4. Seed Bookings (10+ bookings for rich chart data)
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(now.getTime() - 2*86400000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(now.getTime() - 3*86400000).toISOString().split("T")[0];
  const lastWeek = new Date(now.getTime() - 7*86400000).toISOString().split("T")[0];
  const twoWeeksAgo = new Date(now.getTime() - 14*86400000).toISOString().split("T")[0];
  const lastMonth = new Date(now.getTime() - 30*86400000).toISOString().split("T")[0];
  const twoMonthsAgo = new Date(now.getTime() - 60*86400000).toISOString().split("T")[0];

  db.bookings = [
    {
      id: "bkg-201",
      assetId: "ast-104",
      assetName: "Conference Room 'Omega' (12 Pax)",
      assetCategory: AssetCategory.MeetingRoom,
      userId: "user-employee",
      userName: "John Doe",
      title: "Sprint Planning Session",
      start: `${today}T10:00:00`,
      end: `${today}T12:00:00`,
      status: "Ongoing",
      createdAt: "2026-07-10T14:22:00Z"
    },
    {
      id: "bkg-202",
      assetId: "ast-103",
      assetName: "Tesla Model 3 (Fleet #4)",
      assetCategory: AssetCategory.Vehicle,
      userId: "user-head",
      userName: "Sarah Chen",
      title: "Client Site Visit",
      start: `${today}T14:00:00`,
      end: `${today}T18:00:00`,
      status: "Upcoming",
      createdAt: "2026-07-11T09:15:00Z"
    },
    {
      id: "bkg-203",
      assetId: "ast-104",
      assetName: "Conference Room 'Omega' (12 Pax)",
      assetCategory: AssetCategory.MeetingRoom,
      userId: "user-employee2",
      userName: "Jane Smith",
      title: "Marketing Campaign Kickoff",
      start: `${yesterday}T09:00:00`,
      end: `${yesterday}T11:00:00`,
      status: "Completed",
      createdAt: "2026-07-09T16:30:00Z"
    },
    {
      id: "bkg-204",
      assetId: "ast-101",
      assetName: "MacBook Pro M3 Max 16\"",
      assetCategory: AssetCategory.Laptop,
      userId: "user-employee3",
      userName: "Bob Wilson",
      title: "Remote Work Setup",
      start: `${today}T08:00:00`,
      end: `${today}T20:00:00`,
      status: "Ongoing",
      createdAt: "2026-07-11T08:00:00Z"
    },
    {
      id: "bkg-205",
      assetId: "ast-102",
      assetName: "ThinkPad X1 Carbon Gen 11",
      assetCategory: AssetCategory.Laptop,
      userId: "user-employee4",
      userName: "Alice Brown",
      title: "Financial Audit Prep",
      start: `${yesterday}T08:00:00`,
      end: `${yesterday}T18:00:00`,
      status: "Completed",
      createdAt: "2026-07-10T08:00:00Z"
    },
    {
      id: "bkg-206",
      assetId: "ast-105",
      assetName: "Dell UltraSharp 32\" 4K Monitor",
      assetCategory: AssetCategory.Monitor,
      userId: "user-head-mkt",
      userName: "Marcus Brody",
      title: "Design Review Session",
      start: `${twoDaysAgo}T13:00:00`,
      end: `${twoDaysAgo}T15:00:00`,
      status: "Completed",
      createdAt: "2026-07-09T12:00:00Z"
    },
    {
      id: "bkg-207",
      assetId: "ast-106",
      assetName: "iPhone 15 Pro Max 256GB",
      assetCategory: AssetCategory.Mobile,
      userId: "user-employee2",
      userName: "Jane Smith",
      title: "Field Marketing Trip",
      start: `${threeDaysAgo}T09:00:00`,
      end: `${threeDaysAgo}T17:00:00`,
      status: "Completed",
      createdAt: "2026-07-08T09:00:00Z"
    },
    {
      id: "bkg-208",
      assetId: "ast-115",
      assetName: "Conference Room 'Orion' (8 Pax)",
      assetCategory: AssetCategory.MeetingRoom,
      userId: "user-head",
      userName: "Sarah Chen",
      title: "Engineering Standup",
      start: `${today}T09:00:00`,
      end: `${today}T09:30:00`,
      status: "Ongoing",
      createdAt: "2026-07-11T09:00:00Z"
    },
    {
      id: "bkg-209",
      assetId: "ast-120",
      assetName: "Tesla Model Y (Fleet #5)",
      assetCategory: AssetCategory.Vehicle,
      userId: "user-employee3",
      userName: "Bob Wilson",
      title: "Equipment Pickup",
      start: `${lastWeek}T10:00:00`,
      end: `${lastWeek}T14:00:00`,
      status: "Completed",
      createdAt: "2026-07-04T10:00:00Z"
    },
    {
      id: "bkg-210",
      assetId: "ast-107",
      assetName: "MacBook Air M3 13\"",
      assetCategory: AssetCategory.Laptop,
      userId: "user-employee",
      userName: "John Doe",
      title: "Conference Presentation",
      start: `${twoWeeksAgo}T09:00:00`,
      end: `${twoWeeksAgo}T17:00:00`,
      status: "Completed",
      createdAt: "2026-06-27T09:00:00Z"
    },
    {
      id: "bkg-211",
      assetId: "ast-124",
      assetName: "LG UltraFine 5K Display 27\"",
      assetCategory: AssetCategory.Monitor,
      userId: "user-head-mkt",
      userName: "Marcus Brody",
      title: "Video Editing Session",
      start: `${lastMonth}T10:00:00`,
      end: `${lastMonth}T18:00:00`,
      status: "Completed",
      createdAt: "2026-06-11T10:00:00Z"
    },
    {
      id: "bkg-212",
      assetId: "ast-112",
      assetName: "iPhone 16 Pro Slate 256GB",
      assetCategory: AssetCategory.Mobile,
      userId: "user-employee4",
      userName: "Alice Brown",
      title: "Business Trip",
      start: `${twoMonthsAgo}T08:00:00`,
      end: `${twoMonthsAgo}T20:00:00`,
      status: "Completed",
      createdAt: "2026-05-12T08:00:00Z"
    }
  ];

  // 5. Seed Transfers
  db.transfers = [
    {
      id: "trf-301",
      assetId: "ast-101",
      assetTag: "AST-2026-001",
      assetName: "MacBook Pro 16\" M3 Max",
      requestedById: "user-employee2",
      requestedByName: "Jane Smith",
      sourceDepartmentId: "dept-eng",
      targetDepartmentId: "dept-mkt",
      targetHolderId: "user-employee2",
      status: "Pending",
      createdAt: "2026-07-11T15:30:00Z"
    },
    {
      id: "trf-302",
      assetId: "ast-108",
      assetTag: "AST-2026-008",
      assetName: "Dell Latitude 7440",
      requestedById: "user-employee4",
      requestedByName: "Alice Brown",
      sourceDepartmentId: "dept-fin",
      targetDepartmentId: "dept-eng",
      targetHolderId: "user-employee",
      status: "Approved",
      createdAt: "2026-07-10T10:00:00Z",
      approvedById: "user-admin",
      approvedByName: "Alex Mercer"
    },
    {
      id: "trf-303",
      assetId: "ast-110",
      assetTag: "AST-2026-010",
      assetName: "Surface Laptop 5",
      requestedById: "user-head-mkt",
      requestedByName: "Marcus Brody",
      sourceDepartmentId: "dept-mkt",
      targetDepartmentId: "dept-ops",
      targetHolderId: "user-employee3",
      status: "Pending",
      createdAt: "2026-07-12T08:00:00Z"
    }
  ];

  // 6. Seed Maintenance (5+ tickets for rich chart data)
  db.maintenances = [
    {
      id: "maint-401",
      assetId: "ast-105",
      assetTag: "AST-2026-005",
      assetName: "Dell UltraSharp 32\" 4K Monitor",
      reportedById: "user-head-mkt",
      reportedByName: "Marcus Brody",
      description: "Screen panel starts flickering heavily when running at 60Hz and has vertical lines on the right side.",
      priority: "Medium",
      status: "In-Progress",
      createdAt: "2026-07-01T10:00:00Z",
      technicianName: "Alex Mercer (Admin)",
      photoUrl: getMaintenanceImage("Monitor", "Screen panel starts flickering heavily when running at 60Hz and has vertical lines on the right side.", "ast-105")
    },
    {
      id: "maint-402",
      assetId: "ast-103",
      assetTag: "AST-2026-003",
      assetName: "Tesla Model 3 (Fleet #4)",
      reportedById: "user-employee3",
      reportedByName: "Bob Wilson",
      description: "Brake pads worn out, need replacement. Check engine light is on.",
      priority: "High",
      status: "Pending",
      createdAt: "2026-07-11T14:00:00Z",
      photoUrl: getMaintenanceImage("Vehicle", "Brake pads worn out, need replacement. Check engine light is on.", "ast-103")
    },
    {
      id: "maint-403",
      assetId: "ast-106",
      assetTag: "AST-2026-006",
      assetName: "iPhone 15 Pro Max 256GB",
      reportedById: "user-employee2",
      reportedByName: "Jane Smith",
      description: "Battery drains quickly, needs diagnostic check.",
      priority: "Low",
      status: "Pending",
      createdAt: "2026-07-10T09:00:00Z",
      photoUrl: getMaintenanceImage("Mobile", "Battery drains quickly, needs diagnostic check.", "ast-106")
    },
    {
      id: "maint-404",
      assetId: "ast-131",
      assetTag: "AST-2026-031",
      assetName: "Cisco Catalyst 9300 Router",
      reportedById: "user-head",
      reportedByName: "Sarah Chen",
      description: "Intermittent packet loss on port 8. Firmware update required.",
      priority: "Critical",
      status: "In-Progress",
      createdAt: "2026-07-12T06:00:00Z",
      technicianName: "Elena Rostova",
      photoUrl: getMaintenanceImage("Other", "Intermittent packet loss on port 8. Firmware update required.", "ast-131")
    },
    {
      id: "maint-405",
      assetId: "ast-125",
      assetTag: "AST-2026-025",
      assetName: "Samsung ViewFinity S9 5K",
      reportedById: "user-employee4",
      reportedByName: "Alice Brown",
      description: "Display has dead pixel cluster in top-left corner.",
      priority: "Low",
      status: "Resolved",
      createdAt: "2026-07-08T11:00:00Z",
      technicianName: "Alex Mercer (Admin)",
      resolvedDate: "2026-07-09T15:00:00Z",
      photoUrl: getMaintenanceImage("Monitor", "Display has dead pixel cluster in top-left corner.", "ast-125")
    },
    {
      id: "maint-406",
      assetId: "ast-134",
      assetTag: "AST-2026-034",
      assetName: "Dell PowerEdge R760 Server",
      reportedById: "user-head",
      reportedByName: "Sarah Chen",
      description: "RAID array degraded, one drive failed. Need hot-swap replacement.",
      priority: "Critical",
      status: "Pending",
      createdAt: "2026-07-12T08:30:00Z",
      photoUrl: getMaintenanceImage("Server", "RAID array degraded, one drive failed. Need hot-swap replacement.", "ast-134")
    },
    {
      id: "maint-407",
      assetId: "ast-109",
      assetTag: "AST-2026-009",
      assetName: "HP EliteBook 840 G10",
      reportedById: "user-employee3",
      reportedByName: "Bob Wilson",
      description: "Keyboard backlight not working, USB port loose.",
      priority: "Medium",
      status: "Approved",
      createdAt: "2026-07-09T16:00:00Z",
      technicianName: "Elena Rostova",
      photoUrl: getMaintenanceImage("Laptop", "Keyboard backlight not working, USB port loose.", "ast-109")
    }
  ];

  // 7. Seed Audit Cycles
  db.auditCycles = [
    {
      id: "aud-501",
      title: "Q3 Tech & Engineering Inventory Audit",
      auditorId: "user-manager",
      auditorName: "Elena Rostova",
      departmentId: "dept-eng",
      location: "San Francisco Office - 4th Floor",
      startDate: "2026-07-01",
      endDate: "2026-07-15",
      status: "In-Progress",
      createdAt: "2026-07-01T08:00:00Z",
      items: [
        {
          assetId: "ast-101",
          assetTag: "AST-2026-001",
          assetName: "MacBook Pro 16\" M3 Max",
          category: "Laptop",
          expectedHolderName: "John Doe",
          verified: true,
          actualHolderId: "user-employee",
          condition: AssetCondition.Excellent,
          status: AssetStatus.Allocated,
          notes: "Physically verified. Screen and keyboard are in perfect shape."
        },
        {
          assetId: "ast-102",
          assetTag: "AST-2026-002",
          assetName: "ThinkPad X1 Carbon Gen 11",
          category: "Laptop",
          expectedHolderName: "Unallocated",
          verified: false,
          actualHolderId: null,
          condition: AssetCondition.Excellent,
          status: AssetStatus.Available,
          notes: ""
        }
      ]
    }
  ];

  // 8. Seed Notifications
  db.notifications = [
    {
      id: "not-601",
      userId: "user-employee",
      title: "Asset Allocated",
      message: "MacBook Pro 16\" (AST-2026-001) has been successfully assigned to you.",
      type: "success",
      isRead: false,
      createdAt: "2026-01-15T11:30:00Z"
    },
    {
      id: "not-602",
      userId: "user-manager",
      title: "New Transfer Request",
      message: "Jane Smith has requested an asset transfer for MacBook Pro 16\" (AST-2026-001).",
      type: "info",
      isRead: false,
      createdAt: "2026-07-11T15:30:00Z"
    },
    {
      id: "not-603",
      userId: "user-admin",
      title: "Critical Maintenance Required",
      message: "Cisco Catalyst 9300 Router (AST-2026-031) has a critical maintenance ticket.",
      type: "alert",
      isRead: false,
      createdAt: "2026-07-12T06:00:00Z"
    },
    {
      id: "not-604",
      userId: "user-head",
      title: "Audit Reminder",
      message: "Q3 Tech & Engineering Inventory Audit is due by July 15.",
      type: "info",
      isRead: false,
      createdAt: "2026-07-12T08:00:00Z"
    }
  ];

  // 9. Seed Logs (10+ logs for rich timeline)
  db.logs = [
    {
      id: "log-701",
      userId: "user-manager",
      userName: "Elena Rostova",
      action: "REGISTER",
      targetType: "Asset",
      targetId: "ast-101",
      details: "Registered asset: MacBook Pro 16\" M3 Max",
      createdAt: "2026-01-15T10:00:00Z"
    },
    {
      id: "log-702",
      userId: "user-manager",
      userName: "Elena Rostova",
      action: "ALLOCATE",
      targetType: "Asset",
      targetId: "ast-101",
      details: "Allocated MacBook Pro 16\" to employee John Doe",
      oldValue: "Available",
      newValue: "Allocated",
      createdAt: "2026-01-15T11:30:00Z"
    },
    {
      id: "log-703",
      userId: "user-employee2",
      userName: "Jane Smith",
      action: "CREATE_BOOKING",
      targetType: "Booking",
      targetId: "bkg-203",
      details: "Booked resource Conference Room 'Omega' (12 Pax) for Marketing Campaign Kickoff",
      createdAt: "2026-07-09T16:30:00Z"
    },
    {
      id: "log-704",
      userId: "user-head",
      userName: "Sarah Chen",
      action: "CREATE_BOOKING",
      targetType: "Booking",
      targetId: "bkg-202",
      details: "Booked resource Tesla Model 3 (Fleet #4) for Client Site Visit",
      createdAt: "2026-07-11T09:15:00Z"
    },
    {
      id: "log-705",
      userId: "user-head-mkt",
      userName: "Marcus Brody",
      action: "REPORT_MAINTENANCE",
      targetType: "Maintenance",
      targetId: "maint-401",
      details: "Filed ticket for Dell UltraSharp 32\" 4K Monitor - Priority: Medium",
      createdAt: "2026-07-01T10:00:00Z"
    },
    {
      id: "log-706",
      userId: "user-employee3",
      userName: "Bob Wilson",
      action: "REPORT_MAINTENANCE",
      targetType: "Maintenance",
      targetId: "maint-402",
      details: "Filed ticket for Tesla Model 3 (Fleet #4) - Priority: High",
      createdAt: "2026-07-11T14:00:00Z"
    },
    {
      id: "log-707",
      userId: "user-head",
      userName: "Sarah Chen",
      action: "REPORT_MAINTENANCE",
      targetType: "Maintenance",
      targetId: "maint-404",
      details: "Filed ticket for Cisco Catalyst 9300 Router - Priority: Critical",
      createdAt: "2026-07-12T06:00:00Z"
    },
    {
      id: "log-708",
      userId: "user-employee2",
      userName: "Jane Smith",
      action: "REQUEST_TRANSFER",
      targetType: "Transfer",
      targetId: "trf-301",
      details: "Requested transfer for asset MacBook Pro 16\" M3 Max to Department",
      createdAt: "2026-07-11T15:30:00Z"
    },
    {
      id: "log-709",
      userId: "user-admin",
      userName: "Alex Mercer",
      action: "APPROVE_TRANSFER",
      targetType: "Transfer",
      targetId: "trf-302",
      details: "Approved asset transfer of Dell Latitude 7440",
      createdAt: "2026-07-10T12:00:00Z"
    },
    {
      id: "log-710",
      userId: "user-manager",
      userName: "Elena Rostova",
      action: "CREATE_AUDIT",
      targetType: "AuditCycle",
      targetId: "aud-501",
      details: "Initiated audit cycle: Q3 Tech & Engineering Inventory Audit with 2 scoped assets.",
      createdAt: "2026-07-01T08:00:00Z"
    },
    {
      id: "log-711",
      userId: "user-employee",
      userName: "John Doe",
      action: "CREATE_BOOKING",
      targetType: "Booking",
      targetId: "bkg-201",
      details: "Booked resource Conference Room 'Omega' (12 Pax) for Sprint Planning Session",
      createdAt: "2026-07-10T14:22:00Z"
    },
    {
      id: "log-712",
      userId: "user-head",
      userName: "Sarah Chen",
      action: "REPORT_MAINTENANCE",
      targetType: "Maintenance",
      targetId: "maint-406",
      details: "Filed ticket for Dell PowerEdge R760 Server - Priority: Critical",
      createdAt: "2026-07-12T08:30:00Z"
    }
  ];

  saveDatabase(db);
  return db;
}

function saveDatabase(db: DatabaseSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// REST API Endpoints

// Authentication API
app.post("/api/auth/signup", (req, res) => {
  const { email, password, name, departmentId } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required fields (email, password, name)." });
  }

  const db = loadDatabase();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "User with this email already exists." });
  }

  const newUser: User = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    email: email.toLowerCase(),
    name,
    role: Role.Employee, // default role for signup
    departmentId: departmentId || null,
    status: UserStatus.Active,
    avatar: "",
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.passwords[newUser.id] = hashPassword(password);

  // System log
  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: newUser.id,
    userName: newUser.name,
    action: "SIGNUP",
    targetType: "User",
    targetId: newUser.id,
    details: `Signed up as a new Employee.`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);

  const token = generateToken(newUser);
  res.status(201).json({ token, user: newUser });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password." });
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const hashedPassword = hashPassword(password);
  if (db.passwords[user.id] !== hashedPassword) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (user.status === UserStatus.Inactive) {
    return res.status(403).json({ error: "Your account is inactive. Contact Administrator." });
  }

  const token = generateToken(user);
  res.json({ token, user });
});

app.get("/api/auth/me", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  res.json(user);
});

// Update authenticated user's profile details
app.put("/api/auth/profile", authenticate, (req: any, res) => {
  const { name, avatar } = req.body;
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const oldName = user.name;
  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;

  // Update logs
  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "UPDATE_PROFILE",
    targetType: "User",
    targetId: user.id,
    details: `Updated personal profile details: name changed from "${oldName}" to "${user.name}"`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(user);
});

// Admin promo / User roles API
app.patch("/api/users/:id/role", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin) {
    return res.status(403).json({ error: "Only Administrators can modify user roles." });
  }

  const { role } = req.body;
  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ error: "Invalid role specified." });
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const oldRole = user.role;
  user.role = role;

  // Department Head assignments
  if (role === Role.DepartmentHead && user.departmentId) {
    const dept = db.departments.find(d => d.id === user.departmentId);
    if (dept) {
      dept.headId = user.id;
    }
  }

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "PROMOTE",
    targetType: "User",
    targetId: user.id,
    details: `Updated role for ${user.name}`,
    oldValue: oldRole,
    newValue: role,
    createdAt: new Date().toISOString()
  });

  // Notify the user
  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    title: "Role Promoted",
    message: `Your system role has been updated to ${role} by Administrator.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(user);
});

// Users/Employees Directory
app.get("/api/users", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.users);
});

// Departments API
app.get("/api/departments", authenticate, (req, res) => {
  const db = loadDatabase();
  // Include employee count dynamic calc
  const deptsWithCount = db.departments.map(dept => {
    const employeeCount = db.users.filter(u => u.departmentId === dept.id).length;
    return { ...dept, employeeCount };
  });
  res.json(deptsWithCount);
});

app.post("/api/departments", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Forbidden: Insufficient privileges." });
  }

  const { name, parentId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Department name is required." });
  }

  const db = loadDatabase();
  const newDept: Department = {
    id: `dept-${crypto.randomUUID().slice(0, 8)}`,
    name,
    parentId: parentId || null,
    headId: null,
    status: "Active",
    createdAt: new Date().toISOString()
  };

  db.departments.push(newDept);

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CREATE_DEPT",
    targetType: "Department",
    targetId: newDept.id,
    details: `Created department: ${name}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newDept);
});

// Assets API
app.get("/api/assets", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.assets);
});

app.post("/api/assets", authenticate, (req: any, res) => {
  // Allow all authenticated users (Employees, Department Heads, Asset Managers, and Admins) to register assets

  const {
    name,
    serialNumber,
    category,
    purchaseDate,
    purchaseCost,
    warrantyMonths,
    condition,
    location,
    isBookable,
    departmentId,
    customFields
  } = req.body;

  if (!name || !category || !purchaseDate || !purchaseCost || !condition || !location) {
    return res.status(400).json({ error: "Missing required asset details." });
  }

  const db = loadDatabase();
  const id = `ast-${crypto.randomUUID().slice(0, 8)}`;
  const tag = `AST-2026-${String(db.assets.length + 1).padStart(3, "0")}`;

  const newAsset: Asset = {
    id,
    tag,
    name,
    serialNumber: serialNumber || `SN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    category,
    purchaseDate,
    purchaseCost: Number(purchaseCost),
    warrantyMonths: Number(warrantyMonths || 12),
    condition,
    location,
    status: AssetStatus.Available,
    isBookable: !!isBookable,
    departmentId: departmentId || null,
    currentHolderId: null,
    qrCodeUrl: tag, // Simple text representation for simulated scanning
    customFields: customFields || {},
    history: [
      {
        id: `hist-${crypto.randomUUID().slice(0, 8)}`,
        action: "Asset Registered",
        performedBy: req.user.name,
        date: new Date().toISOString(),
        details: `Registered asset into the system.`
      }
    ]
  };

  db.assets.push(newAsset);

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CREATE_ASSET",
    targetType: "Asset",
    targetId: id,
    details: `Registered brand new asset ${name} (${tag})`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newAsset);
});

app.put("/api/assets/:id", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied. Managers only." });
  }

  const db = loadDatabase();
  const assetIndex = db.assets.findIndex(a => a.id === req.params.id);
  if (assetIndex === -1) {
    return res.status(404).json({ error: "Asset not found." });
  }

  const currentAsset = db.assets[assetIndex];
  const updates = req.body;

  const oldStatus = currentAsset.status;
  const newStatus = updates.status || currentAsset.status;

  // Build a change details log
  const changes: string[] = [];
  if (updates.name && updates.name !== currentAsset.name) changes.push(`Name changed to: ${updates.name}`);
  if (updates.condition && updates.condition !== currentAsset.condition) changes.push(`Condition changed to: ${updates.condition}`);
  if (updates.status && updates.status !== currentAsset.status) changes.push(`Status changed to: ${updates.status}`);
  if (updates.location && updates.location !== currentAsset.location) changes.push(`Location changed to: ${updates.location}`);

  const updatedAsset: Asset = {
    ...currentAsset,
    ...updates,
    history: [
      ...currentAsset.history,
      {
        id: `hist-${crypto.randomUUID().slice(0, 8)}`,
        action: "Asset Updated",
        performedBy: req.user.name,
        date: new Date().toISOString(),
        details: changes.length > 0 ? changes.join(", ") : "Asset parameters updated."
      }
    ]
  };

  db.assets[assetIndex] = updatedAsset;

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "UPDATE_ASSET",
    targetType: "Asset",
    targetId: currentAsset.id,
    details: `Updated asset ${currentAsset.name} parameters.`,
    oldValue: oldStatus,
    newValue: newStatus,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(updatedAsset);
});

app.delete("/api/assets/:id", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin) {
    return res.status(403).json({ error: "Access denied. Admins only can delete assets." });
  }

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) {
    return res.status(404).json({ error: "Asset not found." });
  }

  db.assets = db.assets.filter(a => a.id !== req.params.id);

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "DELETE_ASSET",
    targetType: "Asset",
    targetId: req.params.id,
    details: `Deleted asset ${asset.name} (${asset.tag})`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, message: "Asset successfully deleted." });
});

// Bulk Asset Allocation
app.post("/api/assets/bulk-allocate", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { assetIds, userId, departmentId, expectedReturnDate } = req.body;
  if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0 || !userId) {
    return res.status(400).json({ error: "Missing selection of assets or target employee." });
  }

  const db = loadDatabase();
  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: "Employee not found." });
  }

  let allocatedCount = 0;
  assetIds.forEach(id => {
    const asset = db.assets.find(a => a.id === id);
    if (asset && asset.status === AssetStatus.Available) {
      asset.status = AssetStatus.Allocated;
      asset.currentHolderId = userId;
      asset.departmentId = departmentId || targetUser.departmentId || asset.departmentId;
      asset.history.push({
        id: `hist-${crypto.randomUUID().slice(0, 8)}`,
        action: "Bulk Allocation",
        performedBy: req.user.name,
        date: new Date().toISOString(),
        details: `Assigned to ${targetUser.name} during bulk action. Expected return: ${expectedReturnDate || "None"}`
      });
      allocatedCount++;

      // User notification
      db.notifications.push({
        id: `not-${crypto.randomUUID().slice(0, 8)}`,
        userId: userId,
        title: "Asset Allocated",
        message: `Asset ${asset.name} (${asset.tag}) has been assigned to you.`,
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  });

  if (allocatedCount > 0) {
    db.logs.push({
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      userId: req.user.id,
      userName: req.user.name,
      action: "BULK_ALLOCATE",
      targetType: "Asset",
      targetId: userId,
      details: `Bulk allocated ${allocatedCount} assets to ${targetUser.name}`,
      createdAt: new Date().toISOString()
    });
    saveDatabase(db);
  }

  res.json({ success: true, count: allocatedCount });
});

// Single asset allocation
app.post("/api/assets/:id/allocate", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { userId, departmentId, expectedReturnDate } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Employee selection is required." });
  }

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === req.params.id);
  const employee = db.users.find(u => u.id === userId);

  if (!asset) return res.status(404).json({ error: "Asset not found." });
  if (!employee) return res.status(404).json({ error: "Employee not found." });

  if (asset.status !== AssetStatus.Available) {
    const holder = db.users.find(u => u.id === asset.currentHolderId);
    return res.status(409).json({
      error: "Conflict: This asset is currently not available.",
      currentHolder: holder ? holder.name : "System / Locked",
      currentHolderId: asset.currentHolderId
    });
  }

  asset.status = AssetStatus.Allocated;
  asset.currentHolderId = userId;
  asset.departmentId = departmentId || employee.departmentId || asset.departmentId;
  asset.history.push({
    id: `hist-${crypto.randomUUID().slice(0, 8)}`,
    action: "Allocated",
    performedBy: req.user.name,
    date: new Date().toISOString(),
    details: `Allocated to ${employee.name}. Return date: ${expectedReturnDate || "Indefinite"}`
  });

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    title: "Asset Assigned",
    message: `${asset.name} (${asset.tag}) has been assigned to you.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "ALLOCATE",
    targetType: "Asset",
    targetId: asset.id,
    details: `Allocated ${asset.name} (${asset.tag}) to ${employee.name}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(asset);
});

// Single asset return workflow
app.post("/api/assets/:id/return", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { conditionCheck, notes } = req.body;

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: "Asset not found." });

  const oldHolderId = asset.currentHolderId;
  const oldHolder = db.users.find(u => u.id === oldHolderId);

  asset.status = AssetStatus.Available;
  asset.currentHolderId = null;
  if (conditionCheck) {
    asset.condition = conditionCheck as AssetCondition;
  }

  asset.history.push({
    id: `hist-${crypto.randomUUID().slice(0, 8)}`,
    action: "Returned",
    performedBy: req.user.name,
    date: new Date().toISOString(),
    details: `Returned by ${oldHolder ? oldHolder.name : "Unknown Employee"}. Condition noted: ${conditionCheck || asset.condition}. Notes: ${notes || "None"}`
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "RETURN",
    targetType: "Asset",
    targetId: asset.id,
    details: `Returned asset ${asset.name} (${asset.tag}) from ${oldHolder ? oldHolder.name : "Employee"}`,
    createdAt: new Date().toISOString()
  });

  if (oldHolderId) {
    db.notifications.push({
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      userId: oldHolderId,
      title: "Asset Handed Over",
      message: `Your allocation of ${asset.name} has been marked as returned and verified.`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  saveDatabase(db);
  res.json(asset);
});

// Transfers API
app.get("/api/transfers", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.transfers);
});

app.post("/api/transfers", authenticate, (req: any, res) => {
  const { assetId, targetDepartmentId, targetHolderId, comments } = req.body;
  if (!assetId || !targetDepartmentId) {
    return res.status(400).json({ error: "Asset ID and Target Department are required." });
  }

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found." });

  const targetHolder = targetHolderId ? db.users.find(u => u.id === targetHolderId) : null;

  const newTransfer: Transfer = {
    id: `trf-${crypto.randomUUID().slice(0, 8)}`,
    assetId,
    assetTag: asset.tag,
    assetName: asset.name,
    requestedById: req.user.id,
    requestedByName: req.user.name,
    sourceDepartmentId: asset.departmentId,
    targetDepartmentId,
    targetHolderId: targetHolderId || null,
    status: "Pending",
    createdAt: new Date().toISOString(),
    comments: comments || ""
  };

  db.transfers.push(newTransfer);

  // Notify Managers & Department Head
  const deptHead = db.users.find(u => u.role === Role.DepartmentHead && u.departmentId === targetDepartmentId);
  const notifyIds = db.users.filter(u => u.role === Role.AssetManager || u.role === Role.Admin).map(u => u.id);
  if (deptHead) notifyIds.push(deptHead.id);

  notifyIds.forEach(userId => {
    db.notifications.push({
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      title: "Transfer Request",
      message: `${req.user.name} requested transfer of ${asset.name} (${asset.tag}).`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "REQUEST_TRANSFER",
    targetType: "Transfer",
    targetId: newTransfer.id,
    details: `Requested transfer for asset ${asset.name} to ${targetHolder ? targetHolder.name : "Department"}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newTransfer);
});

app.post("/api/transfers/:id/approve", authenticate, (req: any, res) => {
  if (req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Insufficient permissions to approve transfers." });
  }

  const db = loadDatabase();
  const transfer = db.transfers.find(t => t.id === req.params.id);
  if (!transfer) return res.status(404).json({ error: "Transfer request not found." });

  if (transfer.status !== "Pending") {
    return res.status(400).json({ error: "This transfer request is already processed." });
  }

  const asset = db.assets.find(a => a.id === transfer.assetId);
  if (!asset) return res.status(404).json({ error: "Associated asset not found." });

  transfer.status = "Approved";
  transfer.approvedById = req.user.id;
  transfer.approvedByName = req.user.name;

  const oldHolderId = asset.currentHolderId;

  // Execute actual transfer in DB
  asset.departmentId = transfer.targetDepartmentId;
  asset.currentHolderId = transfer.targetHolderId || null;
  asset.status = transfer.targetHolderId ? AssetStatus.Allocated : AssetStatus.Available;
  
  asset.history.push({
    id: `hist-${crypto.randomUUID().slice(0, 8)}`,
    action: "Transferred",
    performedBy: req.user.name,
    date: new Date().toISOString(),
    details: `Transfer request ${transfer.id} approved. Department changed to: ${transfer.targetDepartmentId}. Holder changed to: ${transfer.targetHolderId || "None"}`
  });

  // Notify original requester
  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: transfer.requestedById,
    title: "Transfer Approved",
    message: `Transfer of asset ${asset.name} has been approved by ${req.user.name}.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // Notify new recipient if assigned
  if (transfer.targetHolderId) {
    db.notifications.push({
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      userId: transfer.targetHolderId,
      title: "Asset Transferred to You",
      message: `Asset ${asset.name} has been transferred and allocated to you.`,
      type: "success",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "APPROVE_TRANSFER",
    targetType: "Transfer",
    targetId: transfer.id,
    details: `Approved asset transfer of ${asset.name}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(transfer);
});

app.post("/api/transfers/:id/reject", authenticate, (req: any, res) => {
  if (req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Insufficient permissions." });
  }

  const { comments } = req.body;

  const db = loadDatabase();
  const transfer = db.transfers.find(t => t.id === req.params.id);
  if (!transfer) return res.status(404).json({ error: "Transfer request not found." });

  transfer.status = "Rejected";
  transfer.approvedById = req.user.id;
  transfer.approvedByName = req.user.name;
  transfer.comments = comments || transfer.comments;

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: transfer.requestedById,
    title: "Transfer Rejected",
    message: `Transfer of asset ${transfer.assetName} was rejected: ${comments || "No comments."}`,
    type: "warning",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "REJECT_TRANSFER",
    targetType: "Transfer",
    targetId: transfer.id,
    details: `Rejected asset transfer of ${transfer.assetName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(transfer);
});

// Resource bookings API
app.get("/api/bookings", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.bookings);
});

app.post("/api/bookings", authenticate, (req: any, res) => {
  const { assetId, title, start, end } = req.body;
  if (!assetId || !title || !start || !end) {
    return res.status(400).json({ error: "Asset, Title, Start, and End Times are required." });
  }

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found." });

  if (!asset.isBookable) {
    return res.status(400).json({ error: "This asset is not set as a bookable shared resource." });
  }

  // Conflict Overlap Detection
  const requestedStart = new Date(start);
  const requestedEnd = new Date(end);

  const overlap = db.bookings.find(b => {
    if (b.assetId !== assetId || b.status === "Cancelled") return false;
    const bStart = new Date(b.start);
    const bEnd = new Date(b.end);
    return requestedStart < bEnd && requestedEnd > bStart;
  });

  if (overlap) {
    return res.status(409).json({
      error: "Overlap Conflict: The resource is already reserved during this time slot.",
      overlapBooking: {
        title: overlap.title,
        userName: overlap.userName,
        start: overlap.start,
        end: overlap.end
      }
    });
  }

  const newBooking: Booking = {
    id: `bkg-${crypto.randomUUID().slice(0, 8)}`,
    assetId,
    assetName: asset.name,
    assetCategory: asset.category,
    userId: req.user.id,
    userName: req.user.name,
    title,
    start,
    end,
    status: "Upcoming",
    createdAt: new Date().toISOString()
  };

  db.bookings.push(newBooking);

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    title: "Booking Confirmed",
    message: `Your booking for ${asset.name} ("${title}") has been confirmed.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CREATE_BOOKING",
    targetType: "Booking",
    targetId: newBooking.id,
    details: `Booked resource ${asset.name} from ${start} to ${end}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newBooking);
});

app.post("/api/bookings/:id/cancel", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  // Only creator, head or manager/admin can cancel
  if (booking.userId !== req.user.id && req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Unauthorized to cancel this booking." });
  }

  booking.status = "Cancelled";

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: booking.userId,
    title: "Booking Cancelled",
    message: `Your booking for ${booking.assetName} was cancelled.`,
    type: "warning",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CANCEL_BOOKING",
    targetType: "Booking",
    targetId: booking.id,
    details: `Cancelled booking for ${booking.assetName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(booking);
});

app.delete("/api/bookings/:id", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const bookingIndex = db.bookings.findIndex(b => b.id === req.params.id);
  if (bookingIndex === -1) return res.status(404).json({ error: "Booking not found." });

  const booking = db.bookings[bookingIndex];

  // Only creator or admin/manager can delete
  if (booking.userId !== req.user.id && req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Unauthorized to delete this booking." });
  }

  // Remove the booking from db.bookings
  db.bookings.splice(bookingIndex, 1);

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: booking.userId,
    title: "Booking Deleted",
    message: `Your booking for ${booking.assetName} was deleted.`,
    type: "warning",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "DELETE_BOOKING",
    targetType: "Booking",
    targetId: booking.id,
    details: `Deleted booking for ${booking.assetName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true });
});

// Maintenance Requests API
app.get("/api/maintenances", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.maintenances);
});

app.post("/api/maintenances", authenticate, (req: any, res) => {
  const { assetId, description, priority, photoUrl } = req.body;
  if (!assetId || !description || !priority) {
    return res.status(400).json({ error: "Asset selection, description and priority are required." });
  }

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found." });

  const newMaint: Maintenance = {
    id: `maint-${crypto.randomUUID().slice(0, 8)}`,
    assetId,
    assetTag: asset.tag,
    assetName: asset.name,
    reportedById: req.user.id,
    reportedByName: req.user.name,
    description,
    priority,
    status: "Pending",
    createdAt: new Date().toISOString(),
    photoUrl: photoUrl || getMaintenanceImage(asset.category, description, assetId)
  };

  db.maintenances.push(newMaint);

  // Auto update asset status to UnderMaintenance is not done on "Pending" request, only when "Approved"
  // Notify Managers
  db.users.filter(u => u.role === Role.AssetManager || u.role === Role.Admin).forEach(manager => {
    db.notifications.push({
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      userId: manager.id,
      title: "New Maintenance Ticket",
      message: `${req.user.name} reported a maintenance issue with ${asset.name}.`,
      type: "warning",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "REPORT_MAINTENANCE",
    targetType: "Maintenance",
    targetId: newMaint.id,
    details: `Filed ticket for ${asset.name} - Priority: ${priority}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newMaint);
});

app.post("/api/maintenances/:id/approve", authenticate, (req: any, res) => {
  if (req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { technicianName } = req.body;

  const db = loadDatabase();
  const maint = db.maintenances.find(m => m.id === req.params.id);
  if (!maint) return res.status(404).json({ error: "Ticket not found." });

  maint.status = "In-Progress";
  maint.technicianName = technicianName || req.user.name;

  const asset = db.assets.find(a => a.id === maint.assetId);
  if (asset) {
    asset.status = AssetStatus.UnderMaintenance;
    asset.history.push({
      id: `hist-${crypto.randomUUID().slice(0, 8)}`,
      action: "Status Updated",
      performedBy: req.user.name,
      date: new Date().toISOString(),
      details: `Moved to Under Maintenance as ticket ${maint.id} was approved and assigned.`
    });
  }

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: maint.reportedById,
    title: "Maintenance In-Progress",
    message: `Ticket for ${maint.assetName} was approved. Tech Assigned: ${maint.technicianName}.`,
    type: "info",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "APPROVE_MAINTENANCE",
    targetType: "Maintenance",
    targetId: maint.id,
    details: `Approved maintenance ticket for ${maint.assetName}. Assigned: ${maint.technicianName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(maint);
});

app.post("/api/maintenances/:id/resolve", authenticate, (req: any, res) => {
  if (req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Access denied." });
  }

  const db = loadDatabase();
  const maint = db.maintenances.find(m => m.id === req.params.id);
  if (!maint) return res.status(404).json({ error: "Ticket not found." });

  maint.status = "Resolved";
  maint.resolvedDate = new Date().toISOString();

  const asset = db.assets.find(a => a.id === maint.assetId);
  if (asset) {
    asset.status = AssetStatus.Available; // Auto release
    asset.condition = AssetCondition.Excellent; // Assuming tech fixed it well
    asset.history.push({
      id: `hist-${crypto.randomUUID().slice(0, 8)}`,
      action: "Status Restored",
      performedBy: req.user.name,
      date: new Date().toISOString(),
      details: `Restored to Available after maintenance ticket ${maint.id} resolution.`
    });
  }

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: maint.reportedById,
    title: "Maintenance Resolved",
    message: `Issue reported for ${maint.assetName} has been fully resolved by tech team.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "RESOLVE_MAINTENANCE",
    targetType: "Maintenance",
    targetId: maint.id,
    details: `Resolved maintenance ticket for ${maint.assetName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(maint);
});

// Audits API
app.get("/api/audits", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.auditCycles);
});

app.post("/api/audits", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { title, departmentId, location, startDate, endDate } = req.body;
  if (!title || !startDate || !endDate) {
    return res.status(400).json({ error: "Audit title, start and end dates are required." });
  }

  const db = loadDatabase();
  
  // Scope assets in that department/location
  const scopedAssets = db.assets.filter(a => {
    const matchesDept = !departmentId || a.departmentId === departmentId;
    const matchesLoc = !location || a.location.toLowerCase().includes(location.toLowerCase());
    return matchesDept && matchesLoc;
  });

  const auditItems = scopedAssets.map(a => {
    const holder = db.users.find(u => u.id === a.currentHolderId);
    return {
      assetId: a.id,
      assetTag: a.tag,
      assetName: a.name,
      category: a.category,
      expectedHolderName: holder ? holder.name : "Unallocated",
      verified: false,
      actualHolderId: a.currentHolderId,
      condition: a.condition,
      status: a.status,
      notes: ""
    };
  });

  const newAudit: AuditCycle = {
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    title,
    auditorId: req.user.id,
    auditorName: req.user.name,
    departmentId: departmentId || null,
    location: location || null,
    startDate,
    endDate,
    status: "Draft",
    items: auditItems,
    createdAt: new Date().toISOString()
  };

  db.auditCycles.push(newAudit);

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CREATE_AUDIT",
    targetType: "AuditCycle",
    targetId: newAudit.id,
    details: `Initiated audit cycle: ${title} with ${auditItems.length} scoped assets.`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newAudit);
});

app.post("/api/audits/:id/start", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const audit = db.auditCycles.find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ error: "Audit not found." });

  audit.status = "In-Progress";
  saveDatabase(db);
  res.json(audit);
});

// Update specific item in audit cycle
app.patch("/api/audits/:id/items", authenticate, (req: any, res) => {
  const { assetId, verified, condition, status, notes, actualHolderId } = req.body;

  const db = loadDatabase();
  const audit = db.auditCycles.find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ error: "Audit cycle not found." });

  const item = audit.items.find(i => i.assetId === assetId);
  if (!item) return res.status(404).json({ error: "Asset item not found in this audit." });

  item.verified = verified;
  if (condition) item.condition = condition;
  if (status) item.status = status;
  if (notes !== undefined) item.notes = notes;
  if (actualHolderId !== undefined) item.actualHolderId = actualHolderId;

  saveDatabase(db);
  res.json(audit);
});

// Close Audit and apply status updates to assets
app.post("/api/audits/:id/close", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied." });
  }

  const db = loadDatabase();
  const audit = db.auditCycles.find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ error: "Audit cycle not found." });

  audit.status = "Completed";
  audit.closedDate = new Date().toISOString();

  // Apply verification changes to active assets inventory
  audit.items.forEach(item => {
    const asset = db.assets.find(a => a.id === item.assetId);
    if (asset) {
      asset.condition = item.condition;
      asset.status = item.status;
      asset.currentHolderId = item.actualHolderId;
      asset.history.push({
        id: `hist-${crypto.randomUUID().slice(0, 8)}`,
        action: "Audit Sync",
        performedBy: req.user.name,
        date: new Date().toISOString(),
        details: `Updated condition to ${item.condition} and status to ${item.status} following verification during audit: "${audit.title}"`
      });
    }
  });

  // Notify creator/auditor
  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: audit.auditorId,
    title: "Audit Completed",
    message: `Audit cycle "${audit.title}" has been successfully verified, closed, and inventory synchronized.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CLOSE_AUDIT",
    targetType: "AuditCycle",
    targetId: audit.id,
    details: `Closed audit cycle and synchronized active asset inventory.`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(audit);
});

// Notifications API
app.get("/api/notifications", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const userNotifications = db.notifications.filter(n => n.userId === req.user.id);
  res.json(userNotifications);
});

app.post("/api/notifications/read-all", authenticate, (req: any, res) => {
  const db = loadDatabase();
  db.notifications.forEach(n => {
    if (n.userId === req.user.id) n.isRead = true;
  });
  saveDatabase(db);
  res.json({ success: true });
});

// Activity logs
app.get("/api/logs", authenticate, (req, res) => {
  const db = loadDatabase();
  res.json(db.logs);
});

// Dashboard KPIs API
app.get("/api/dashboard/kpis", authenticate, (req, res) => {
  const db = loadDatabase();
  
  // 1. Assets Available: All active assets except Lost, Retired, Disposed
  const assetsAvailable = db.assets.filter(a => 
    a.status === AssetStatus.Available || 
    a.status === AssetStatus.Allocated || 
    a.status === AssetStatus.Reserved || 
    a.status === AssetStatus.UnderMaintenance
  ).length;

  // 2. Active Bookings: bookings whose status is Ongoing or Upcoming (Active or Confirmed)
  const activeBookings = db.bookings.filter(b => 
    b.status.toLowerCase() === "ongoing" || 
    b.status.toLowerCase() === "upcoming" ||
    b.status.toLowerCase() === "active" ||
    b.status.toLowerCase() === "confirmed"
  ).length;

  // 3. Maintenance Today: OPEN or IN_PROGRESS tickets created today
  const todayStr = new Date().toISOString().split("T")[0];
  const maintenanceToday = db.maintenances.filter(m => {
    const isToday = m.createdAt && m.createdAt.startsWith(todayStr);
    const isOpenOrInProgress = 
      m.status.toLowerCase() === "pending" || 
      m.status.toLowerCase() === "in-progress" ||
      m.status.toLowerCase() === "in_progress" ||
      m.status.toLowerCase() === "open";
    return isToday && isOpenOrInProgress;
  }).length;

  // 4. Pending Transfers: transfers whose status is PENDING or PENDING_APPROVAL
  const pendingTransfers = db.transfers.filter(t => 
    t.status.toLowerCase() === "pending" || 
    t.status.toLowerCase() === "pending_approval" ||
    t.status.toLowerCase() === "pending-approval"
  ).length;

  res.json({
    assetsAvailable,
    activeBookings,
    maintenanceToday,
    pendingTransfers
  });
});

// Global Search API
app.get("/api/search", authenticate, (req, res) => {
  const query = String(req.query.q || "").toLowerCase();
  const db = loadDatabase();

  if (!query) {
    return res.json({ departments: [], users: [], assets: [], bookings: [] });
  }

  const matchedDepts = db.departments.filter(d => d.name.toLowerCase().includes(query));
  const matchedUsers = db.users.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
  const matchedAssets = db.assets.filter(a => 
    a.name.toLowerCase().includes(query) || 
    a.tag.toLowerCase().includes(query) || 
    a.serialNumber.toLowerCase().includes(query) ||
    (a.category && a.category.toLowerCase().includes(query)) ||
    (a.location && a.location.toLowerCase().includes(query))
  );
  const matchedBookings = db.bookings.filter(b => b.title.toLowerCase().includes(query) || b.assetName.toLowerCase().includes(query) || b.userName.toLowerCase().includes(query));

  res.json({
    departments: matchedDepts,
    users: matchedUsers,
    assets: matchedAssets,
    bookings: matchedBookings
  });
});

// AI Predictions using Gemini (Server Side, Zero exposure to Client)
app.post("/api/gemini/retirement", authenticate, async (req, res) => {
  const { assetId } = req.body;
  if (!assetId) {
    return res.status(400).json({ error: "Asset ID is required for AI processing." });
  }

  const db = loadDatabase();
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) {
    return res.status(404).json({ error: "Asset not found." });
  }

  // Gather asset metadata and maintenance history for rich context
  const maintenanceLogs = db.maintenances.filter(m => m.assetId === assetId);
  const maintHistorySummary = maintenanceLogs.map(m => `[${m.status}] Priority: ${m.priority}, Desc: ${m.description}, Date: ${m.createdAt}`).join("\n");

  const prompt = `You are a professional Enterprise Asset Management Analyst AI working within an ERP system.
Analyze the following asset data and predict its retirement schedule and maintenance risk.

ASSET METADATA:
Name: ${asset.name}
Category: ${asset.category}
Tag: ${asset.tag}
Serial Number: ${asset.serialNumber}
Condition: ${asset.condition}
Purchase Date: ${asset.purchaseDate}
Purchase Cost: $${asset.purchaseCost}
Warranty Period: ${asset.warrantyMonths} months
Current Status: ${asset.status}

MAINTENANCE HISTORY LOGS:
${maintHistorySummary || "No maintenance history has been registered for this asset yet."}

Please output a JSON-structured response with the following keys. Do not include markdown code blocks in your final raw response, return only valid JSON parsing friendly string.
{
  "predictedRetirementDate": "YYYY-MM-DD",
  "remainingLifespanMonths": 24,
  "riskScore": 75, // Risk score out of 100
  "riskAnalysis": "Provide a brief description of key risk elements based on its condition, purchase date, warranty status and history.",
  "recommendedAction": "Actionable instructions (e.g., 'Schedule proactive panel inspection', 'Retire and salvage parts', 'Extend warranty')",
  "estimatedSalvageValue": 150 // predicted salvage value in USD
}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback if key not set yet
      return res.json({
        predictedRetirementDate: "2029-01-15",
        remainingLifespanMonths: 30,
        riskScore: 35,
        riskAnalysis: "Asset is in excellent condition with low maintenance records. Predicted lifetime exceeds remaining warranty period. Minimal operational risks detected.",
        recommendedAction: "Maintain standard scheduled audits. No urgent active service required.",
        estimatedSalvageValue: Math.round(asset.purchaseCost * 0.15)
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const aiOutput = response.text || "";
    try {
      const parsed = JSON.parse(aiOutput.trim());
      res.json(parsed);
    } catch (e) {
      console.error("Failed to parse Gemini output, sending raw text", aiOutput);
      res.status(500).json({ error: "Failed to parse AI output. Try again." });
    }
  } catch (err: any) {
    console.error("Gemini API call failed", err);
    res.status(500).json({ error: `AI Prediction engine offline: ${err.message}` });
  }
});

// Gemini powered discrepancy audit report
app.post("/api/gemini/audit-report", authenticate, async (req, res) => {
  const { auditId } = req.body;
  if (!auditId) {
    return res.status(400).json({ error: "Audit ID is required." });
  }

  const db = loadDatabase();
  const audit = db.auditCycles.find(a => a.id === auditId);
  if (!audit) return res.status(404).json({ error: "Audit cycle not found." });

  // Compile stats
  const total = audit.items.length;
  const verified = audit.items.filter(i => i.verified).length;
  const unverified = total - verified;
  const brokenCount = audit.items.filter(i => i.condition === AssetCondition.Broken || i.condition === AssetCondition.Poor).length;

  const itemsList = audit.items.map(i => `- Asset ${i.assetName} (${i.assetTag}): Verified=${i.verified}, Condition=${i.condition}, Status=${i.status}, Notes=${i.notes || "None"}`).join("\n");

  const prompt = `You are an expert ERP internal security auditor.
Analyze the following completed or in-progress audit cycle details and draft an executive discrepancy audit report.

AUDIT METADATA:
Title: ${audit.title}
Auditor: ${audit.auditorName}
Department Scope: ${audit.departmentId || "All Departments"}
Location Scope: ${audit.location || "All Locations"}
Date Range: ${audit.startDate} to ${audit.endDate}
Status: ${audit.status}

SUMMARY STATISTICS:
Total Scoped Assets: ${total}
Verified Present: ${verified}
Missing / Unverified: ${unverified}
Damaged / Poor Condition: ${brokenCount}

DETAILED AUDIT ITEMS LIST:
${itemsList}

Please draft a professional, corporate, beautifully formatted Markdown audit report containing:
1. Executive Summary
2. Key Discrepancies found (e.g. unverified/missing assets, damaged assets)
3. Internal Policy Compliance Assessment
4. Security & Financial recommendations (including replacement budget estimate or security locker protocols).

Return only the Markdown string. Keep it concise, professional, and impactful.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        report: `### EXECUTIVE AUDIT REPORT: ${audit.title}
        
**1. Executive Summary**
This report outlines the verification status of assets in the ${audit.departmentId || "scoped"} sector. Out of ${total} scoped assets, ${verified} were confirmed present, leaving a discrepancy of ${unverified} unverified items.

**2. Key Discrepancies & Risk Vectors**
- There are ${unverified} items currently untracked, introducing potential security and corporate data leakage risk.
- Poor condition or broken items stand at ${brokenCount} units, indicating potential asset neglect or physical wear-and-tear.

**3. Policy Recommendations**
- Standardize bi-weekly asset checks.
- Establish strict physical barcode checkout gates.
- Transition damaged units into retired inventory immediately to clear operational metrics.`
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const reportMarkdown = response.text || "";
    audit.discrepancyReport = reportMarkdown;
    saveDatabase(db);

    res.json({ report: reportMarkdown });
  } catch (err: any) {
    res.status(500).json({ error: `AI Report engine offline: ${err.message}` });
  }
});

// Admin employee CRUD: Add Employee
app.post("/api/users", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied. Admins or Managers only." });
  }

  const { name, email, role, departmentId, status, password } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required fields." });
  }

  const db = loadDatabase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "An employee with this email already exists." });
  }

  const newUserId = `user-${crypto.randomUUID().slice(0, 8)}`;
  const newUser: User = {
    id: newUserId,
    email,
    name,
    role,
    departmentId: departmentId || null,
    status: status || "Active",
    avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&w=150&q=80`,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.passwords[newUserId] = hashPassword(password || "password");

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "CREATE_EMPLOYEE",
    targetType: "User",
    targetId: newUserId,
    details: `Added new employee ${name} (${role})`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.status(201).json(newUser);
});

// Admin employee CRUD: Edit Employee
app.put("/api/users/:id", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin && req.user.role !== Role.AssetManager) {
    return res.status(403).json({ error: "Access denied. Admins or Managers only." });
  }

  const { name, email, role, departmentId, status, password } = req.body;
  const db = loadDatabase();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "Employee not found." });
  }

  const oldName = user.name;
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (departmentId !== undefined) user.departmentId = departmentId;
  if (status) user.status = status;

  if (password) {
    db.passwords[user.id] = hashPassword(password);
  }

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "UPDATE_EMPLOYEE",
    targetType: "User",
    targetId: user.id,
    details: `Updated employee details for ${oldName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(user);
});

// Admin employee CRUD: Delete Employee
app.delete("/api/users/:id", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin) {
    return res.status(403).json({ error: "Access denied. Administrators only." });
  }

  const db = loadDatabase();
  const userIndex = db.users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Employee not found." });
  }

  const deletedUser = db.users[userIndex];
  db.users.splice(userIndex, 1);
  if (db.passwords[req.params.id]) {
    delete db.passwords[req.params.id];
  }

  // Set assets held by this user back to available
  db.assets.forEach(a => {
    if (a.currentHolderId === req.params.id) {
      a.currentHolderId = null;
      a.status = AssetStatus.Available;
    }
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "DELETE_EMPLOYEE",
    targetType: "User",
    targetId: req.params.id,
    details: `Deleted employee ${deletedUser.name}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, message: `Employee ${deletedUser.name} deleted successfully.` });
});

// Admin Booking approve endpoint
app.post("/api/bookings/:id/approve", authenticate, (req: any, res) => {
  if (req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Insufficient permissions to approve bookings." });
  }

  const db = loadDatabase();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  booking.status = "Upcoming"; // Treated as Approved & Upcoming

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: booking.userId,
    title: "Booking Approved",
    message: `Your booking for ${booking.assetName} ("${booking.title}") has been approved.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "APPROVE_BOOKING",
    targetType: "Booking",
    targetId: booking.id,
    details: `Approved resource booking for ${booking.assetName} by ${booking.userName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(booking);
});

// Admin Booking reject endpoint
app.post("/api/bookings/:id/reject", authenticate, (req: any, res) => {
  if (req.user.role === Role.Employee) {
    return res.status(403).json({ error: "Insufficient permissions to reject bookings." });
  }

  const db = loadDatabase();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  booking.status = "Cancelled";

  db.notifications.push({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    userId: booking.userId,
    title: "Booking Rejected",
    message: `Your booking for ${booking.assetName} ("${booking.title}") has been rejected.`,
    type: "warning",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "REJECT_BOOKING",
    targetType: "Booking",
    targetId: booking.id,
    details: `Rejected resource booking for ${booking.assetName} by ${booking.userName}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(booking);
});

// Global Enterprise Settings
app.get("/api/settings", authenticate, (req, res) => {
  const db = loadDatabase();
  const settings = db.settings || {
    companyName: "AssetFlow Solutions Inc.",
    currency: "USD",
    timezone: "UTC-7",
    fiscalYearStart: "January",
    allowSelfAllocation: true,
    requireBookingApproval: true,
    maintenanceAutoRouting: true,
    categories: ["Laptop", "Monitor", "Server", "Mobile", "Vehicle", "MeetingRoom", "Desk", "Other"],
    locations: ["SF Head Office", "NYC Branch", "London Depot", "Tokyo Tech Hub", "Remote"]
  };
  res.json(settings);
});

app.post("/api/settings", authenticate, (req: any, res) => {
  if (req.user.role !== Role.Admin) {
    return res.status(403).json({ error: "Admins only." });
  }

  const db = loadDatabase();
  db.settings = { ...db.settings, ...req.body };

  db.logs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    userName: req.user.name,
    action: "UPDATE_SETTINGS",
    targetType: "SystemSettings",
    targetId: "global",
    details: "Updated global corporate workspace configuration",
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json(db.settings);
});

// Configure Vite or Serve static bundle
async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AssetFlow Enterprise ERP running on http://localhost:${PORT}`);
  });
}

start();
