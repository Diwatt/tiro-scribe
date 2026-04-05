import { Container } from '@/Core/Container';
import StorybookUiRoot from '../.rnstorybook';
import RootLayout from '../assets/app/_layout';
import { AppConfig } from './Core/AppConfig';

export function App(): React.ReactElement {
    if (Container.get(AppConfig).isStorybookEnabled) {
        return <StorybookUiRoot />;
    }

    return <RootLayout />;
}
