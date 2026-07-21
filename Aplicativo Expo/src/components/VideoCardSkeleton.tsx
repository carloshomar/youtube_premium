import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

type SkeletonBoxProps = {
  className?: string;
  testID?: string;
};

function SkeletonBox({ className, testID }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View testID={testID} style={{ opacity }} className={className} />;
}

export function VideoCardSkeleton() {
  return (
    <View testID="video-card-skeleton" className="mb-4">
      <SkeletonBox className="mx-3 h-52 w-auto rounded-xl bg-white/10" />
      <View className="mx-3 mt-2 flex-row items-start">
        <SkeletonBox className="mr-3 h-9 w-9 rounded-full bg-white/10" />
        <View className="flex-1">
          <SkeletonBox className="mb-2 h-4 w-[92%] rounded-md bg-white/10" />
          <SkeletonBox className="h-3 w-[58%] rounded-md bg-white/10" />
        </View>
      </View>
    </View>
  );
}

export function ShortVideoCardSkeleton() {
  return <SkeletonBox testID="short-card-skeleton" className="mr-3 h-64 w-40 rounded-xl bg-white/10" />;
}

type HomeFeedSkeletonProps = {
  videoCount?: number;
  showShorts?: boolean;
};

export default function HomeFeedSkeleton({ videoCount = 4, showShorts = false }: HomeFeedSkeletonProps) {
  return (
    <View testID="home-feed-skeleton">
      {showShorts ? (
        <View className="mb-4 mt-1">
          <View className="mx-4 mb-3 flex-row items-center">
            <SkeletonBox className="mr-2 h-6 w-5 rounded bg-white/10" />
            <SkeletonBox className="h-5 w-16 rounded-md bg-white/10" />
          </View>
          <View className="flex-row px-3">
            {Array.from({ length: 3 }, (_, index) => (
              <ShortVideoCardSkeleton key={`short-skeleton-${index}`} />
            ))}
          </View>
        </View>
      ) : null}
      {Array.from({ length: videoCount }, (_, index) => (
        <VideoCardSkeleton key={`video-skeleton-${index}`} />
      ))}
    </View>
  );
}
