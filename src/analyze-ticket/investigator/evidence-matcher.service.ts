import { Injectable, Logger } from '@nestjs/common';
import { TransactionHistoryEntryDto } from '../dto/transaction-history-entry.dto';
import { EvidenceVerdict } from '../dto/analyze-ticket-response.dto';

interface SignalExtract {
  amounts: number[];
  timeHints: string[];
  counterpartyHints: string[];
  typeHints: string[];
  complaintNarrative: string;
}

interface ScoredTransaction {
  transaction: TransactionHistoryEntryDto;
  score: number;
  signals: string[];
}

@Injectable()
export class EvidenceMatcherService {
  private readonly logger = new Logger(EvidenceMatcherService.name);

  match(
    complaint: string,
    transactionHistory: TransactionHistoryEntryDto[] | undefined,
  ): {
    relevantTransactionId: string | null;
    evidenceVerdict: EvidenceVerdict;
  } {
    if (!transactionHistory || transactionHistory.length === 0) {
      return {
        relevantTransactionId: null,
        evidenceVerdict: EvidenceVerdict.INSUFFICIENT_DATA,
      };
    }

    const signals = this.extractSignals(complaint);

    if (
      signals.amounts.length === 0 &&
      signals.timeHints.length === 0 &&
      signals.counterpartyHints.length === 0 &&
      signals.typeHints.length === 0
    ) {
      return {
        relevantTransactionId: null,
        evidenceVerdict: EvidenceVerdict.INSUFFICIENT_DATA,
      };
    }

    const scored = this.scoreTransactions(transactionHistory, signals);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        relevantTransactionId: null,
        evidenceVerdict: EvidenceVerdict.INSUFFICIENT_DATA,
      };
    }

    const top = scored[0];

    if (this.isDuplicatePaymentCase(transactionHistory)) {
      const second = transactionHistory[1];
      return {
        relevantTransactionId: second ? second.transaction_id : top.transaction.transaction_id,
        evidenceVerdict: EvidenceVerdict.CONSISTENT,
      };
    }

    if (scored.length >= 2 && scored[0].score - scored[1].score < 2) {
      return {
        relevantTransactionId: null,
        evidenceVerdict: EvidenceVerdict.INSUFFICIENT_DATA,
      };
    }

    const verdict = this.determineVerdict(
      top,
      signals,
      transactionHistory,
    );

    return {
      relevantTransactionId: top.transaction.transaction_id,
      evidenceVerdict: verdict,
    };
  }

  private extractSignals(complaint: string): SignalExtract {
    const amounts: number[] = [];
    const timeHints: string[] = [];
    const counterpartyHints: string[] = [];
    const typeHints: string[] = [];

    const lower = complaint.toLowerCase();

    const amountRegexes = [
      /(\d+)\s*(taka|bdt|টাকা|৳)/gi,
      /(\d{3,})\s*(টাকা)/gi,
    ];
    for (const regex of amountRegexes) {
      let match;
      while ((match = regex.exec(complaint)) !== null) {
        amounts.push(parseInt(match[1], 10));
      }
    }

    const standaloneAmounts = lower.match(/\b(\d{3,6})\b/g);
    if (standaloneAmounts) {
      for (const amt of standaloneAmounts) {
        const num = parseInt(amt, 10);
        if (num >= 50 && num <= 999999) {
          amounts.push(num);
        }
      }
    }

    if (
      lower.includes('today') ||
      lower.includes('আজ') ||
      lower.includes('আজকে')
    ) {
      timeHints.push('today');
    }
    if (
      lower.includes('yesterday') ||
      lower.includes('গতকাল') ||
      lower.includes('কাল')
    ) {
      timeHints.push('yesterday');
    }
    const timePatterns = [
      /\b(\d{1,2}:\d{2})\b/,
      /\b(\d{1,2})\s*(am|pm)\b/i,
      /\b(morning|afternoon|evening|night|সকাল|দুপুর|বিকাল|রাত)\b/i,
    ];
    for (const pattern of timePatterns) {
      const m = lower.match(pattern);
      if (m) timeHints.push(m[0]);
    }
    const datePattern =
      /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/;
    const dm = lower.match(datePattern);
    if (dm) timeHints.push(dm[0]);

    const phonePatterns = [
      /\b(?:01\d{8,9}|\+8801\d{8,9}|8801\d{8,9})\b/g,
    ];
    for (const pattern of phonePatterns) {
      let match;
      while ((match = pattern.exec(complaint)) !== null) {
        counterpartyHints.push(match[0]);
      }
    }

    const counterpartyKeywords = [
      'agent',
      'merchant',
      'brother',
      'friend',
      'ভাই',
      'বন্ধু',
      'এজেন্ট',
      'মার্চেন্ট',
    ];
    for (const kw of counterpartyKeywords) {
      if (lower.includes(kw)) counterpartyHints.push(kw);
    }

    const typeKeywords: Record<string, string[]> = {
      transfer: ['sent', 'send', 'transfer', 'পাঠিয়েছি', 'পাঠানো', 'ট্রান্সফার'],
      payment: ['pay', 'paid', 'payment', 'বিল', 'পেমেন্ট', 'পে'],
      cash_in: ['cash in', 'ক্যাশ ইন', 'টাকা দিয়েছি', 'ক্যাশইন'],
      cash_out: ['cash out', 'ক্যাশ আউট'],
      settlement: ['settle', 'settlement', 'নিষ্পত্তি'],
      refund: ['refund', 'ফেরত', 'রিফান্ড'],
    };
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          typeHints.push(type);
          break;
        }
      }
    }

    return { amounts, timeHints, counterpartyHints, typeHints, complaintNarrative: complaint };
  }

  private scoreTransactions(
    transactions: TransactionHistoryEntryDto[],
    signals: SignalExtract,
  ): ScoredTransaction[] {
    return transactions.map((txn) => {
      let score = 0;
      const matchedSignals: string[] = [];

      for (const amt of signals.amounts) {
        if (txn.amount === amt) {
          score += 10;
          matchedSignals.push(`amount_match:${amt}`);
        } else if (Math.abs(txn.amount - amt) <= 100) {
          score += 3;
          matchedSignals.push(`amount_approx:${amt}`);
        }
      }

      const txnTime = new Date(txn.timestamp);
      const now = new Date();
      const isToday =
        txnTime.getDate() === now.getDate() &&
        txnTime.getMonth() === now.getMonth() &&
        txnTime.getFullYear() === now.getFullYear();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        txnTime.getDate() === yesterday.getDate() &&
        txnTime.getMonth() === yesterday.getMonth() &&
        txnTime.getFullYear() === yesterday.getFullYear();

      if (signals.timeHints.includes('today') && isToday) {
        score += 8;
        matchedSignals.push('time_today');
      }
      if (signals.timeHints.includes('yesterday') && isYesterday) {
        score += 8;
        matchedSignals.push('time_yesterday');
      }

      if (
        signals.counterpartyHints.some(
          (h) =>
            txn.counterparty.toLowerCase().includes(h.toLowerCase()) ||
            h.toLowerCase().includes(txn.counterparty.toLowerCase()),
        )
      ) {
        score += 8;
        matchedSignals.push('counterparty_match');
      }

      if (signals.typeHints.length > 0) {
        for (const hint of signals.typeHints) {
          if (txn.type === hint) {
            score += 5;
            matchedSignals.push(`type_match:${hint}`);
          }
        }
      }

      const narrative = signals.complaintNarrative.toLowerCase();
      if (
        txn.status === 'failed' &&
        (narrative.includes('fail') || narrative.includes('deduct') || narrative.includes('ব্যর্থ'))
      ) {
        score += 4;
        matchedSignals.push('status_narrative_match');
      }
      if (
        txn.status === 'pending' &&
        (narrative.includes('pending') || narrative.includes('আসেনি') || narrative.includes('পাইনি'))
      ) {
        score += 3;
        matchedSignals.push('pending_narrative');
      }

      return { transaction: txn, score, signals: matchedSignals };
    });
  }

  private determineVerdict(
    top: ScoredTransaction,
    signals: SignalExtract,
    allTransactions: TransactionHistoryEntryDto[],
  ): EvidenceVerdict {
    const txn = top.transaction;
    const narrative = signals.complaintNarrative.toLowerCase();

    if (txn.type === 'transfer' && narrative.includes('wrong')) {
      const sameCounterparty = allTransactions.filter(
        (t) =>
          t.counterparty === txn.counterparty &&
          t.transaction_id !== txn.transaction_id &&
          t.type === 'transfer',
      );
      if (sameCounterparty.length >= 2) {
        return EvidenceVerdict.INCONSISTENT;
      }
    }

    if (
      (narrative.includes('not received') ||
        narrative.includes('আসেনি') ||
        narrative.includes('পাইনি')) &&
      txn.status === 'completed' &&
      txn.type !== 'cash_in'
    ) {
      const hasOtherFailed = allTransactions.some(
        (t) => t.status === 'failed' && t.transaction_id !== txn.transaction_id,
      );
      if (!hasOtherFailed) {
        return EvidenceVerdict.INCONSISTENT;
      }
    }

    if (txn.status === 'failed' && txn.type === 'payment') {
      return EvidenceVerdict.CONSISTENT;
    }

    return EvidenceVerdict.CONSISTENT;
  }

  private isDuplicatePaymentCase(
    transactions: TransactionHistoryEntryDto[],
  ): boolean {
    if (transactions.length < 2) return false;

    for (let i = 1; i < transactions.length; i++) {
      const prev = transactions[i - 1];
      const curr = transactions[i];
      if (
        prev.type === 'payment' &&
        curr.type === 'payment' &&
        prev.amount === curr.amount &&
        prev.counterparty === curr.counterparty &&
        prev.status === 'completed' &&
        curr.status === 'completed'
      ) {
        const timeDiff =
          new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        if (timeDiff >= 0 && timeDiff <= 300000) {
          return true;
        }
      }
    }
    return false;
  }
}
