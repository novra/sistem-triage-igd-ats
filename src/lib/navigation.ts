import type { LucideIcon } from "lucide-react";
import { BookOpen, ClipboardList, FileText, Database, Users } from "lucide-react";

export type ViewId = "guide" | "triage" | "narrative" | "records" | "users";

export type NavItem = {
  id: ViewId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { id: "guide", label: "Guidance", shortLabel: "Panduan", description: "Panduan alur ATS", icon: BookOpen },
  { id: "triage", label: "Form Utama", shortLabel: "Form", description: "Input dan analisis triase AI", icon: ClipboardList },
  { id: "narrative", label: "Pengurai Narasi", shortLabel: "Narasi", description: "Pilah narasi klinis", icon: FileText },
  { id: "records", label: "Daftar Rekam", shortLabel: "Rekam", description: "Lihat dan kelola data tersimpan", icon: Database },
  { id: "users", label: "Kelola Pengguna", shortLabel: "Pengguna", description: "Manajemen akun tim", icon: Users, adminOnly: true },
];
