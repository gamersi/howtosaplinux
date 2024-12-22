// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightPdf from './integration/starlight-pdf';

// https://astro.build/config
export default defineConfig({
	site: "https://saponlinux.gamersi.at",
	integrations: [
		starlight({
			title: 'How to: SAP® on Linux',
			social: {
				github: 'https://github.com/gamersi/howtosaplinux',
			},
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
				de: {
					label: 'Deutsch',
					lang: 'de-DE'
				}
			},
			sidebar: [
				{
					label: 'Guides',
					autogenerate: { directory: 'guides' },
				}
			],
		}),
		starlightPdf({
			outputDir: 'dist/pdf',
			format: 'a4',
			defaultLocale: '',
			locales: ['de', '']
		}),
	],
});
