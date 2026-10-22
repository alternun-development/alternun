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
import { CreateProjectProposalDto, ProjectProposalAcceptedDto } from './project-proposal.dto';
import { ProjectProposalService } from './project-proposal.service';

@ApiTags('project proposals')
@Controller({ path: 'project-proposals', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class ProjectProposalController {
  constructor(private readonly service: ProjectProposalService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a marketplace project proposal.' })
  @ApiCreatedResponse({ type: ProjectProposalAcceptedDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiResponse({ status: 429, type: ApiErrorDto, description: 'Submission rate limit reached.' })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  submit(
    @Body() body: CreateProjectProposalDto,
    @Req() request: FastifyRequest
  ): Promise<{ accepted: true }> {
    return this.service.submit(body, request.ip);
  }
}
