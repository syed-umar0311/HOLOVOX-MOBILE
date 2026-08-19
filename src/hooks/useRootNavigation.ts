import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/types';

/** Screens nested two levels deep (Dashboard tab → Dashboard stack → Root stack) need
 * this to reach root-level screens like `Call`, instead of chaining
 * `navigation.getParent()?.getParent()` and losing types at every call site. */
export function useRootNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
