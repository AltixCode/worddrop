import React from 'react';
import { View, I18nManager } from 'react-native';
import { ChevronRight, ArrowRight } from 'lucide-react-native';

interface Props {
  size?: number;
  color: string;
}

/**
 * Layout mirroring moves a forward chevron to the leading edge on its own, but
 * the arrowhead keeps pointing right and ends up aimed back where the reader
 * came from. The flip goes on a wrapping View: passing a transform down to
 * lucide's Svg makes the glyph disappear rather than mirror.
 */
const Mirrored: React.FC<React.PropsWithChildren> = ({ children }) => (
  <View style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>{children}</View>
);

export const ForwardChevron: React.FC<Props> = ({ size = 18, color }) => (
  <Mirrored>
    <ChevronRight size={size} color={color} />
  </Mirrored>
);

export const ForwardArrow: React.FC<Props> = ({ size = 18, color }) => (
  <Mirrored>
    <ArrowRight size={size} color={color} />
  </Mirrored>
);
