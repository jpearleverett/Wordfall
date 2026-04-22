import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RAIL_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - RAIL_PADDING * 2, 340);

interface LiveRailProps {
  children: React.ReactNode;
}

const LiveRail: React.FC<LiveRailProps> = ({ children }) => {
  const visible = useMemo(
    () => React.Children.toArray(children).filter(Boolean),
    [children],
  );

  if (visible.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      snapToInterval={CARD_WIDTH + CARD_GAP}
      decelerationRate="fast"
      snapToAlignment="start"
    >
      {visible.map((child, idx) => (
        <View
          key={idx}
          style={[
            styles.card,
            { width: CARD_WIDTH },
            idx < visible.length - 1 && { marginRight: CARD_GAP },
          ]}
        >
          {child}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: RAIL_PADDING,
    paddingVertical: 4,
  },
  card: {
    flexShrink: 0,
  },
});

export default React.memo(LiveRail);
