import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AnalyzeTicketModule } from './analyze-ticket/analyze-ticket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    AnalyzeTicketModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
