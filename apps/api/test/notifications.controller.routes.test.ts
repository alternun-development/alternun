/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { VERSION_NEUTRAL } from '@nestjs/common';
import { VERSION_METADATA } from '@nestjs/common/constants';
import { NotificationsController } from '../src/modules/notifications/notifications.controller';

test('notifications answer on /v1/notifications (used by mobile) and the unversioned path', () => {
  const versions = Reflect.getMetadata(VERSION_METADATA, NotificationsController);
  assert.ok(Array.isArray(versions));
  assert.ok(versions.includes('1'));
  assert.ok(versions.includes(VERSION_NEUTRAL));
});
