// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightPdf from './integration/starlight-pdf';
import starlightDocSearch from '@astrojs/starlight-docsearch';

// https://astro.build/config
export default defineConfig({
	site: "https://saponlinux.gamersi.at",
	integrations: [
		starlight({
			title: 'How to: SAP® on Linux',
			social: {
				github: 'https://github.com/gamersi/howtosaplinux',
			},
			plugins: [
				starlightDocSearch({
					appId: 'E2EKM6C5QU',
					apiKey: 'f3846f244f446fdde785b93a705a15bc',
					indexName: 'saponlinux-gamersi',
				}),
			],
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
