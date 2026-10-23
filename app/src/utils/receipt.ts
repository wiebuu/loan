import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  base64: string;
}

/** Pick a receipt photo from the library or take one. Returns the photo, or an error to show. */
export async function pickReceipt(from: 'library' | 'camera'): Promise<{ photo?: PickedPhoto; error?: string } | null> {
  if (from === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { error: 'Allow camera access in Settings to take a photo' };
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
  const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  // On web the picker gives a data: URI instead of a separate base64 string.
  const base64 = asset.base64 ?? (asset.uri.startsWith('data:') ? asset.uri.split(',')[1] : null);
  if (!base64) return { error: 'Could not read that photo. Try another one' };
  if (base64.length * 0.75 > 5 * 1024 * 1024) return { error: 'That photo is too big. Pick one under 5 MB' };
  return { photo: { uri: asset.uri, base64 } };
}
