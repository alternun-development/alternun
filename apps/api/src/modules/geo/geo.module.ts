import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';

@Module({ controllers: [GeoController] })
export class GeoModule {}
