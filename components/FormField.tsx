import { View, Text, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface Props extends TextInputProps {
  label: string;
  rightIcon?: ReactNode;
  error?: string;
  hint?: string;
}

export default function FormField({ label, rightIcon, error, hint, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: error ? '#ef4444' : focused ? '#71717a' : '#27272a',
        borderRadius: 14,
        paddingHorizontal: 16,
      }}>
        <TextInput
          style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 15 }}
          placeholderTextColor="#3f3f46"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <View style={{ marginLeft: 10 }}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: '#52525b', fontSize: 12, marginTop: 6 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
