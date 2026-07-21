import { env } from '../config/env';

export const REMOTE_DB = {
  videos: {
    url: env.remoteVideosDbUrl,
    fileName: env.remoteVideosDbFilename,
  },
  channels: {
    url: env.remoteChannelsDbUrl,
    fileName: env.remoteChannelsDbFilename,
  },
} as const;
