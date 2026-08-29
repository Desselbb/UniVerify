export type Role = 'system_admin' | 'university_admin' | 'graduate' | 'verifier';

export interface User {
  id: number;
  uuid: string;
  email: string;
  fullName: string;
  role: Role;
  institutionId: number | null;
  mfaEnabled: boolean;
}

export interface Institution {
  id: number;
  name: string;
  registrationCode: string;
  contactEmail?: string | null;
  isActive: boolean;
  onChainId?: number | null;
}

export interface AuditLogEntry {
  id: number;
  userId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface Credential {
  id: number;
  hash: string;
  studentName: string;
  studentId: string;
  degree: string;
  program: string | null;
  honors: string | null;
  graduationDate: string;
  institutionId: number;
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  blockchainTxHash: string | null;
  blockNumber: string | number | null;
  institution?: Institution | null;
}

export interface OnChainRecord {
  exists: boolean;
  revoked: boolean;
  issuedAt: number;
  institutionId: number;
  metadataURI: string;
  issuer: string;
}

export type VerificationStatus = 'valid' | 'revoked' | 'not_found';

export interface VerificationResult {
  hash: string;
  status: VerificationStatus;
  onChain: OnChainRecord | null;
  credential: {
    studentName: string;
    degree: string;
    program: string | null;
    honors: string | null;
    graduationDate: string;
    institution: string | null;
    issuedAt: string;
    revokedAt: string | null;
    revocationReason: string | null;
    blockchainTxHash: string | null;
  } | null;
}

export interface BulkVerificationResult extends VerificationResult {
  fileName: string;
}

export interface ShareLink {
  url: string;
  qrCodeDataUrl: string;
}
