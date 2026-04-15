import { ApiProperty } from '@nestjs/swagger';

export class BenefitCategoryDto {
  @ApiProperty({ example: 'eco' })
  slug!: string;

  @ApiProperty({ example: 'Eco Products' })
  title!: string;

  @ApiProperty({ example: 'Regenerative agriculture' })
  meta!: string;

  @ApiProperty({ example: 'Organic and sustainable products...' })
  description!: string;

  @ApiProperty({ example: 'Access exclusive discounts...' })
  infoBody!: string;

  @ApiProperty({ example: 'Shop Now' })
  ctaLabel!: string;

  @ApiProperty({ example: ['Organic', 'Sustainable'] })
  tags!: string[];

  @ApiProperty({ example: 4.8 })
  rating!: number;

  @ApiProperty({ example: true })
  isTopRated!: boolean;

  @ApiProperty({ example: 120 })
  atnMin!: number;

  @ApiProperty({ example: ['https://...'] })
  coverUrls!: string[];
}

export class BenefitCategoriesResponseDto {
  @ApiProperty({ type: [BenefitCategoryDto] })
  categories!: BenefitCategoryDto[];
}

export class BenefitItemDto {
  @ApiProperty({ example: 'organic-coffee-kit' })
  slug!: string;

  @ApiProperty({ example: 'Organic Coffee Kit' })
  title!: string;

  @ApiProperty({ example: 'Premium single-origin coffee...' })
  description!: string;

  @ApiProperty({ example: 'https://images.unsplash.com/...' })
  imageUrl!: string;

  @ApiProperty({ example: 120 })
  atnPrice!: number;

  @ApiProperty({ example: true })
  isFeatured!: boolean;
}

export class BenefitItemsResponseDto {
  @ApiProperty({ example: 'eco' })
  categorySlug!: string;

  @ApiProperty({ type: [BenefitItemDto] })
  items!: BenefitItemDto[];
}
