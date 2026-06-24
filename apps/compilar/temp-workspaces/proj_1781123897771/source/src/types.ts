export interface ProjectSummary {
  id: string;
  name: string;
  technology: 'Static' | 'React_Vite' | 'Vue_Vite' | 'Angular' | 'NextJS' | 'NodeJS' | 'PHP' | 'Unknown';
  sizeBytes: number;
  fileCount: number;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'none';
  buildCommand: string;
  outputFolder: string;
  compatibilityScore: number; // 0 - 100
  correctionsPending: number;
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error_fixable' | 'error_critical' | 'incompatibility';

export interface DiagnosticIssue {
  id: string;
  file: string;
  line?: number;
  severity: DiagnosticSeverity;
  title: string;
  description: string;
  codeSnippet?: string;
  canAutoFix: boolean;
  fixed?: boolean;
}

export interface RepairAction {
  id: string;
  file: string;
  issueTitle: string;
  changeProposed: string;
  applied: boolean;
  error?: string;
}

export interface DatabaseConfig {
  host: string;
  database: string;
  user: string;
  pass: string;
  port?: string;
  type: 'PHP_PDO' | 'PHP_MYSQLI' | 'Node_ENV' | 'Generic_ENV';
}

export interface CompilationLog {
  status: 'idle' | 'installing' | 'compiling' | 'success' | 'failed';
  stdout: string;
  stderr: string;
  errorMsg?: string;
}

export interface DeploymentConfig {
  deployType: 'root' | 'subfolder';
  subfolderPath: string; // e.g. "/mi-app"
  databaseConfigured: boolean;
  databaseParams?: DatabaseConfig;
}

export interface FileItem {
  name: string;
  path: string; // relative to project root
  type: 'file' | 'directory';
  size?: number;
  children?: FileItem[];
}
