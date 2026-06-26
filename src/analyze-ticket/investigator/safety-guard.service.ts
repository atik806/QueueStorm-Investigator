import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SafetyGuardService {
  private readonly logger = new Logger(SafetyGuardService.name);

  private readonly unsafeRequestPattern: RegExp =
    /\b(?:provide|share|send|enter|confirm|give|tell)\s+(?:your\s+)?(?:pin|otp|password|cvv|card\s*(?:number)?|credit\s*card)\b/gi;

  private readonly refundPatterns: RegExp[] = [
    /\bwe\s+(?:will|have|are\s+going\s+to)\s+(?:refund|reverse|unblock)\b/gi,
    /\byour\s+(?:money|payment|account)\s+(?:has\s+been|is)\s+(?:refunded|reversed|unblocked)\b/gi,
    /\b(?:refund|reversal|unblock)(?:\s+has)?\s+(?:has\s+been\s+)?(?:initiated|processed|completed)\b/gi,
    /\byou\s+will\s+receive\s+(?:a\s+)?(?:refund|reversal)\b/gi,
  ];

  private readonly thirdPartyPatterns: RegExp[] = [
    /\b(?:call|contact|reach|message|text)\s+(?:us\s+at|this\s+number|me\s+at)\s*[+\d\s()-]{7,}\b/gi,
    /\b(?:call|contact|reach|message)\s+(?:us\s+on|me\s+on)\s*(?:whatsapp|telegram|viber|imo|messenger)\b/gi,
    /\bhttps?:\/\/[^\s]+\b/gi,
  ];

  private readonly safeRefundLine =
    'Any eligible amount will be returned through official channels.';
  private readonly safeReviewLine =
    'Our team will review and confirm next steps through official channels.';
  private readonly safeContactLine =
    'Please contact us through official in-app support or our verified hotline.';
  private readonly pinSafetyLine =
    'Please do not share your PIN, OTP, password, or card number with anyone, including anyone claiming to represent us.';

  sanitize(text: string): string {
    let result = text;

    result = this.stripUnsafeRequests(result);
    result = this.stripUnauthorizedRefundPromises(result);
    result = this.stripThirdPartyDirectives(result);
    result = this.ensurePinSafetyLine(result);

    return result;
  }

  private stripUnsafeRequests(text: string): string {
    const lines = text.split(/(?<=[.!?])\s+/);
    const filtered = lines.map((line) => {
      const lower = line.toLowerCase().trim();

      const isNegated =
        /(?:do|does|did|will|would|should|could|must)\s+not\s+/i.test(line) ||
        /never\s+/i.test(line) ||
        /please\s+do\s+not\s+/i.test(line);

      if (isNegated && /pin|otp|password|cvv|card\s*number/i.test(lower)) {
        return line;
      }

      let sanitized = line;
      this.unsafeRequestPattern.lastIndex = 0;
      if (this.unsafeRequestPattern.test(sanitized)) {
        this.logger.warn('SafetyGuard: detected credential request pattern, sanitizing');
        sanitized = sanitized.replace(this.unsafeRequestPattern, '');
      }

      return sanitized;
    });

    return filtered.join(' ');
  }

  private stripUnauthorizedRefundPromises(text: string): string {
    for (const pattern of this.refundPatterns) {
      if (pattern.test(text)) {
        this.logger.warn('SafetyGuard: detected unauthorized refund promise, sanitizing');
        text = text.replace(pattern, this.safeRefundLine);
      }
    }
    return text;
  }

  private stripThirdPartyDirectives(text: string): string {
    for (const pattern of this.thirdPartyPatterns) {
      if (pattern.test(text)) {
        this.logger.warn('SafetyGuard: detected third-party directive, sanitizing');
        text = text.replace(pattern, this.safeContactLine);
      }
    }
    return text;
  }

  private ensurePinSafetyLine(text: string): string {
    const trimmed = text.trim();
    if (trimmed.includes(this.pinSafetyLine)) {
      return trimmed;
    }

    const hasAnySafetyLine =
      /please\s+do\s+not\s+share\s+(?:your\s+)?(?:pin|otp|password|card\s+number|these)/i.test(trimmed) ||
      /do\s+not\s+share\s+(?:your\s+)?(?:pin|otp|password|card\s+number|these)/i.test(trimmed) ||
      /(?:পিন|ওটিপি)\s+শেয়ার\s+করবেন\s+না/i.test(trimmed);

    if (hasAnySafetyLine) {
      return trimmed;
    }

    return trimmed + ' ' + this.pinSafetyLine;
  }
}
