import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PROJECT_MEMBERSHIP_ROLES } from './marketplace.dto';

export class AddProjectTeamMemberDto {
  @IsEmail() @MaxLength(320) email!: string;
  @IsString()
  @IsIn(PROJECT_MEMBERSHIP_ROLES)
  role!: (typeof PROJECT_MEMBERSHIP_ROLES)[number];
}

export class RevokeProjectTeamMemberDto {
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

export class ModerateProjectCommentDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
