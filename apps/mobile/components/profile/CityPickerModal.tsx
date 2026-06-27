import React, { useState, useMemo } from 'react';
import { FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getCitiesForCountry } from '../../utils/cities';
import type { ColorPalette } from './AchievementBadge';

interface Props {
  visible: boolean;
  isDark: boolean;
  c: ColorPalette;
  countryCode: string;
  countryName: string;
  onClose: () => void;
  onSelect: (city: string) => void;
}

export function CityPickerModal({
  visible,
  isDark,
  c,
  countryCode,
  countryName,
  onClose,
  onSelect,
}: Props): React.JSX.Element | null {
  const [search, setSearch] = useState('');

  const cities = useMemo(() => getCitiesForCountry(countryCode), [countryCode]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter((city) => city.toLowerCase().includes(q));
  }, [cities, search]);

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
          <View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}>
              Select City
            </Text>
            {countryName ? (
              <Text style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{countryName}</Text>
            ) : null}
          </View>
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
            placeholder='Search city…'
            placeholderTextColor={c.muted}
            style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 12 }}
            autoCapitalize='none'
            autoCorrect={false}
            clearButtonMode='while-editing'
          />
        </View>

        {cities.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🏙️</Text>
            <Text style={{ fontSize: 15, color: c.muted, textAlign: 'center', lineHeight: 22 }}>
              No cities listed for this country.{'\n'}Type your city above.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: c.muted }}>No results for "{search}"</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: rowBorder, marginLeft: 20 }} />
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
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                }}
              >
                <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
