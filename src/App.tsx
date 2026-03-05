import StorybookUiRoot from '../.rnstorybook';
import RootLayout from '../app/_layout';
import { AppConfig } from './Config/AppConfig';

export function App(): React.ReactElement {
    if (AppConfig.getInstance().isStorybookEnabled) {
        return <StorybookUiRoot />;
    }

    return <RootLayout />;
}
