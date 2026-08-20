import React from 'react';
import { View } from 'react-native';

export type IconName =
  | 'home'
  | 'meetings'
  | 'calendar'
  | 'chats'
  | 'account'
  | 'menu'
  | 'close'
  | 'flag'
  | 'check'
  | 'clock'
  | 'plus'
  | 'users'
  | 'lock'
  | 'search'
  | 'trash'
  | 'chevronLeft'
  | 'audio'
  | 'screen'
  | 'play'
  | 'download';

/**
 * Small filled-glyph icon set built entirely from Views (no icon font /
 * react-native-svg dependency, so nothing to natively link). Kept
 * deliberately simple: rectangles, circles, and the classic CSS
 * transparent-border triangle trick.
 */
export function Icon({ name, size = 20, color = '#1E1B1B' }: { name: IconName; color?: string; size?: number }) {
  const s = size;

  switch (name) {
    case 'home':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.5,
              borderRightWidth: s * 0.5,
              borderBottomWidth: s * 0.42,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View style={{ width: s * 0.62, height: s * 0.4, backgroundColor: color, marginTop: -1 }} />
        </View>
      );

    case 'meetings':
      return (
        <View
          style={{
            width: s,
            height: s * 0.76,
            borderRadius: s * 0.22,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              marginLeft: s * 0.06,
              borderTopWidth: s * 0.18,
              borderBottomWidth: s * 0.18,
              borderLeftWidth: s * 0.26,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: '#FDF2F4',
            }}
          />
        </View>
      );

    case 'calendar':
      return (
        <View
          style={{
            width: s,
            height: s * 0.88,
            borderRadius: s * 0.16,
            borderWidth: Math.max(1.5, s * 0.09),
            borderColor: color,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: s * 0.26, backgroundColor: color }} />
        </View>
      );

    case 'chats':
      return (
        <View style={{ width: s, height: s }}>
          <View
            style={{
              width: s,
              height: s * 0.7,
              borderRadius: s * 0.22,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              width: 0,
              height: 0,
              marginLeft: s * 0.18,
              borderTopWidth: s * 0.18,
              borderRightWidth: s * 0.16,
              borderTopColor: color,
              borderRightColor: 'transparent',
            }}
          />
        </View>
      );

    case 'account':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.44,
              height: s * 0.44,
              borderRadius: s * 0.22,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              width: s,
              height: s * 0.5,
              marginTop: s * 0.06,
              borderTopLeftRadius: s * 0.5,
              borderTopRightRadius: s * 0.5,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'menu':
      return (
        <View style={{ width: s, height: s, justifyContent: 'space-between', paddingVertical: s * 0.16 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ height: Math.max(1.5, s * 0.11), borderRadius: 2, backgroundColor: color }} />
          ))}
        </View>
      );

    case 'close':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              position: 'absolute',
              width: s,
              height: Math.max(1.5, s * 0.11),
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s,
              height: Math.max(1.5, s * 0.11),
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'flag':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row' }}>
          <View style={{ width: Math.max(1.5, s * 0.1), height: s, backgroundColor: color }} />
          <View style={{ width: s * 0.7, height: s * 0.5, backgroundColor: color, opacity: 0.55 }} />
        </View>
      );

    case 'check':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: s * 0.55,
              height: Math.max(1.5, s * 0.14),
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }, { translateY: -s * 0.02 }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.3,
              height: Math.max(1.5, s * 0.14),
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }, { translateX: -s * 0.18 }, { translateY: s * 0.06 }],
            }}
          />
        </View>
      );

    case 'plus':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: s, height: Math.max(1.5, s * 0.16), borderRadius: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', width: Math.max(1.5, s * 0.16), height: s, borderRadius: 2, backgroundColor: color }} />
        </View>
      );

    case 'users':
      return (
        <View style={{ width: s, height: s * 0.8, justifyContent: 'flex-end' }}>
          <View style={{ position: 'absolute', left: 0, alignItems: 'center', opacity: 0.45 }}>
            <View style={{ width: s * 0.34, height: s * 0.34, borderRadius: s * 0.17, backgroundColor: color }} />
            <View
              style={{
                width: s * 0.56,
                height: s * 0.34,
                marginTop: s * 0.04,
                borderTopLeftRadius: s * 0.28,
                borderTopRightRadius: s * 0.28,
                backgroundColor: color,
              }}
            />
          </View>
          <View style={{ position: 'absolute', right: 0, alignItems: 'center' }}>
            <View style={{ width: s * 0.38, height: s * 0.38, borderRadius: s * 0.19, backgroundColor: color }} />
            <View
              style={{
                width: s * 0.62,
                height: s * 0.38,
                marginTop: s * 0.05,
                borderTopLeftRadius: s * 0.31,
                borderTopRightRadius: s * 0.31,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'lock':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          <View style={{ width: s * 0.56, height: s * 0.32, overflow: 'hidden', alignItems: 'center' }}>
            <View
              style={{
                width: s * 0.5,
                height: s * 0.5,
                borderRadius: s * 0.25,
                borderWidth: Math.max(1.5, s * 0.1),
                borderColor: color,
              }}
            />
          </View>
          <View style={{ width: s * 0.74, height: s * 0.42, borderRadius: s * 0.1, backgroundColor: color, marginTop: -1 }} />
        </View>
      );

    case 'search':
      return (
        <View style={{ width: s, height: s }}>
          <View
            style={{
              width: s * 0.66,
              height: s * 0.66,
              borderRadius: s * 0.33,
              borderWidth: Math.max(1.5, s * 0.12),
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.32,
              height: Math.max(1.5, s * 0.13),
              borderRadius: 2,
              backgroundColor: color,
              right: 0,
              bottom: s * 0.04,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'trash':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          <View style={{ width: s * 0.4, height: s * 0.1, backgroundColor: color, borderRadius: 2, marginBottom: s * 0.04 }} />
          <View
            style={{
              width: s * 0.62,
              height: s * 0.56,
              borderBottomLeftRadius: s * 0.12,
              borderBottomRightRadius: s * 0.12,
              backgroundColor: color,
              opacity: 0.85,
            }}
          />
        </View>
      );

    case 'chevronLeft':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: s * 0.42,
              height: Math.max(1.5, s * 0.14),
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }, { translateX: s * 0.14 }, { translateY: -s * 0.11 }],
            }}
          />
          <View
            style={{
              width: s * 0.42,
              height: Math.max(1.5, s * 0.14),
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }, { translateX: s * 0.14 }, { translateY: s * 0.11 }],
            }}
          />
        </View>
      );

    case 'audio':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Math.max(1, s * 0.08) }}>
          <View style={{ width: Math.max(1.5, s * 0.14), height: s * 0.45, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: Math.max(1.5, s * 0.14), height: s * 0.8, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: Math.max(1.5, s * 0.14), height: s * 0.55, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: Math.max(1.5, s * 0.14), height: s * 0.32, borderRadius: 2, backgroundColor: color }} />
        </View>
      );

    case 'screen':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          <View
            style={{
              width: s,
              height: s * 0.66,
              borderRadius: s * 0.12,
              borderWidth: Math.max(1.5, s * 0.09),
              borderColor: color,
            }}
          />
          <View style={{ width: s * 0.28, height: s * 0.14, backgroundColor: color, marginTop: -1 }} />
          <View style={{ width: s * 0.5, height: Math.max(1.5, s * 0.08), borderRadius: 2, backgroundColor: color, marginTop: 1 }} />
        </View>
      );

    case 'play':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              marginLeft: s * 0.1,
              borderTopWidth: s * 0.35,
              borderBottomWidth: s * 0.35,
              borderLeftWidth: s * 0.5,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: color,
            }}
          />
        </View>
      );

    case 'download':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: Math.max(1.5, s * 0.14), height: s * 0.5, backgroundColor: color, borderRadius: 2 }} />
          <View
            style={{
              width: 0,
              height: 0,
              marginTop: -1,
              borderLeftWidth: s * 0.22,
              borderRightWidth: s * 0.22,
              borderTopWidth: s * 0.22,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
          <View style={{ width: s * 0.72, height: Math.max(1.5, s * 0.1), borderRadius: 2, backgroundColor: color, marginTop: s * 0.14 }} />
        </View>
      );

    case 'clock':
    default:
      return (
        <View
          style={{
            width: s,
            height: s,
            borderRadius: s / 2,
            borderWidth: Math.max(1.5, s * 0.1),
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: Math.max(1, s * 0.06), height: s * 0.3, backgroundColor: color, position: 'absolute', top: s * 0.14 }} />
          <View
            style={{
              width: s * 0.22,
              height: Math.max(1, s * 0.06),
              backgroundColor: color,
              position: 'absolute',
              right: s * 0.18,
              top: s * 0.46,
            }}
          />
        </View>
      );
  }
}
