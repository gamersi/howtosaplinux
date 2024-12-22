import type { AstroIntegration } from 'astro';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { PDFDocument } from 'pdf-lib';

interface PdfOptions {
  outputDir?: string;
  format?: 'a4' | 'letter';
  includePages?: string[];
  excludePages?: string[];
  port?: number;
  locales?: string[];
  defaultLocale?: string;
}

async function mergePDFs(pdfPaths: string[], outputPath: string) {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfPath of pdfPaths) {
    const pdfBytes = await fs.readFile(pdfPath);
    // @ts-ignore
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const mergedPdfFile = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfFile);
}

function sortFiles(files: string[]): string[] {
    const indexFile = files.find(file => file.endsWith('index.html'));
    const otherFiles = files.filter(file => file !== indexFile);
  
    const sortedFiles = otherFiles.sort((a, b) => {
      return a.localeCompare(b);
    });
  
    return indexFile ? [indexFile, ...sortedFiles] : sortedFiles;
}

export default function starlightPdf(options: PdfOptions = {}): AstroIntegration {
  const {
    outputDir = 'dist/pdf',
    format = 'a4',
    includePages = [],
    excludePages = [],
    port = 1243,
    locales = [''],  // Default locale (root) only
    defaultLocale = ''
  } = options;

  return {
    name: 'starlight-pdf',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        console.log('📄 Generating PDFs from Starlight documentation...');

        const app = express();
        app.use(express.static('dist'));
        const server = app.listen(port);

        try {
          await fs.mkdir(path.join(process.cwd(), outputDir), { recursive: true });

          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();

          const localeFiles: Record<string, string[]> = {};
          // @ts-ignore
          const files = await fs.readdir(dir, { recursive: true });
          
          for (const locale of locales) {
            const localePath = locale ? locale : defaultLocale;
            
            const htmlFiles = files
              .filter(file => typeof file === 'string' && 
                            file.endsWith('.html') &&
                            !file.includes('404.html') &&  // Exclude 404 pages
                            !file.includes('500.html') &&  // Exclude error pages
                            file.startsWith(locale) &&  // Filter by locale
                            !locales.some(l => l !== locale && file.startsWith(l) && l !== ''))  // Exclude other locales
              .filter(file => {
                if (includePages.length > 0) {
                  return includePages.some(pattern => new RegExp(pattern).test(file));
                }
                if (excludePages.length > 0) {
                  return !excludePages.some(pattern => new RegExp(pattern).test(file));
                }
                return true;
              })

            localeFiles[localePath] = sortFiles(htmlFiles);
          }

          for (const [locale, files] of Object.entries(localeFiles)) {
            const localePdfs: string[] = [];

            for (const file of files) {
              const relativePath = file.replace('.html', '.pdf');
              const relativeFilePath = file.split(path.sep).join('/');
              const outputPath = path.join(process.cwd(), outputDir, 'temp', relativePath);
              const fileUrl = `http://localhost:${port}/${relativeFilePath}`;

              await fs.mkdir(path.dirname(outputPath), { recursive: true });

              await page.goto(fileUrl, {
                waitUntil: 'networkidle0'
              });

              await page.addStyleTag({
                content: `
                * {
                    padding-top: 0 !important;
                }
                nav, 
                .sidebar,
                .nav-groups,
                .right-sidebar,
                .site-header,
                button,
                header,
                .pagination-links,
                [data-pagefind-ignore],
                .edit-on-github {
                    display: none !important;
                }
                `
              });

              /*@page {
                    margin: 0;
              }*/

              await page.evaluate(() => {
                const links = document.querySelectorAll('a');
                links.forEach(link => {
                    link.setAttribute('target', '_blank');
                    if (link.href.startsWith(window.location.origin)) {
                        link.remove();
                    }
                });
            });

              await page.pdf({
                path: outputPath,
                format,
                printBackground: true,
                margin: {
                  top: '1cm',
                  right: '0',
                  bottom: '0',
                  left: '0'
                }
              });

              localePdfs.push(outputPath);
            }

            if (localePdfs.length > 0) {
              const localeOutputPath = path.join(
                process.cwd(), 
                outputDir, 
                `documentation${locale ? `-${locale}` : ''}.pdf`
              );
              
              await mergePDFs(localePdfs, localeOutputPath);
              console.log(`Generated merged PDF for locale '${locale || 'default'}': ${localeOutputPath}`);
            }
          }

          await fs.rm(path.join(process.cwd(), outputDir, 'temp'), { recursive: true, force: true });

          await browser.close();
          server.close();
          console.log('✅ PDF generation complete!');

        } catch (error) {
          console.error('Error generating PDFs:', error);
          throw error;
        }
      }
    }
  };
}