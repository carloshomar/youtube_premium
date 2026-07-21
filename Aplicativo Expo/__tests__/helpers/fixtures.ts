import type { VideoRow } from '../../src/data/types';

export function makeVideo(overrides: Partial<VideoRow> = {}): VideoRow {
  return {
    video_id: 'vid-1',
    url: 'https://youtube.com/watch?v=vid-1',
    title: 'Título de teste',
    description: 'Descrição',
    channel: 'Canal Teste',
    channel_id: 'UC_TEST',
    uploader: 'Canal Teste',
    uploader_id: '@teste',
    duration_sec: 600,
    upload_date: '20260701',
    view_count: 1500,
    like_count: 100,
    comment_count: 10,
    categories: '["Education"]',
    genres: null,
    tags: '["react","expo"]',
    thumbnail: 'https://example.com/thumb.jpg',
    webpage_url: 'https://youtube.com/watch?v=vid-1',
    width: 640,
    height: 360,
    mp4_sas_url: 'https://example.com/video.mp4?sas=1',
    mp3_sas_url: 'https://example.com/audio.mp3?sas=1',
    thumb_sas_url: null,
    updated_at: '2026-07-16T00:00:00Z',
    ...overrides,
  };
}
