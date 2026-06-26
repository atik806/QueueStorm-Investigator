import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionHistoryEntryDto } from './transaction-history-entry.dto';

export enum Language {
  EN = 'en',
  BN = 'bn',
  MIXED = 'mixed',
}

export enum Channel {
  IN_APP_CHAT = 'in_app_chat',
  CALL_CENTER = 'call_center',
  EMAIL = 'email',
  MERCHANT_PORTAL = 'merchant_portal',
  FIELD_AGENT = 'field_agent',
}

export enum UserType {
  CUSTOMER = 'customer',
  MERCHANT = 'merchant',
  AGENT = 'agent',
  UNKNOWN = 'unknown',
}

export class AnalyzeTicketRequestDto {
  @IsString()
  @IsNotEmpty()
  ticket_id: string;

  @IsString()
  @IsNotEmpty()
  complaint: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;

  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;

  @IsOptional()
  @IsString()
  campaign_context?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionHistoryEntryDto)
  transaction_history?: TransactionHistoryEntryDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
