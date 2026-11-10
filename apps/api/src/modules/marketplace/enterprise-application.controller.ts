import { Body, Controller, Post, Req, UseFilters } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { CreateEnterpriseApplicationDto } from './enterprise-application.dto';
import { EnterpriseApplicationService } from './enterprise-application.service';
import { ProjectProposalAcceptedDto } from './project-proposal.dto';

@ApiTags('enterprise applications')
@Controller({ path: 'enterprise-applications', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class EnterpriseApplicationController {
  constructor(private readonly service: EnterpriseApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Ask to add a company to Airs from the Explorer.' })
  @ApiCreatedResponse({ type: ProjectProposalAcceptedDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiResponse({ status: 429, type: ApiErrorDto, description: 'Submission rate limit reached.' })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  submit(
    @Body() body: CreateEnterpriseApplicationDto,
    @Req() request: FastifyRequest
  ): Promise<{ accepted: true }> {
    return this.service.submit(body, request.ip);
  }
}
