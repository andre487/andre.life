const fsp = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const PROJECT_DIR = path.resolve(path.join(path.dirname(__filename), '..'));
const BUILD_DIR = path.join(PROJECT_DIR, 'build');

module.exports = async function buildSitemap() {
    const rootFiles = await fsp.readdir(path.join(PROJECT_DIR, 'src', 'root-files'));
    const htmlFiles = await glob(path.join(BUILD_DIR, '**', '*.html'));

    const rootNames = new Set(rootFiles.map(x => path.basename(x)));
    const siteEntries = [];

    for (const fileAbsPath of htmlFiles) {
        if (fileAbsPath.endsWith('404.html')) {
            continue;
        }
        const filePath = path.relative(BUILD_DIR, fileAbsPath);
        if (rootNames.has(path.basename(filePath))) {
            continue;
        }
        siteEntries.push(`<url><loc>https://andre.life/${filePath}</loc></url>`);
    }

    const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${siteEntries.join('\n')}
</urlset>
`;

    return fsp.writeFile(path.join(BUILD_DIR, 'sitemap.xml'), content);
};
