import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function InfoModal({ visible, title, message, onClose }: Props) {
  const { t } = useTranslation('common');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: '100%', backgroundColor: '#18181b', borderRadius: 20, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' }}>
          <View style={{ padding: 24, gap: 8 }}>
            <Text style={{ color: '#f4f4f5', fontSize: 17, fontWeight: '700' }}>{title}</Text>
            <Text style={{ color: '#71717a', fontSize: 14, lineHeight: 20 }}>{message}</Text>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#27272a' }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}
            >
              <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '700' }}>{t('gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
