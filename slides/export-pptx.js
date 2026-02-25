/**
 * Export HTML slides to PPTX — one file per chapter.
 * Takes a screenshot of each slide-section and adds it as a full-bleed slide.
 *
 * Usage: node export-pptx.js
 */

const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ── Configuration ──
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const ANIMATION_WAIT = 800; // ms to wait for animations

const CHAPTERS = [
    {
        name: 'Chapter1-Foundations',
        title: 'Chapter 1 – Foundations',
        files: [
            'chapter1/slide01-what-is-vibe-coding.html',
            'chapter1/slide02-traditional-vs-ai.html',
            'chapter1/slide03-it-product-components.html',
            'chapter1/slide04-nocode-vs-lowcode.html',
        ],
    },
    {
        name: 'Chapter2-FirstProjects',
        title: 'Chapter 2 – First Projects',
        files: [
            'chapter2/slide05-cv-website.html',
            'chapter2/slide06-bio-link.html',
            'chapter2/slide07-business-website.html',
            'chapter2/slide08-landing-page.html',
            'chapter2/slide09-digital-menu.html',
        ],
    },
    {
        name: 'Chapter3-WebApps',
        title: 'Chapter 3 – Web Apps',
        files: [
            'chapter3/slide10-brd-generator.html',
            'chapter3/slide11-data-dashboard.html',
            'chapter3/slide12-mini-calculator.html',
            'chapter3/slide13-edit-with-prompt.html',
        ],
    },
    {
        name: 'Chapter4-UIDesign',
        title: 'Chapter 4 – UI Design',
        files: [
            'chapter4/slide15-clean-ui-design.html',
            'chapter4/slide16-layout-color-prompt.html',
            'chapter4/slide17-mobile-responsive.html',
            'chapter4/slide18-ux-checklist.html',
        ],
    },
    {
        name: 'Chapter5-DeployWorkflow',
        title: 'Chapter 5 – Deploy & Workflow',
        files: [
            'chapter5/slide19-deploy-website.html',
            'chapter5/slide20-e2e-workflow.html',
        ],
    },
];

const SLIDES_DIR = __dirname;
const EXPORTS_DIR = path.join(SLIDES_DIR, 'exports');
const SCREENSHOTS_DIR = path.join(EXPORTS_DIR, 'screenshots');

// ── Simple HTTP server to serve local files ──
function startServer(rootDir, port) {
    return new Promise((resolve) => {
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.woff2': 'font/woff2',
            '.woff': 'font/woff',
            '.ttf': 'font/ttf',
        };

        const server = http.createServer((req, res) => {
            let filePath = path.join(rootDir, decodeURIComponent(req.url));
            if (filePath.endsWith(path.sep)) filePath += 'index.html';

            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
        });

        server.listen(port, () => {
            console.log(`  📡 Server running at http://localhost:${port}`);
            resolve(server);
        });
    });
}

// ── Capture all sections of an HTML slide ──
async function captureSlide(page, url, slideBaseName) {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, ANIMATION_WAIT));

    // Get total number of sections
    const sectionCount = await page.evaluate(() => {
        return document.querySelectorAll('.slide-section').length;
    });

    console.log(`    📸 ${slideBaseName}: ${sectionCount} sections`);
    const screenshots = [];

    for (let i = 0; i < sectionCount; i++) {
        // Activate this section (remove active from all, add to current)
        await page.evaluate((idx) => {
            const sections = document.querySelectorAll('.slide-section');
            sections.forEach((s) => s.classList.remove('active'));
            sections[idx].classList.add('active');

            // Force all animations to complete immediately
            const animated = sections[idx].querySelectorAll('.animate-in, [class*="animate-in-delay"]');
            animated.forEach((el) => {
                el.style.animation = 'none';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });

            // Update progress bar
            const fill = document.querySelector('.progress-fill');
            if (fill) fill.style.width = ((idx + 1) / sections.length * 100) + '%';

            // Update counter
            const counter = document.querySelector('.page-counter');
            if (counter) counter.innerHTML = `<span class="current">${idx + 1}</span> / ${sections.length}`;
        }, i);

        await new Promise((r) => setTimeout(r, 300));

        const screenshotPath = path.join(SCREENSHOTS_DIR, `${slideBaseName}_section${String(i + 1).padStart(2, '0')}.png`);
        await page.screenshot({ path: screenshotPath, type: 'png' });
        screenshots.push(screenshotPath);
    }

    return screenshots;
}

// ── Create PPTX from screenshots ──
async function createPptx(chapterName, chapterTitle, screenshotPaths) {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9)
    pptx.author = 'Vibe Coding';
    pptx.title = chapterTitle;
    pptx.subject = 'Vibe Coding 2026 Course Slides';

    for (const imgPath of screenshotPaths) {
        const slide = pptx.addSlide();
        const imgData = fs.readFileSync(imgPath);
        const base64 = imgData.toString('base64');
        const ext = path.extname(imgPath).toLowerCase().replace('.', '');

        slide.addImage({
            data: `image/${ext};base64,${base64}`,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%',
        });
    }

    const outputPath = path.join(EXPORTS_DIR, `${chapterName}.pptx`);
    await pptx.writeFile({ fileName: outputPath });
    return outputPath;
}

// ── Main ──
async function main() {
    console.log('🚀 Exporting HTML slides to PPTX...\n');

    // Create directories
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    // Start local server
    const PORT = 9876;
    const server = await startServer(SLIDES_DIR, PORT);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
        defaultViewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
    });

    const page = await browser.newPage();

    try {
        for (const chapter of CHAPTERS) {
            console.log(`\n📁 ${chapter.title}`);
            const allScreenshots = [];

            for (const file of chapter.files) {
                const url = `http://localhost:${PORT}/${file}`;
                const baseName = path.basename(file, '.html');
                const screenshots = await captureSlide(page, url, baseName);
                allScreenshots.push(...screenshots);
            }

            const outputPath = await createPptx(chapter.name, chapter.title, allScreenshots);
            console.log(`  ✅ Created: ${path.basename(outputPath)} (${allScreenshots.length} slides)`);
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await browser.close();
        server.close();
    }

    // Clean up screenshots
    console.log('\n🧹 Cleaning up screenshots...');
    fs.rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });

    console.log('\n🎉 Done! PPTX files saved to: slides/exports/');
}

main();
