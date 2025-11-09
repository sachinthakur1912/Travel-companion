import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateChatDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  groupId?: string;
}

