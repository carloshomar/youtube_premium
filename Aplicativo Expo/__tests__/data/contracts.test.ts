import {
  VIDEO_LIST_COLUMNS,
  VIDEO_LIST_COLUMNS_WITHOUT_GENRES,
  videoListColumns,
} from '../../src/data/types';
import { REMOTE_DB } from '../../src/constants/remoteDb';

describe('data contracts', () => {
  it('list queries never select metadata_json', () => {
    expect(VIDEO_LIST_COLUMNS).not.toContain('metadata_json');
    expect(VIDEO_LIST_COLUMNS).toContain('mp4_sas_url');
    expect(VIDEO_LIST_COLUMNS).toContain('video_id');
    expect(VIDEO_LIST_COLUMNS).toContain('genres');
    expect(VIDEO_LIST_COLUMNS_WITHOUT_GENRES).not.toContain('genres');
    expect(videoListColumns(true)).toContain('genres');
    expect(videoListColumns(false)).not.toContain('genres');
  });

  it('remote DB URLs point to Azure blob sqlite files', () => {
    expect(REMOTE_DB.videos.url).toContain('videos.sqlite');
    expect(REMOTE_DB.channels.url).toContain('channels.sqlite');
    expect(REMOTE_DB.videos.fileName).toBe('videos.sqlite');
    expect(REMOTE_DB.channels.fileName).toBe('channels.sqlite');
  });
});
