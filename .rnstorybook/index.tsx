import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the auto-generated storybook.requires which sets up global.view
import './storybook.requires';

// Get the view from the global (set up by storybook.requires)
const {view} = require('./storybook.requires');

// Refer to https://github.com/storybookjs/react-native/tree/master/app/react-native#getstorybookui-options
// To find allowed options for getStorybookUI
const StorybookUIRoot = view.getStorybookUI({
    storage: {
        getItem: AsyncStorage.getItem,
        setItem: AsyncStorage.setItem,
    },
});

export default StorybookUIRoot;
