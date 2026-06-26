import { Injectable, Logger } from '@nestjs/common';
import { AnalyzeTicketRequestDto, Language } from './dto/analyze-ticket-request.dto';
import { AnalyzeTicketResponseDto, CaseType, EvidenceVerdict, Department, Severity } from './dto/analyze-ticket-response.dto';
import { EvidenceMatcherService } from './investigator/evidence-matcher.service';
import { CaseClassifierService } from './investigator/case-classifier.service';
import { RouterService } from './investigator/router.service';
import { SafetyGuardService } from './investigator/safety-guard.service';
import { LlmReasonerService } from './investigator/llm-reasoner.service';
import { ReplyTemplates } from './investigator/reply-templates';

@Injectable()
export class AnalyzeTicketService {
  private readonly logger = new Logger(AnalyzeTicketService.name);

  constructor(
    private readonly evidenceMatcher: EvidenceMatcherService,
    private readonly caseClassifier: CaseClassifierService,
    private readonly router: RouterService,
    private readonly safetyGuard: SafetyGuardService,
    private readonly llmReasoner: LlmReasonerService,
  ) {}

  async analyze(dto: AnalyzeTicketRequestDto): Promise<AnalyzeTicketResponseDto> {
    const complaint = this.sanitizeInput(dto.complaint);
    const transactionHistory = dto.transaction_history || [];

    const { relevantTransactionId, evidenceVerdict } = this.evidenceMatcher.match(
      complaint,
      transactionHistory,
    );

    const caseType = this.caseClassifier.classify(
      complaint,
      evidenceVerdict,
      relevantTransactionId,
      transactionHistory,
      dto.user_type,
    );

    const matchedTx = relevantTransactionId
      ? transactionHistory.find((t) => t.transaction_id === relevantTransactionId)
      : undefined;

    const { department, severity, humanReviewRequired } = this.router.route(
      caseType,
      evidenceVerdict,
      matchedTx?.amount,
      dto.user_type,
    );

    const lang = dto.language || Language.EN;

    const llmContent = await this.llmReasoner.generateContent({
      caseType,
      evidenceVerdict,
      relevantTransactionId,
      department,
      severity,
      humanReviewRequired,
      complaint,
      language: lang,
      amount: matchedTx?.amount,
      counterparty: matchedTx?.counterparty,
    });

    let agentSummary: string;
    let recommendedNextAction: string;
    let customerReply: string;

    if (llmContent) {
      agentSummary = llmContent.agentSummary;
      recommendedNextAction = llmContent.recommendedNextAction;
      customerReply = llmContent.customerReply;
    } else {
      agentSummary = ReplyTemplates.agentSummary(
        caseType,
        relevantTransactionId,
        evidenceVerdict,
        complaint,
        matchedTx?.amount,
        matchedTx?.counterparty,
      );
      recommendedNextAction = ReplyTemplates.recommendedNextAction(
        caseType,
        relevantTransactionId,
        department,
      );
      if (lang === Language.BN) {
        customerReply = ReplyTemplates.customerReplyBn(
          caseType,
          relevantTransactionId,
          department,
        );
      } else {
        customerReply = ReplyTemplates.customerReplyEn(
          caseType,
          relevantTransactionId,
          department,
        );
      }
    }

    customerReply = this.safetyGuard.sanitize(customerReply);

    const reasonCodes = this.buildReasonCodes(caseType, evidenceVerdict, relevantTransactionId);

    return {
      ticket_id: dto.ticket_id,
      relevant_transaction_id: relevantTransactionId,
      evidence_verdict: evidenceVerdict,
      case_type: caseType,
      severity,
      department,
      agent_summary: agentSummary,
      recommended_next_action: recommendedNextAction,
      customer_reply: customerReply,
      human_review_required: humanReviewRequired,
      confidence: this.calculateConfidence(evidenceVerdict, caseType, relevantTransactionId),
      reason_codes: reasonCodes,
    };
  }

  private sanitizeInput(complaint: string): string {
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts?)/gi,
      /system:\s*/gi,
      /you\s+are\s+now\s+/gi,
      /act\s+as\s+/gi,
      /disregard\s+(the\s+)?rules/gi,
      /forget\s+(all\s+)?(previous\s+)?(instructions|rules)/gi,
      /new\s+instructions?:/gi,
      /override\s+(all\s+)?(previous\s+)?(instructions|rules)/gi,
    ];

    let sanitized = complaint;
    let injectionDetected = false;

    for (const pattern of injectionPatterns) {
      if (pattern.test(sanitized)) {
        injectionDetected = true;
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    }

    if (injectionDetected) {
      this.logger.warn('Prompt injection attempt detected and neutralized in complaint');
    }

    return sanitized.trim();
  }

  private buildReasonCodes(
    caseType: CaseType,
    evidenceVerdict: EvidenceVerdict,
    relevantTransactionId: string | null,
  ): string[] {
    const codes: string[] = [];

    switch (caseType) {
      case CaseType.WRONG_TRANSFER:
        codes.push('wrong_transfer');
        break;
      case CaseType.PAYMENT_FAILED:
        codes.push('payment_failed');
        break;
      case CaseType.REFUND_REQUEST:
        codes.push('refund_request');
        break;
      case CaseType.DUPLICATE_PAYMENT:
        codes.push('duplicate_payment');
        break;
      case CaseType.MERCHANT_SETTLEMENT_DELAY:
        codes.push('merchant_settlement');
        break;
      case CaseType.AGENT_CASH_IN_ISSUE:
        codes.push('agent_cash_in');
        break;
      case CaseType.PHISHING_OR_SOCIAL_ENGINEERING:
        codes.push('phishing');
        codes.push('credential_protection');
        break;
      case CaseType.OTHER:
        codes.push('needs_clarification');
        break;
    }

    if (relevantTransactionId) {
      codes.push('transaction_match');
    }

    if (evidenceVerdict === EvidenceVerdict.INCONSISTENT) {
      codes.push('evidence_inconsistent');
    } else if (evidenceVerdict === EvidenceVerdict.INSUFFICIENT_DATA) {
      codes.push('insufficient_evidence');
    }

    return codes;
  }

  private calculateConfidence(
    evidenceVerdict: EvidenceVerdict,
    caseType: CaseType,
    relevantTransactionId: string | null,
  ): number {
    if (caseType === CaseType.PHISHING_OR_SOCIAL_ENGINEERING) return 0.95;
    if (caseType === CaseType.DUPLICATE_PAYMENT) return 0.93;
    if (caseType === CaseType.MERCHANT_SETTLEMENT_DELAY) return 0.92;
    if (evidenceVerdict === EvidenceVerdict.INCONSISTENT) return 0.75;
    if (caseType === CaseType.WRONG_TRANSFER && relevantTransactionId) return 0.9;
    if (caseType === CaseType.PAYMENT_FAILED) return 0.9;
    if (caseType === CaseType.AGENT_CASH_IN_ISSUE) return 0.88;
    if (caseType === CaseType.REFUND_REQUEST) return 0.85;
    if (evidenceVerdict === EvidenceVerdict.INSUFFICIENT_DATA) return 0.6;
    return 0.8;
  }
}
