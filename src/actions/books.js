import DocumentPicker from 'react-native-document-picker'
import { checkStoragePermissions, getStoragePermission } from '../utils/permissions';

export const addBook = () => async (dispatch) => {
  let granted = await checkStoragePermissions();
  if (!granted) await getStoragePermission();

  try {
    const { url, name, type } = await DocumentPicker.pick({
      type: [DocumentPicker.types.pdf, 'epub'],
    })
    // const components = url.split('/');
    // const file = components[components.length - 1].split('.');
    // if (file[file.length - 1] !== 'epub') {
    // 	return showToast('Invalid file. Only "epub" files are allowed');
    // }
    dispatch({
      type: 'add_books',
      payload: { title: name, url, type }
    });
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      // User cancelled the picker, exit any dialogs or menus and move on
    } else {
      throw err
    }
  }
};

export const addMetadata = (data, index) => {
  return { type: 'add_metadata', payload: { data, index } };
};

export const removeBook = (index) => {
  return { type: 'remove_book', payload: index };
};

export const sortBook = (index) => {
  return { type: 'sort_book', payload: index };
};
