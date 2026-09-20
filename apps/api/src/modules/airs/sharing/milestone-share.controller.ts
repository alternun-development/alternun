import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MilestoneShareService, type MilestoneShare } from './milestone-share.service';
import { milestoneShareHtml } from './milestone-card';

@ApiTags('airs')
@Controller({ path: 'airs/milestones', version: [VERSION_NEUTRAL, '1'] })
export class MilestoneShareController {
  constructor(private readonly service: MilestoneShareService) {}

  @Post('share')
  @UseGuards(ThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a personalized PNG for an earned AIRS milestone.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['milestone'],
      additionalProperties: false,
      properties: {
        milestone: {
          type: 'string',
          enum: [
            'first_10_airs',
            'fifty_airs',
            'first_100_airs',
            'first_500_airs',
            'first_1000_airs',
            'first_5000_airs',
            'first_10000_airs',
            'first_50000_airs',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string' },
        amount: { type: 'number' },
        imageUrl: { type: 'string' },
        shareUrl: { type: 'string' },
      },
    },
  })
  create(
    @Headers('authorization') token: string | undefined,
    @Body() body: { milestone?: unknown }
  ): Promise<MilestoneShare> {
    if (!token?.trim()) throw new UnauthorizedException();
    return this.service.create(token, typeof body?.milestone === 'string' ? body.milestone : '');
  }

  @Get('share/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
  )
  @ApiOperation({
    summary: 'Public crawler-readable milestone preview with Open Graph and X metadata.',
  })
  async preview(@Param('id') id: string): Promise<string> {
    return milestoneShareHtml(await this.service.find(id));
  }
}
