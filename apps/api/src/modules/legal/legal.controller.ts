import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LegalService, type LegalContent } from './legal.service';

@Controller('legal')
@ApiTags('Legal')
@Version('1')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get(':type')
  @ApiOperation({ summary: 'Get legal document content (privacy or terms)' })
  @ApiOkResponse({ description: 'Legal document content in markdown format' })
  getContent(
    @Param('type') type: 'privacy' | 'terms',
    @Query('locale') locale: 'en' | 'es' | 'th' = 'en'
  ): LegalContent {
    return this.legalService.getContent(type, locale);
  }
}
