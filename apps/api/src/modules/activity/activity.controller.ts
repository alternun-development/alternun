import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ActivityService,
  type ActivityFeedResponse,
  type ActivityRecordInput,
  type ActivityStatsResponse,
} from './activity.service';

interface FeedQuery {
  limit?: number;
  cursor?: string;
  type?: string;
}

@ApiTags('activity')
@Controller({
  path: 'activity',
  version: VERSION_NEUTRAL,
})
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('feed')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Global activity feed across the platform with cursor pagination.',
  })
  @ApiOkResponse({
    description: 'Platform-wide activity feed.',
  })
  getFeed(@Query() query: FeedQuery): Promise<ActivityFeedResponse> {
    return this.activityService.getFeed(query);
  }

  @Get('user/:userId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Activity feed scoped to one user.',
  })
  @ApiOkResponse({
    description: 'User activity feed.',
  })
  getUserFeed(
    @Param('userId') userId: string,
    @Query() query: FeedQuery
  ): Promise<ActivityFeedResponse> {
    return this.activityService.getUserActivity(userId, query);
  }

  @Get('stats')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Global activity metrics for platform monitoring.',
  })
  @ApiOkResponse({
    description: 'Aggregated activity statistics.',
  })
  getStats(): Promise<ActivityStatsResponse> {
    return this.activityService.getStats();
  }

  @Post()
  @HttpCode(200)
  @ApiHeader({
    name: 'x-internal-api-key',
    required: false,
    description: 'Optional API key for internal activity writes.',
  })
  @ApiOperation({
    summary: 'Create an activity record (internal only).',
  })
  @ApiOkResponse({
    description: 'Insert status.',
  })
  createActivity(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: ActivityRecordInput
  ): Promise<{ ok: true }> {
    return this.activityService.createActivity(body, internalApiKey);
  }
}
