import { IsBoolean, IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UploadPaymentDto {
  @IsNumberString({}, { message: 'Nominal pembayaran harus berupa angka' })
  @IsNotEmpty({ message: 'Nominal pembayaran wajib diisi' })
  amount: string;
}

export class VerifyPaymentDto {
  @IsBoolean({ message: 'is_approved harus boolean' })
  is_approved: boolean;

  @ValidateIf((o: VerifyPaymentDto) => !o.is_approved)
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi saat menolak pembayaran' })
  @MaxLength(1000)
  rejection_reason?: string;
}
