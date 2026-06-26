export class ReplyTemplates {
  static agentSummary(
    caseType: string,
    relevantTransactionId: string | null,
    evidenceVerdict: string,
    complaint: string,
    amount?: number,
    counterparty?: string,
  ): string {
    const txnPart = relevantTransactionId
      ? ` transaction ${relevantTransactionId}`
      : '';
    const amountPart = amount ? ` ${amount} BDT` : '';

    if (caseType === 'wrong_transfer') {
      if (relevantTransactionId) {
        return `Customer reports sending${amountPart} via${txnPart} to ${counterparty || 'a recipient'}, which they now believe was the wrong recipient.${evidenceVerdict === 'inconsistent' ? ' However, transaction history shows an established pattern with this recipient.' : ''}`;
      }
      return `Customer reports sending to the wrong recipient but no matching transaction found.`;
    }

    if (caseType === 'payment_failed') {
      return `Customer attempted a${amountPart} payment${txnPart} which failed, but reports balance was deducted. Requires payments operations investigation.`;
    }

    if (caseType === 'refund_request') {
      return `Customer requests refund${amountPart} for${txnPart} due to change of mind. Not a service failure.`;
    }

    if (caseType === 'duplicate_payment') {
      return `Customer reports duplicate payment. Two identical${amountPart} payments${txnPart ? ' (' + relevantTransactionId + ' and prior)' : ''} were completed in close succession. The later one is likely the duplicate.`;
    }

    if (caseType === 'merchant_settlement_delay') {
      return `Merchant reports${amountPart} settlement${txnPart} is delayed beyond the standard window. Settlement status is pending.`;
    }

    if (caseType === 'agent_cash_in_issue') {
      return `Customer reports${amountPart} cash-in${txnPart} not reflected in balance. Transaction status is pending. Agent claims funds were sent.`;
    }

    if (caseType === 'phishing_or_social_engineering') {
      return `Customer reports an unsolicited call/message claiming to be from the company and asking for credentials. Likely social engineering attempt.`;
    }

    if (evidenceVerdict === 'insufficient_data') {
      return `Customer reports a concern without specifying sufficient detail to identify a relevant transaction.`;
    }

    return `Customer inquiry${txnPart} requires investigation.`;
  }

  static recommendedNextAction(
    caseType: string,
    relevantTransactionId: string | null,
    department: string,
  ): string {
    const txnPart = relevantTransactionId
      ? ` ${relevantTransactionId}`
      : '';

    switch (caseType) {
      case 'wrong_transfer':
        if (relevantTransactionId) {
          return `Verify ${relevantTransactionId} details with the customer and initiate the wrong-transfer dispute workflow per policy.`;
        }
        return `Ask the customer for the transaction details (amount, recipient, time) to identify the relevant transaction and initiate the wrong-transfer dispute workflow.`;
      case 'payment_failed':
        return `Investigate${txnPart} ledger status. If balance was deducted on a failed payment, initiate the automatic reversal flow within standard SLA.`;
      case 'refund_request':
        return `Inform the customer that refund eligibility depends on the merchant's own policy. Provide guidance on contacting the merchant directly.`;
      case 'duplicate_payment':
        return `Verify the duplicate with payments_ops. If the biller confirms only one payment was received, initiate reversal of${txnPart}.`;
      case 'merchant_settlement_delay':
        return `Route to merchant_operations to verify settlement batch status. If the batch is delayed, communicate a revised ETA to the merchant.`;
      case 'agent_cash_in_issue':
        return `Investigate${txnPart} pending status with agent operations. Confirm settlement state and resolve within the standard cash-in SLA.`;
      case 'phishing_or_social_engineering':
        return `Escalate to fraud_risk team immediately. Confirm to customer that the company never asks for OTP. Log the reported number for fraud pattern analysis.`;
      default:
        return `Reply to customer asking for specific details: which transaction, what amount, what went wrong, and approximate time.`;
    }
  }

  static customerReplyEn(
    caseType: string,
    relevantTransactionId: string | null,
    department: string,
  ): string {
    const txnPart = relevantTransactionId
      ? ` transaction ${relevantTransactionId}`
      : '';

    const safetyLine =
      'Please do not share your PIN or OTP with anyone, including anyone claiming to represent us.';

    switch (caseType) {
      case 'wrong_transfer':
        if (relevantTransactionId) {
          return `We have noted your concern about transaction ${relevantTransactionId}. ${safetyLine} Our dispute team will review the case and contact you through official support channels.`;
        }
        return `We have noted your concern about this matter. ${safetyLine} Our dispute team will review the case and contact you through official support channels.`;
      case 'payment_failed':
        return `We have noted that${txnPart} may have caused an unexpected balance deduction. Our payments team will review the case and any eligible amount will be returned through official channels. ${safetyLine}`;
      case 'refund_request':
        return `Thank you for reaching out. Refunds for completed merchant payments depend on the merchant's own policy. We recommend contacting the merchant directly. If you need help reaching them, please reply and we will guide you. ${safetyLine}`;
      case 'duplicate_payment':
        return `We have noted the possible duplicate payment for${txnPart}. Our payments team will verify with the biller and any eligible amount will be returned through official channels. ${safetyLine}`;
      case 'merchant_settlement_delay':
        return `We have noted your concern about settlement${txnPart}. Our merchant operations team will check the batch status and update you on the expected settlement time through official channels. ${safetyLine}`;
      case 'agent_cash_in_issue':
        return `We have received your report about${txnPart}. Our agent operations team will investigate and follow up through official channels. ${safetyLine}`;
      case 'phishing_or_social_engineering':
        return `Thank you for reaching out before sharing any information. We never ask for your PIN, OTP, or password under any circumstances. Please do not share these with anyone, even if they claim to be from us. Our fraud team has been notified of this incident. ${safetyLine}`;
      default:
        return `Thank you for reaching out. To help you faster, please share the transaction ID, the amount involved, and a short description of what went wrong. ${safetyLine}`;
    }
  }

  static customerReplyBn(
    caseType: string,
    relevantTransactionId: string | null,
    department: string,
  ): string {
    const txnPart = relevantTransactionId
      ? ` ${relevantTransactionId}`
      : '';

    const safetyLine =
      'অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না, এমনকি যারা আমাদের প্রতিনিধি বলে দাবি করে তাদের সাথেও নয়।';

    switch (caseType) {
      case 'wrong_transfer':
        return `আমরা${txnPart} লেনদেন সম্পর্কে আপনার উদ্বেগ লক্ষ্য করেছি। ${safetyLine} আমাদের বিরোধ নিষ্পত্তি দল কেসটি পর্যালোচনা করবে এবং অফিসিয়াল চ্যানেলের মাধ্যমে আপনার সাথে যোগাযোগ করবে।`;
      case 'payment_failed':
        return `আমরা লক্ষ্য করেছি যে${txnPart} লেনদেনে একটি অপ্রত্যাশিত ব্যালেন্স কাটা হতে পারে। আমাদের পেমেন্ট টিম কেসটি পর্যালোচনা করবে এবং যোগ্য কোনও পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। ${safetyLine}`;
      case 'refund_request':
        return `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। সম্পূর্ণ মার্চেন্ট পেমেন্টের রিফান্ড মার্চেন্টের নিজস্ব নীতির উপর নির্ভর করে। আমরা সরাসরি মার্চেন্টের সাথে যোগাযোগ করার পরামর্শ দিই। ${safetyLine}`;
      case 'duplicate_payment':
        return `আমরা${txnPart} লেনদেনের সম্ভাব্য ডুপ্লিকেট পেমেন্ট লক্ষ্য করেছি। আমাদের পেমেন্ট টিম বিলারের সাথে যাচাই করবে এবং যোগ্য কোনও পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। ${safetyLine}`;
      case 'merchant_settlement_delay':
        return `আমরা${txnPart} সেটেলমেন্ট সম্পর্কে আপনার উদ্বেগ লক্ষ্য করেছি। আমাদের মার্চেন্ট অপারেশন টিম ব্যাচ স্ট্যাটাস চেক করবে এবং অফিসিয়াল চ্যানেলের মাধ্যমে আপনাকে জানাবে। ${safetyLine}`;
      case 'agent_cash_in_issue':
        return `আমরা${txnPart} লেনদেন সম্পর্কে আপনার রিপোর্ট পেয়েছি। আমাদের এজেন্ট অপারেশন টিম তদন্ত করবে এবং অফিসিয়াল চ্যানেলের মাধ্যমে ফলো আপ করবে। ${safetyLine}`;
      case 'phishing_or_social_engineering':
        return `কোনও তথ্য শেয়ার করার আগে আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আমরা কখনও আপনার পিন, ওটিপি বা পাসওয়ার্ড চাই না। অনুগ্রহ করে এগুলি কারো সাথে শেয়ার করবেন না, এমনকি যদি তারা আমাদের পক্ষ থেকে দাবি করে। আমাদের ফ্রড টিম এই ঘটনা সম্পর্কে অবহিত করা হয়েছে। ${safetyLine}`;
      default:
        return `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আপনাকে দ্রুত সাহায্য করতে, অনুগ্রহ করে লেনদেন আইডি, জড়িত পরিমাণ এবং কী ভুল হয়েছে তার একটি সংক্ষিপ্ত বিবরণ শেয়ার করুন। ${safetyLine}`;
    }
  }
}
