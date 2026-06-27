import React, { useState, useMemo } from 'react';
import { FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COUNTRIES, countryFlag, type Country } from '../../utils/countries';
import type { ColorPalette } from './AchievementBadge';

interface Props {
  visible: boolean;
  isDark: boolean;
  c: ColorPalette;
  onClose: () => void;
  onSelect: (country: Country) => void;
}

export function CountryPickerModal({
  visible,
  isDark,
  c,
  onClose,
  onSelect,
}: Props): React.JSX.Element | null {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (country) => country.name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q)
    );
  }, [search]);

  if (!visible) return null;

  const sheetBg = isDark ? '#071210' : '#f0fdf9';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,45,49,0.06)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(11,90,95,0.15)';
  const rowBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,45,49,0.06)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: sheetBg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 2,
          borderTopColor: c.accent,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 34 : 20,
          maxHeight: '75%',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {/* Drag handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(11,45,49,0.2)',
            alignSelf: 'center',
            marginBottom: 14,
          }}
        />

        {/* Title */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}>
            Select Country
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Text style={{ fontSize: 20, color: c.muted }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: inputBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search country…'
            placeholderTextColor={c.muted}
            style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 12 }}
            autoCapitalize='none'
            autoCorrect={false}
            clearButtonMode='while-editing'
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: rowBorder, marginLeft: 56 }} />
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                onSelect(item);
                onClose();
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 13,
              }}
            >
              <Text style={{ fontSize: 22, marginRight: 14 }}>{countryFlag(item.code)}</Text>
              <Text style={{ fontSize: 15, color: c.text, fontWeight: '500', flex: 1 }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 12, color: c.muted, fontFamily: 'monospace' }}>
                {item.code}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}
