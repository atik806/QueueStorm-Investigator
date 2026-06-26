export enum EvidenceVerdict {
  CONSISTENT = 'consistent',
  INCONSISTENT = 'inconsistent',
  INSUFFICIENT_DATA = 'insufficient_data',
}

export enum CaseType {
  WRONG_TRANSFER = 'wrong_transfer',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_REQUEST = 'refund_request',
  DUPLICATE_PAYMENT = 'duplicate_payment',
  MERCHANT_SETTLEMENT_DELAY = 'merchant_settlement_delay',
  AGENT_CASH_IN_ISSUE = 'agent_cash_in_issue',
  PHISHING_OR_SOCIAL_ENGINEERING = 'phishing_or_social_engineering',
  OTHER = 'other',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum Department {
  CUSTOMER_SUPPORT = 'customer_support',
  DISPUTE_RESOLUTION = 'dispute_resolution',
  PAYMENTS_OPS = 'payments_ops',
  MERCHANT_OPERATIONS = 'merchant_operations',
  AGENT_OPERATIONS = 'agent_operations',
  FRAUD_RISK = 'fraud_risk',
}

export class AnalyzeTicketResponseDto {
  ticket_id: string;
  relevant_transaction_id: string | null;
  evidence_verdict: EvidenceVerdict;
  case_type: CaseType;
  severity: Severity;
  department: Department;
  agent_summary: string;
  recommended_next_action: string;
  customer_reply: string;
  human_review_required: boolean;
  confidence: number;
  reason_codes: string[];
}
