import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { resolveUserId } from '../../../common/auth/resolve-user-id';
import { getAirsDashboardSnapshot, getUserAchievements } from '../airs.repository';
import { MILESTONES, renderMilestoneCard } from './milestone-card';

export interface MilestoneShare {
  displayName: string;
  amount: number;
  imageUrl: string;
  shareUrl: string;
}

@Injectable()
export class MilestoneShareService {
  private storage() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new ServiceUnavailableException('Milestone storage is not configured');
    return createClient(url, key, { auth: { persistSession: false } }).storage.from(
      'milestone-shares'
    );
  }

  async create(token: string, milestone: string): Promise<MilestoneShare> {
    const amount = Object.prototype.hasOwnProperty.call(MILESTONES, milestone)
      ? MILESTONES[milestone]
      : undefined;
    if (!amount) throw new BadRequestException('Unknown AIRS milestone');
    const userId = await resolveUserId(token);
    const [snapshot, achievements] = await Promise.all([
      getAirsDashboardSnapshot({ userId }),
      getUserAchievements({ userId }),
    ]);
    if (
      snapshot.airsBalance < amount &&
      !achievements.some((item) => item.key === milestone && item.unlocked)
    ) {
      throw new ForbiddenException('This milestone has not been earned');
    }
    // Names and ownership come only from the verified account, never the request body.
    const displayName =
      (snapshot.displayName ?? '')
        .replace(/\p{Cc}/gu, '')
        .trim()
        .slice(0, 100) || 'AIRS member';
    const origin = process.env.AIRS_SHARE_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL;
    if (!origin || !/^https?:\/\//.test(origin))
      throw new ServiceUnavailableException('Public share URL is not configured');
    const id = createHash('sha256')
      .update(JSON.stringify(['v1', userId, milestone, displayName]))
      .digest('hex');
    const storage = this.storage();
    const imagePath = `${id}.png`;
    const imageUrl = storage.getPublicUrl(imagePath).data.publicUrl;
    const result = {
      displayName,
      amount,
      imageUrl,
      shareUrl: `${origin.replace(/\/+$/, '')}/v1/airs/milestones/share/${id}`,
    };
    const existing = await storage.download(`${id}.json`);
    if (!existing.error) return result;
    const image = await renderMilestoneCard(amount, displayName);
    const upload = await storage.upload(imagePath, image, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    });
    if (upload.error) throw new ServiceUnavailableException('Unable to publish milestone image');
    const metadata = await storage.upload(`${id}.json`, JSON.stringify(result), {
      contentType: 'application/json',
      upsert: true,
    });
    if (metadata.error)
      throw new ServiceUnavailableException('Unable to publish milestone preview');
    return result;
  }

  async find(id: string): Promise<MilestoneShare> {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new NotFoundException();
    const response = await this.storage().download(`${id}.json`);
    if (response.error) throw new NotFoundException();
    return JSON.parse(await response.data.text()) as MilestoneShare;
  }
}
