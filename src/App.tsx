import { AppConfig } from '@/Config';
import StorybookUiRoot from '../.rnstorybook';
import RootLayout from '../app/_layout';

export function App(): React.ReactElement {
    if (AppConfig.isStorybookEnabled) {
        return <StorybookUiRoot />;
    }

    return <RootLayout />;
}
