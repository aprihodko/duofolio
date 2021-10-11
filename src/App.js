import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from './store';
import Root from './Root';
import { copyFileAssets, DocumentDirectoryPath, mkdir } from "react-native-fs";

async function moveAndroidFiles() {
  if (Platform.OS === "android") {
    await mkdir(DocumentDirectoryPath + '/html');
    const files = ['html/epub.html'];

    await files.forEach(async file => {
      await copyFileAssets(file, `${DocumentDirectoryPath}/${file}`);
    });
  }
}

export default function App () {
	useEffect(() => {
		if (Text.defaultProps == null) Text.defaultProps = {};
		Text.defaultProps.allowFontScaling = false;

		moveAndroidFiles();
	}, []);

	return (
		<Provider store={store}>
			<PersistGate persistor={persistor}>
				<NavigationContainer>
					<Root/>
				</NavigationContainer>
			</PersistGate>
		</Provider>
	);
}
