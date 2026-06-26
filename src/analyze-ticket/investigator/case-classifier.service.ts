import { Injectable } from '@nestjs/common';
import { EvidenceVerdict, CaseType } from '../dto/analyze-ticket-response.dto';

@Injectable()
export class CaseClassifierService {
  classify(
    complaint: string,
    evidenceVerdict: EvidenceVerdict,
    relevantTransactionId: string | null,
    transactionHistory?: { type: string; amount: number; counterparty: string; status: string; timestamp: string }[],
    userType?: string,
  ): CaseType {
    const lower = complaint.toLowerCase();

    if (
      this.hasPhishingSignals(lower)
    ) {
      return CaseType.PHISHING_OR_SOCIAL_ENGINEERING;
    }

    if (
      this.hasDuplicatePaymentSignals(lower, transactionHistory)
    ) {
      return CaseType.DUPLICATE_PAYMENT;
    }

    if (
      !lower.includes('refund') &&
      (
        (lower.includes('wrong') &&
          (lower.includes('sent') || lower.includes('send') || lower.includes('transfer') ||
           lower.includes('পাঠিয়েছি') || lower.includes('ভুল'))) ||
        (lower.includes('sent') && lower.includes('but') &&
          (lower.includes('get') || lower.includes('received') || lower.includes('পাইনি') || lower.includes('আসেনি')))
      )
    ) {
      return CaseType.WRONG_TRANSFER;
    }

    if (
      (lower.includes('fail') || lower.includes('deduct') || lower.includes('ব্যর্থ') ||
       lower.includes('কাটা')) &&
      (lower.includes('pay') || lower.includes('payment') || lower.includes('recharge') ||
       lower.includes('বিল') || lower.includes('পেমেন্ট'))
    ) {
      return CaseType.PAYMENT_FAILED;
    }

    if (
      (lower.includes('cash in') || lower.includes('ক্যাশ ইন') || lower.includes('ক্যাশইন') ||
       lower.includes('টাকা দিয়েছি')) &&
      (lower.includes('agent') || lower.includes('এজেন্ট') || lower.includes('আসেনি') ||
       lower.includes('পাইনি'))
    ) {
      return CaseType.AGENT_CASH_IN_ISSUE;
    }

    if (
      userType === 'merchant' ||
      lower.includes('i am a merchant') ||
      lower.includes('আমি একজন মার্চেন্ট') ||
      lower.includes('settlement') ||
      lower.includes('নিষ্পত্তি') ||
      lower.includes('not settled')
    ) {
      return CaseType.MERCHANT_SETTLEMENT_DELAY;
    }

    if (
      lower.includes('refund') || lower.includes('ফেরত') || lower.includes('রিফান্ড') ||
      lower.includes('change') || lower.includes('return') ||
      (lower.includes('money back') || lower.includes('টাকা ফেরত'))
    ) {
      return CaseType.REFUND_REQUEST;
    }

    return CaseType.OTHER;
  }

  private hasPhishingSignals(lower: string): boolean {
    const phishingKeywords = [
      'pin', 'otp', 'password', 'cvv', 'card number',
      'পিন', 'ওটিপি',
      'call', 'called', 'suspicious', 'scam', 'phishing',
      'blocked if', 'ask for', 'asking for',
      'is this real', 'identity',
    ];
    const matchCount = phishingKeywords.filter((k) => lower.includes(k)).length;
    if (
      matchCount >= 2 ||
      (lower.includes('pin') && lower.includes('call')) ||
      (lower.includes('otp') && lower.includes('call')) ||
      (lower.includes('পিন') || lower.includes('ওটিপি'))
    ) {
      return true;
    }
    return false;
  }

  private hasDuplicatePaymentSignals(
    lower: string,
    transactionHistory?: { type: string; amount: number; counterparty: string; status: string; timestamp: string }[],
  ): boolean {
    if (!transactionHistory || transactionHistory.length < 2) return false;

    const paymentTxs = transactionHistory.filter((t) => t.type === 'payment' && t.status === 'completed');
    if (paymentTxs.length < 2) return false;

    for (let i = 1; i < paymentTxs.length; i++) {
      const prev = paymentTxs[i - 1];
      const curr = paymentTxs[i];
      if (
        prev.amount === curr.amount &&
        prev.counterparty === curr.counterparty
      ) {
        const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        if (diff >= 0 && diff <= 300000) {
          return true;
        }
      }
    }
    return false;
  }
}
