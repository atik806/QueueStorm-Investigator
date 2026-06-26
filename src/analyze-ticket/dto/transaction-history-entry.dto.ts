import {
  IsString,
  IsISO8601,
  IsEnum,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export enum TransactionType {
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  CASH_IN = 'cash_in',
  CASH_OUT = 'cash_out',
  SETTLEMENT = 'settlement',
  REFUND = 'refund',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
  REVERSED = 'reversed',
}

export class TransactionHistoryEntryDto {
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @IsISO8601()
  timestamp: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  counterparty: string;

  @IsEnum(TransactionStatus)
  status: TransactionStatus;
}
