import { Platform, ToastAndroid } from 'react-native';

export default function RenderToast (message) {
  Platform.OS === "android"
    ? ToastAndroid.showWithGravityAndOffset(message, ToastAndroid.SHORT, ToastAndroid.BOTTOM, 0, 300)
    : alert(message)
}
