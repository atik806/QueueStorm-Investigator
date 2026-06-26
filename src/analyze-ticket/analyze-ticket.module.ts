import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyzeTicketController } from './analyze-ticket.controller';
import { AnalyzeTicketService } from './analyze-ticket.service';
import { EvidenceMatcherService } from './investigator/evidence-matcher.service';
import { CaseClassifierService } from './investigator/case-classifier.service';
import { RouterService } from './investigator/router.service';
import { SafetyGuardService } from './investigator/safety-guard.service';
import { LlmReasonerService } from './investigator/llm-reasoner.service';

@Module({
  imports: [ConfigModule],
  controllers: [AnalyzeTicketController],
  providers: [
    AnalyzeTicketService,
    EvidenceMatcherService,
    CaseClassifierService,
    RouterService,
    SafetyGuardService,
    LlmReasonerService,
  ],
  exports: [AnalyzeTicketService],
})
export class AnalyzeTicketModule {}
