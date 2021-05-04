const fs = require('fs');
const gulp = require('gulp');
const gulpCleanCss = require('gulp-clean-css');
const gulpHbs = require('gulp-compile-handlebars');
const gulpHelpers = require('./gulp-helpers');
const gulpHtmlMinify = require('gulp-html-minifier');
const gulpFilter = require('gulp-filter');
const gulpRename = require('gulp-rename');
const hbsLayouts = require('handlebars-layouts');
const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const { pipeline } = require('readable-stream');

const PROJECT_DIR = path.dirname(__filename);
const SRC_DIR = path.join(PROJECT_DIR, 'src');
const LAYOUT_FILE = path.join(SRC_DIR, 'layout.hbs');
const BUILD_DIR = path.join(PROJECT_DIR, 'build');

const fsp = fs.promises;
const handlebars = gulpHbs.Handlebars;
hbsLayouts.register(handlebars);
handlebars.registerPartial('layout', fs.readFileSync(LAYOUT_FILE, 'utf8'));

gulpHelpers.registerHbsHelpers(handlebars);

function removeBuildDir() {
    return fsp.rmdir(BUILD_DIR, { recursive: true });
}

async function buildPages() {
    const tplPattern = path.join(SRC_DIR, '**', '*.hbs');
    const context = require('./template-data');

    return pipeline(
        gulp.src(await glob(tplPattern)),
        gulpFilter(['**', '!**/layout.hbs']),
        gulpHbs(context),
        gulpHtmlMinify({
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            ignoreCustomComments: [/Yandex\.Metrika counter/],
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        }),
        gulpHelpers.addCspHashes(),
        gulpHtmlMinify({
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeOptionalTags: true,
            sortAttributes: true,
            sortClassName: true,
            useShortDoctype: true,
        }),
        gulpRename(path => path.extname = '.html'),
        gulp.dest(BUILD_DIR)
    );
}

async function buildCss() {
    const srcAssets = path.join(PROJECT_DIR, 'src', 'assets', '**', '*.css');
    const destAssets = path.join(BUILD_DIR, 'assets');
    return pipeline(
        gulp.src(await glob(srcAssets)),
        gulpCleanCss(),
        gulp.dest(destAssets)
    );
}

async function copySimpleAssets() {
    const assets = path.join(PROJECT_DIR, 'src', 'assets', '**', '*');
    return pipeline(
        gulp.src(await glob(assets)),
        gulpFilter(['**', '!**/*.css']),
        gulp.dest(path.join(BUILD_DIR, 'assets'))
    );
}

function copyRootFiles() {
    const rootFiles = path.join(PROJECT_DIR, 'src', 'root-files', '*');
    return pipeline(
        gulp.src(rootFiles),
        gulp.dest(BUILD_DIR)
    );
}

async function buildSitemap() {
    const rootFiles = await fsp.readdir(path.join(PROJECT_DIR, 'src', 'root-files'));
    const htmlFiles = await glob(path.join(BUILD_DIR, '**', '*.html'));

    const rootNames = new Set(rootFiles.map(x => path.basename(x)));
    const siteEntries = [];

    for (const fileAbsPath of htmlFiles) {
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
}

const build = gulp.series(
    removeBuildDir,
    gulp.parallel(
        buildPages,
        buildCss,
        copySimpleAssets,
        copyRootFiles
    ),
    buildSitemap
);

gulp.task('build', build);
gulp.task('default', build);

gulp.task('watch', gulp.series(
    build,
    function watchFiles() {
        gulp.watch(['src/*', 'src/**/*'], build);
    }
));
