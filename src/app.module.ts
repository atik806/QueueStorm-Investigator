import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
