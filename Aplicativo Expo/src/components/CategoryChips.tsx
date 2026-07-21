import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

type Props = {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
};

export default function CategoryChips({ categories, active, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3">
      {categories.map((category) => {
        const isActive = category === active;
        return (
            <TouchableOpacity
              key={category}
              testID={`category-chip-${category}`}
              onPress={() => onChange(category)}
              className={`mr-2 rounded-md px-3 py-1.5 ${isActive ? 'bg-white' : 'bg-white/10'}`}
            >
            <Text className={`text-sm ${isActive ? 'text-black' : 'text-white'}`}>{category}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
