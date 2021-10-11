import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import StaticServer from 'react-native-static-server';
import { DocumentDirectoryPath, MainBundlePath } from 'react-native-fs';
import { WebView } from 'react-native-webview';
import SideMenu from 'react-native-side-menu';
import { connect } from 'react-redux';
import * as actions from '../actions';
import Drawer from '../components/Drawer';
import DictionaryModal from '../components/DictionaryModal';
import showToast from '../components/Toast';
import Spinner from '../components/Spinner';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import themeToStyles from '../utils/themeToStyles';

const serverConfig = { localOnly: true, keepAlive: true };

const getPath = () => {
  return Platform.OS === "android"
    ? DocumentDirectoryPath
    : MainBundlePath;
}

function EpubReader (props) {
  const [bookUrl, setBookUrl] = useState(null);
  const [htmlUrl, setHtmlUrl] = useState(null);
  const [server, setServer] = useState(null);
  const [isDrawer, setDrawer] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [isModal, setModal] = useState(false);

  const webview = useRef();
  const { params } = props.route;
  const currentLocation = props.locations[props.books[params.index].key];
  const bookLocations = props.books[params.index].locations;
  const { bg, fg, size, height } = props.settings;

  useLayoutEffect(() => {
    props.navigation.setOptions({
      headerRight: () => (
        <View style={styles.iconWrapper}>
          <Icon
            name="g-translate"
            type="material"
            size={21}
            color={props.settings.fg}
            style={styles.headerIcon}
            onPress={onTranslation}
          />
          <Icon
            name="menu"
            size={20}
            color={props.settings.fg}
            style={styles.headerIcon}
            onPress={() => setDrawer(!isDrawer)}
          />
        </View>
      )
    });
  }, [props.navigation, isDrawer, selectedText]);

  const path = getPath();

  useEffect(() => {
    showToast('Opening book');

    const startServer = () => {
      const newServer = new StaticServer(0, path, serverConfig);
      newServer.start().then(url => {
        const bookUrl = `${url}/books/${params.url}`;
        const htmlUrl = `${url}/html/epub.html`;
        console.log("-------------------------------------------------------------------");
        console.log("host path", path);
        console.log("Serving at URL", url);
        console.log("bookUrl", bookUrl);
        console.log("-------------------------------------------------------------------");
        setBookUrl(bookUrl);
        setHtmlUrl(htmlUrl)
        setServer(newServer)
      });
    };

    startServer();

    return () => {
      props.sortBook(params.index);
      server && server.stop();
    };
  }, [path, setBookUrl]);

  useEffect(() => {
    webview.current?.injectJavaScript(`
		window.rendition.themes.register({ theme: "${JSON.stringify(themeToStyles(props.settings))}" });
		window.rendition.themes.select('theme');`);
    refresh();
    StatusBar.setBackgroundColor(props.settings.bg, true);
    StatusBar.setBarStyle(`${props.settings.fg === '#000000' ? 'dark' : 'light'}-content`);
  }, [bg, fg, size, height]);

  let injectedJS = `window.BOOK_PATH = "${bookUrl}";
		window.LOCATIONS = ${bookLocations};
		window.THEME = ${JSON.stringify(themeToStyles(props.settings))};
	`;

  if (currentLocation) {
    injectedJS = `${injectedJS}
		window.BOOK_LOCATION = '${currentLocation}';
		`;
  }

  function goPrev () {
    webview.current?.injectJavaScript(`window.rendition.prev()`);
  }

  function goNext () {
    webview.current?.injectJavaScript(`window.rendition.next()`);
  }

  function goToLocation (href) {
    webview.current?.injectJavaScript(`window.rendition.display('${href}')`);
    isDrawer && setDrawer(false);
  }

  function refresh () {
    webview.current?.injectJavaScript(`window.BOOK_LOCATION = "${currentLocation}"`);
    webview.current?.reload();
  }

  function onTranslation () {
    props.navigation.navigate('dictionary', { selected: selectedText });
    setTimeout(refresh, 200);
  }

  function onSearch (q) {
    webview.current?.injectJavaScript(`
		Promise.all(
			window.book.spine.spineItems.map((item) => {
				return item.load(window.book.load.bind(window.book)).then(() => {
					let results = item.find('${q}'.trim());
					item.unload();
					return Promise.resolve(results);
				});
			})
		).then((results) =>
			window.ReactNativeWebView.postMessage(
				JSON.stringify({ type: 'search', results: [].concat.apply([], results) })
			)
		)`);
  }

  function handleMessage (e) {
    let parsedData = JSON.parse(e.nativeEvent.data);
    let { type } = parsedData;
    delete parsedData.type;
    switch (type) {
      case 'selected': {
        setSelectedText(parsedData.selected);
        if (parsedData.selected.length < 40) setModal(true);
        return;
      }
      case 'loc': {
        const { progress, totalPages } = parsedData;
        props.addMetadata({ progress, totalPages }, params.index);
        delete parsedData.progress;
        delete parsedData.totalPages;
        return props.addLocation(parsedData);
      }
      case 'key':
      case 'metadata':
      case 'contents':
      case 'locations':
        return props.addMetadata(parsedData, params.index);
      case 'search':
        return setSearchResults(parsedData.results);
      default:
        return;
    }
  }

  if (!bookUrl) {
    return <Spinner fg={props.settings.fg} bg={props.settings.bg}/>;
  }

  const menu = (
    <Drawer
      index={params.index}
      goToLocation={goToLocation}
      onSearch={onSearch}
      searchResults={searchResults}
    />
  );

  return (
    <SideMenu menu={menu} isOpen={isDrawer} menuPosition="right" onChange={setDrawer}>
      <WebView
        ref={webview}
        style={[styles.wholeScreen, { backgroundColor: props.settings.bg }]}
        source={{ uri: htmlUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onMessage={handleMessage}
      />

      <Footer
        goNext={goNext}
        goPrev={goPrev}
        locations={bookLocations}
        goToLocation={goToLocation}
        index={params.index}
      />
      {isModal && (
        <DictionaryModal
          isVisible={isModal}
          selected={selectedText}
          hide={() => setModal(false)}
          onTranslation={onTranslation}
        />
      )}
    </SideMenu>
  );
}

function mapStateToProps (state) {
  return {
    settings: state.settings,
    books: state.books,
    locations: state.locations
  };
}

export default connect(
  mapStateToProps,
  actions
)(EpubReader);

const styles = {
  wholeScreen: { flex: 1 },
  headerIcon: { padding: 5 },
  iconWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: 100
  }
};
