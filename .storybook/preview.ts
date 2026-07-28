import type { Preview } from '@storybook/vue3-vite'
// Load the app's global styles (Tailwind) so controls render exactly as in the app.
import '../src/assets/main.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: 'todo' },
  },
}

export default preview;
