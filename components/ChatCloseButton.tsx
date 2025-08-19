// import React from 'react';
// import { Pressable, StyleSheet } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { getIconSize, spacing } from '../utils/responsive';
// import { useTheme } from '../contexts/ThemeContext';

// interface ChatCloseButtonProps {
//   onClose: () => void;
//   position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'custom';
//   size?: 'small' | 'medium' | 'large';
//   style?: any;
//   customPosition?: { top?: number; bottom?: number; left?: number; right?: number };
// }

// export default function ChatCloseButton({ 
//   onClose, 
//   position = 'top-right',
//   size = 'medium',
//   style,
//   customPosition
// }: ChatCloseButtonProps) {
//   const { isUserDarkMode } = useTheme();

//   const getSize = () => {
//     switch (size) {
//       case 'small': return getIconSize(32);
//       case 'large': return getIconSize(48);
//       default: return getIconSize(40);
//     }
//   };

//   const getPositionStyles = () => {
//     if (position === 'custom' && customPosition) {
//       return customPosition;
//     }
    
//     switch (position) {
//       case 'top-left':
//         return { top: spacing.large, left: spacing.large };
//       case 'bottom-right':
//         return { bottom: 120, right: spacing.large }; // Avoid overlapping with input
//       case 'bottom-left':
//         return { bottom: 120, left: spacing.large }; // Avoid overlapping with input
//       default: // top-right
//         return { top: spacing.large, right: spacing.large };
//     }
//   };

//   const dynamicStyles = {
//     button: {
//       backgroundColor: isUserDarkMode ? '#374151' : 'rgba(255, 255, 255, 0.9)',
//       borderColor: isUserDarkMode ? '#4B5563' : 'rgba(0, 0, 0, 0.1)',
//     },
//     icon: {
//       color: isUserDarkMode ? '#FFFFFF' : '#000000',
//     },
//   };

//   return (
//     <Pressable
//       style={[
//         styles.button,
//         dynamicStyles.button,
//         {
//           width: getSize(),
//           height: getSize(),
//           borderRadius: getSize() / 2,
//         },
//         getPositionStyles(),
//         style,
//       ]}
//       onPress={onClose}
//     >
//       <Ionicons 
//         name="close" 
//         size={getSize() * 0.5} 
//         color={dynamicStyles.icon.color} 
//       />
//     </Pressable>
//   );
// }

// const styles = StyleSheet.create({
//   button: {
//     position: 'absolute',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//     zIndex: 1000,
//   },
// });
