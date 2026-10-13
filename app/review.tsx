import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Field = {
  label: string;
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'url';
  placeholder: string;
};

const FIELDS: Field[] = [
  { label: 'Full Name', key: 'name', icon: 'person-outline', placeholder: 'e.g. Rajesh Kumar' },
  { label: 'Designation', key: 'designation', icon: 'briefcase-outline', placeholder: 'e.g. Sales Manager' },
  { label: 'Company', key: 'company', icon: 'business-outline', placeholder: 'e.g. Acme Corp' },
  { label: 'Phone', key: 'phone', icon: 'call-outline', keyboardType: 'phone-pad', placeholder: '+91 98765 43210' },
  { label: 'Mobile', key: 'mobile', icon: 'phone-portrait-outline', keyboardType: 'phone-pad', placeholder: '+91 98765 43210' },
  { label: 'Email', key: 'email', icon: 'mail-outline', keyboardType: 'email-address', placeholder: 'name@company.com' },
  { label: 'Website', key: 'website', icon: 'globe-outline', keyboardType: 'url', placeholder: 'www.company.com' },
  { label: 'Address', key: 'address', icon: 'location-outline', placeholder: 'Office address' },
];

export default function ReviewScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeImage, setActiveImage] = useState<'front' | 'back'>('front');

  const [fields, setFields] = useState({
    name: params.name || '',
    designation: params.designation || '',
    company: params.company || '',
    phone: params.phone || '',
    mobile: params.mobile || '',
    email: params.email || '',
    website: params.website || '',
    address: params.address || '',
  });

  const frontUri = params.frontUri || '';
  const backUri = params.backUri || '';

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const saveContact = async () => {
    if (!fields.name.trim() && !fields.phone.trim()) {
      Alert.alert('Missing Info', 'Please enter at least a name or phone number.');
      return;
    }

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Cannot save contact without contacts permission.');
      return;
    }

    setSaving(true);
    try {
      // Build contact object
      const contact: Contacts.Contact = {
        contactType: Contacts.ContactTypes.Person,
        name: fields.name,
        firstName: fields.name.split(' ')[0] || '',
        lastName: fields.name.split(' ').slice(1).join(' ') || '',
        company: fields.company,
        jobTitle: fields.designation,
        phoneNumbers: [],
        emails: [],
        urls: [],
        addresses: [],
        note: `Scanned by Card Scanner\n${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      };

      if (fields.phone) {
        contact.phoneNumbers!.push({
          label: 'work',
          number: fields.phone,
        });
      }
      if (fields.mobile && fields.mobile !== fields.phone) {
        contact.phoneNumbers!.push({
          label: 'mobile',
          number: fields.mobile,
        });
      }
      if (fields.email) {
        contact.emails!.push({ label: 'work', email: fields.email });
      }
      if (fields.website) {
        contact.urls!.push({ label: 'work', url: fields.website });
      }
      if (fields.address) {
        contact.addresses!.push({
          label: 'work',
          street: fields.address,
        });
      }

      const contactId = await Contacts.addContactAsync(contact);

      // Save card images to permanent storage (already in documentDirectory/cards/)
      // Log to local history
      const historyEntry = {
        id: contactId || Date.now().toString(),
        name: fields.name,
        company: fields.company,
        frontImageUri: frontUri,
        backImageUri: backUri,
        scannedAt: new Date().toISOString(),
        contactId,
      };

      const existing = await AsyncStorage.getItem('scanned_cards');
      const history = existing ? JSON.parse(existing) : [];
      history.unshift(historyEntry);
      await AsyncStorage.setItem('scanned_cards', JSON.stringify(history.slice(0, 50)));

      Alert.alert(
        'Saved! ✓',
        `${fields.name || 'Contact'} has been saved to your device contacts.`,
        [{ text: 'Done', onPress: () => router.push('/') }]
      );
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Card Images */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionLabel}>Card Images</Text>
          <View style={styles.imageTabs}>
            <TouchableOpacity
              style={[styles.imageTab, activeImage === 'front' && styles.imageTabActive]}
              onPress={() => setActiveImage('front')}
            >
              <Text style={[styles.imageTabText, activeImage === 'front' && styles.imageTabTextActive]}>
                Front
              </Text>
            </TouchableOpacity>
            {backUri ? (
              <TouchableOpacity
                style={[styles.imageTab, activeImage === 'back' && styles.imageTabActive]}
                onPress={() => setActiveImage('back')}
              >
                <Text style={[styles.imageTabText, activeImage === 'back' && styles.imageTabTextActive]}>
                  Back
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.imageTab, styles.imageTabDisabled]}>
                <Text style={styles.imageTabTextDisabled}>Back (not scanned)</Text>
              </View>
            )}
          </View>
          <Image
            source={{ uri: activeImage === 'front' ? frontUri : backUri }}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </View>

        {/* Fields */}
        <View style={styles.fieldsSection}>
          <Text style={styles.sectionLabel}>Contact Details</Text>
          <Text style={styles.sectionHint}>
            Review and edit the extracted information before saving
          </Text>

          {FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Ionicons name={field.icon} size={18} color="#4361ee" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={fields[field.key as keyof typeof fields]}
                  onChangeText={(val) => updateField(field.key, val)}
                  placeholder={field.placeholder}
                  placeholderTextColor="#c0cfe0"
                  keyboardType={field.keyboardType || 'default'}
                  autoCapitalize={field.keyboardType === 'email-address' ? 'none' : 'words'}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveContact}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save to Contacts</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  imageSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4361ee',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  imageTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  imageTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#c0cfe0',
  },
  imageTabActive: { backgroundColor: '#4361ee', borderColor: '#4361ee' },
  imageTabDisabled: { borderColor: '#e8edf2' },
  imageTabText: { fontSize: 13, fontWeight: '600', color: '#667eaa' },
  imageTabTextActive: { color: '#fff' },
  imageTabTextDisabled: { fontSize: 13, fontWeight: '600', color: '#c0cfe0' },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#f0f4f8',
  },
  fieldsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHint: { fontSize: 13, color: '#8899aa', marginBottom: 16, marginTop: -4 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef1fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8899aa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    fontSize: 15,
    color: '#1a1a2e',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    paddingBottom: 4,
  },
  bottomPad: { height: 100 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4361ee',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
