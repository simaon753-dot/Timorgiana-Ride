import React from 'react';
import SegmentedPicker from './SegmentedPicker.js';
import { useI18n } from '../i18n/index.js';

// Selector do tipo de conta: passageiro vs motorista
export default function RoleSelector({ value, onChange }) {
  const { t } = useI18n();
  return (
    <SegmentedPicker
      value={value}
      onChange={onChange}
      options={[
        { value: 'passenger', label: t('passenger'), icon: '🧍' },
        { value: 'driver', label: t('driver'), icon: '🚗' },
      ]}
    />
  );
}
