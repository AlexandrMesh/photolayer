import React from 'react';

import { Pressable, Modal as RNModal, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
  const { theme } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name='close' size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

export default Modal;
