import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  BadRequestException,
  UnprocessableEntityException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyzeTicketService } from './analyze-ticket.service';
import { AnalyzeTicketRequestDto } from './dto/analyze-ticket-request.dto';
import { AnalyzeTicketResponseDto } from './dto/analyze-ticket-response.dto';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';

@Controller('analyze-ticket')
@UseInterceptors(new TimeoutInterceptor(30000))
export class AnalyzeTicketController {
  constructor(private readonly analyzeTicketService: AnalyzeTicketService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Body() dto: AnalyzeTicketRequestDto,
  ): Promise<AnalyzeTicketResponseDto> {
    this.validateSemantic(dto);
    return this.analyzeTicketService.analyze(dto);
  }

  private validateSemantic(dto: AnalyzeTicketRequestDto): void {
    if (!dto.ticket_id || dto.ticket_id.trim().length === 0) {
      throw new BadRequestException('ticket_id must be a non-empty string');
    }
    if (!dto.complaint || dto.complaint.trim().length === 0) {
      throw new UnprocessableEntityException('complaint must be a non-empty string');
    }
  }
}
