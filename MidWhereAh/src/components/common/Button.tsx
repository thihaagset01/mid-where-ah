// src/components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const colors = {
  primary: {
    main: '#8B5DB8'
  }
};

interface ButtonProps {
  title: string;
  onPress: () => void;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary.main,
    padding: 12,
    borderRadius: 8,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});