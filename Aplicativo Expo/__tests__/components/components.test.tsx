import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import AppHeader, { LoadingBlock } from '../../src/components/AppHeader';
import CategoryChips from '../../src/components/CategoryChips';
import ShortVideoCard from '../../src/components/ShortVideoCard';
import HomeFeedSkeleton, { VideoCardSkeleton } from '../../src/components/VideoCardSkeleton';
import VideoCard from '../../src/components/VideoCard';
import { themeColors } from '../../src/theme';
import { makeVideo } from '../helpers/fixtures';

describe('components', () => {
  it('AppHeader renders brand and triggers search', () => {
    const onSearchPress = jest.fn();
    render(<AppHeader onSearchPress={onSearchPress} />);
    expect(screen.getByTestId('app-header')).toBeTruthy();
    expect(screen.getByText('YTube')).toBeTruthy();
    fireEvent.press(screen.getByTestId('header-search'));
    expect(onSearchPress).toHaveBeenCalled();
  });

  it('AppHeader supports back + title', () => {
    const onBack = jest.fn();
    render(<AppHeader showBack title="Busca" onBack={onBack} />);
    expect(screen.getByText('Busca')).toBeTruthy();
    fireEvent.press(screen.getByTestId('header-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('LoadingBlock uses default label', () => {
    render(<LoadingBlock />);
    expect(screen.getByText('Carregando…')).toBeTruthy();
  });

  it('LoadingBlock shows custom label', () => {
    render(<LoadingBlock label="Baixando…" />);
    expect(screen.getByTestId('loading-block')).toBeTruthy();
    expect(screen.getByText('Baixando…')).toBeTruthy();
  });

  it('CategoryChips highlights active and changes category', () => {
    const onChange = jest.fn();
    render(
      <CategoryChips categories={['Todos', 'Music']} active="Todos" onChange={onChange} />
    );
    fireEvent.press(screen.getByTestId('category-chip-Music'));
    expect(onChange).toHaveBeenCalledWith('Music');
  });

  it('VideoCard presses video and channel', () => {
    const onPress = jest.fn();
    const onChannelPress = jest.fn();
    const video = makeVideo({ video_id: 'abc', thumbnail: 'https://t/x.jpg' });
    render(<VideoCard video={video} onPress={onPress} onChannelPress={onChannelPress} />);
    fireEvent.press(screen.getByTestId('video-card-abc'));
    expect(onPress).toHaveBeenCalledWith(video);
    fireEvent.press(screen.getByTestId('video-card-channel-abc'));
    expect(onChannelPress).toHaveBeenCalledWith(video);
  });

  it('VideoCard falls back when thumbnail and channel are missing', () => {
    const video = makeVideo({
      video_id: 'no-thumb',
      thumbnail: null,
      thumb_sas_url: null,
      channel: null,
      uploader: null,
    });
    render(<VideoCard video={video} onPress={jest.fn()} />);
    expect(screen.getByTestId('video-card-no-thumb')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy(); // "Canal"
  });

  it('VideoCard uses ? when channel name is blank', () => {
    const video = makeVideo({
      video_id: 'blank',
      channel: '   ',
      uploader: '   ',
      thumbnail: null,
      thumb_sas_url: null,
    });
    // channel || uploader || 'Canal' — spaces are truthy, trim yields '?'
    render(<VideoCard video={video} onPress={jest.fn()} />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('ShortVideoCard presses item with and without thumb', () => {
    const onPress = jest.fn();
    const withThumb = makeVideo({ video_id: 's1', thumbnail: 'https://t.jpg' });
    const { rerender } = render(<ShortVideoCard item={withThumb} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('short-card-s1'));
    expect(onPress).toHaveBeenCalledWith(withThumb);

    const noThumb = makeVideo({ video_id: 's2', thumbnail: null, thumb_sas_url: null });
    rerender(<ShortVideoCard item={noThumb} onPress={onPress} />);
    expect(screen.getByTestId('short-card-s2')).toBeTruthy();
  });

  it('exposes theme colors used by UI', () => {
    expect(themeColors.bg).toBe('#212121');
    expect(themeColors.red).toBe('#FF0000');
  });

  it('VideoCard works without onChannelPress', () => {
    const video = makeVideo({ video_id: 'solo' });
    render(<VideoCard video={video} onPress={jest.fn()} />);
    expect(screen.getByTestId('video-card-channel-solo')).toBeTruthy();
  });

  it('VideoCard omits upload date when missing', () => {
    const video = makeVideo({ video_id: 'no-date', upload_date: null });
    render(<VideoCard video={video} onPress={jest.fn()} />);
    expect(screen.getByTestId('video-card-no-date')).toBeTruthy();
    expect(screen.queryByText(/• há/)).toBeNull();
  });

  it('VideoCardSkeleton mirrors feed card layout', () => {
    render(<VideoCardSkeleton />);
    expect(screen.getByTestId('video-card-skeleton')).toBeTruthy();
  });

  it('HomeFeedSkeleton uses defaults without shorts placeholders', () => {
    render(<HomeFeedSkeleton />);
    expect(screen.getByTestId('home-feed-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('video-card-skeleton')).toHaveLength(4);
    expect(screen.queryByTestId('short-card-skeleton')).toBeNull();
  });

  it('HomeFeedSkeleton can include shorts placeholders', () => {
    render(<HomeFeedSkeleton showShorts videoCount={2} />);
    expect(screen.getByTestId('home-feed-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('video-card-skeleton')).toHaveLength(2);
    expect(screen.getAllByTestId('short-card-skeleton')).toHaveLength(3);
  });
});
