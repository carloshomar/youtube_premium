const mockChannelsGetAll = jest.fn();
const mockVideosGetAll = jest.fn();

jest.mock('../../src/data/db', () => ({
  getChannelsDb: () => ({ getAllAsync: mockChannelsGetAll }),
  getVideosDb: () => ({ getAllAsync: mockVideosGetAll }),
}));

jest.mock('../../src/data/channelRanking', () => ({
  rankChannelsWeighted: (channels: unknown[]) => channels,
}));

import { getChannelById, getChannels } from '../../src/data/channels';

describe('channels repository', () => {
  beforeEach(() => {
    mockChannelsGetAll.mockReset();
    mockVideosGetAll.mockReset();
  });

  it('enriches channels with display_name, video_count and total_views', async () => {
    mockChannelsGetAll.mockResolvedValue([
      {
        id: 1,
        channel_url: 'https://youtube.com/@a',
        channel_handle: '@a',
        channel_id: 'UC_A',
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      {
        id: 2,
        channel_url: 'https://youtube.com/@b',
        channel_handle: '@b',
        channel_id: 'UC_B',
        title: 'Título Oficial',
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
    ]);

    mockVideosGetAll.mockResolvedValue([
      { channel_id: 'UC_A', channel: 'Canal A', video_count: 5, total_views: 1200 },
    ]);

    const channels = await getChannels();
    expect(channels[0].display_name).toBe('Canal A');
    expect(channels[0].video_count).toBe(5);
    expect(channels[0].total_views).toBe(1200);
    expect(channels[1].display_name).toBe('Título Oficial');
    expect(channels[1].video_count).toBe(0);
    expect(channels[1].total_views).toBe(0);
    expect(mockVideosGetAll).toHaveBeenCalledWith(
      expect.stringContaining('SUM(view_count)')
    );
  });

  it('falls back to handle then Canal when names are missing', async () => {
    mockChannelsGetAll.mockResolvedValue([
      {
        id: 3,
        channel_url: 'https://youtube.com/@x',
        channel_handle: '@x',
        channel_id: 'UC_X',
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      {
        id: 4,
        channel_url: 'https://youtube.com/c',
        channel_handle: null,
        channel_id: 'UC_Y',
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      {
        id: 5,
        channel_url: 'https://youtube.com/orphan',
        channel_handle: '@orphan',
        channel_id: null,
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
    ]);
    mockVideosGetAll.mockResolvedValue([]);

    const channels = await getChannels();
    expect(channels[0].display_name).toBe('@x');
    expect(channels[1].display_name).toBe('Canal');
    expect(channels[2].display_name).toBe('@orphan');
    expect(channels[2].video_count).toBe(0);
  });

  it('getChannelById finds by channel_id', async () => {
    mockChannelsGetAll.mockResolvedValue([
      {
        id: 1,
        channel_url: 'u',
        channel_handle: '@a',
        channel_id: 'UC_A',
        title: 'A',
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
      },
    ]);
    mockVideosGetAll.mockResolvedValue([]);

    await expect(getChannelById('UC_A')).resolves.toMatchObject({ channel_id: 'UC_A' });
    await expect(getChannelById('missing')).resolves.toBeNull();
  });
});
