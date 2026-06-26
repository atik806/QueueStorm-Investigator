import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaseType, EvidenceVerdict, Severity, Department } from '../dto/analyze-ticket-response.dto';

@Injectable()
export class RouterService {
  private readonly highValueThreshold: number;

  constructor(private configService: ConfigService) {
    this.highValueThreshold = this.configService.get<number>('HIGH_VALUE_THRESHOLD_BDT', 50000);
  }

  route(
    caseType: CaseType,
    evidenceVerdict: EvidenceVerdict,
    amount?: number,
    userType?: string,
  ): {
    department: Department;
    severity: Severity;
    humanReviewRequired: boolean;
  } {
    let department: Department;
    let severity: Severity;
    let humanReviewRequired = false;

    switch (caseType) {
      case CaseType.PHISHING_OR_SOCIAL_ENGINEERING:
        department = Department.FRAUD_RISK;
        severity = Severity.CRITICAL;
        humanReviewRequired = true;
        break;

      case CaseType.WRONG_TRANSFER:
        department = Department.DISPUTE_RESOLUTION;
        if (evidenceVerdict === EvidenceVerdict.CONSISTENT) {
          severity = Severity.HIGH;
        } else if (evidenceVerdict === EvidenceVerdict.INCONSISTENT) {
          severity = Severity.MEDIUM;
        } else {
          severity = Severity.MEDIUM;
        }
        humanReviewRequired = true;
        break;

      case CaseType.PAYMENT_FAILED:
        department = Department.PAYMENTS_OPS;
        severity = Severity.HIGH;
        humanReviewRequired = false;
        break;

      case CaseType.DUPLICATE_PAYMENT:
        department = Department.PAYMENTS_OPS;
        severity = Severity.HIGH;
        humanReviewRequired = true;
        break;

      case CaseType.MERCHANT_SETTLEMENT_DELAY:
        department = Department.MERCHANT_OPERATIONS;
        severity = Severity.MEDIUM;
        humanReviewRequired = false;
        break;

      case CaseType.AGENT_CASH_IN_ISSUE:
        department = Department.AGENT_OPERATIONS;
        severity = Severity.HIGH;
        humanReviewRequired = true;
        break;

      case CaseType.REFUND_REQUEST:
        department = Department.CUSTOMER_SUPPORT;
        severity = Severity.LOW;
        humanReviewRequired = false;
        break;

      case CaseType.OTHER:
      default:
        if (userType === 'merchant') {
          department = Department.MERCHANT_OPERATIONS;
        } else {
          department = Department.CUSTOMER_SUPPORT;
        }
        severity = Severity.LOW;
        humanReviewRequired = false;
        break;
    }

    if (evidenceVerdict === EvidenceVerdict.INCONSISTENT) {
      humanReviewRequired = true;
    }

    if (amount && amount >= this.highValueThreshold) {
      if (severity === Severity.LOW || severity === Severity.MEDIUM) {
        severity = Severity.HIGH;
      }
      humanReviewRequired = true;
    }

    return { department, severity, humanReviewRequired };
  }
}
