const { promises: fs, existsSync, readFileSync } = require('fs');
const gulp = require('gulp');
const gulpCleanCss = require('gulp-clean-css');
const gulpCopy = require('gulp-copy');
const gulpHbs = require('gulp-compile-handlebars');
const gulpHelpers = require('./gulp-helpers');
const gulpHtmlMinify = require('gulp-html-minifier');
const gulpFilter = require('gulp-filter');
const gulpRename = require('gulp-rename');
const hbsLayouts = require('handlebars-layouts');
const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const rm = util.promisify(require('rimraf'));

const PROJECT_DIR = path.dirname(__filename);
const BUILD_DIR = path.join(PROJECT_DIR, 'build');
const SRC_DIR = path.join(PROJECT_DIR, 'src');
const LAYOUT_FILE = path.join(SRC_DIR, 'layout.hbs');

const handlebars = gulpHbs.Handlebars;
hbsLayouts.register(handlebars);
handlebars.registerPartial('layout', readFileSync(LAYOUT_FILE, 'utf8'));

gulpHelpers.registerHbsHelpers(handlebars);

async function prepareBuildDir() {
    if (!existsSync(BUILD_DIR)) {
        await fs.mkdir(BUILD_DIR);
    }

    const files = await fs.readdir(BUILD_DIR);
    const rms = files.map(fileName => {
        const filePath = path.join(BUILD_DIR, fileName);
        return rm(filePath);
    });

    await Promise.all(rms);
}

async function handleTemplates() {
    const tplPattern = path.join(SRC_DIR, '**', '*.hbs');
    const context = require('./template-data');

    return gulp.src(await glob(tplPattern))
        .pipe(gulpFilter(['**', '!**/layout.hbs']))
        .pipe(gulpHbs(context))
        .pipe(gulpHtmlMinify({
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            ignoreCustomComments: [/Yandex\.Metrika counter/],
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        }))
        .pipe(gulpHelpers.addCspHashes())
        .pipe(gulpHtmlMinify({
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeOptionalTags: true,
            sortAttributes: true,
            sortClassName: true,
            useShortDoctype: true,
        }))
        .pipe(gulpRename(path => path.extname = '.html'))
        .pipe(gulp.dest(BUILD_DIR));
}

function handleCssAssets() {
    const srcAssets = path.join(PROJECT_DIR, 'src', 'assets', '**', '*');
    const destAssets = path.join(BUILD_DIR, 'assets');

    return gulp.src(srcAssets)
        .pipe(gulpFilter('**/*.css'))
        .pipe(gulpCleanCss())
        .pipe(gulp.dest(destAssets));
}

function handleSimpleAssets() {
    const assets = path.join(PROJECT_DIR, 'src', 'assets', '**', '*');

    return gulp.src(assets)
        .pipe(gulpFilter(['**', '!**/*.css']))
        .pipe(gulpCopy(BUILD_DIR, { prefix: 1 }));
}

function handleRootFiles() {
    const rootFiles = path.join(PROJECT_DIR, 'src', 'root_files', '**', '*');

    return gulp.src(rootFiles)
        .pipe(gulpCopy(BUILD_DIR, { prefix: 2 }));
}

const build = gulp.series(
    prepareBuildDir,
    gulp.parallel(
        handleTemplates,
        handleCssAssets,
        handleSimpleAssets,
        handleRootFiles,
    )
);

gulp.task('build', build);
gulp.task('default', build);

gulp.task('watch', gulp.series(
    build,
    function watchFiles() {
        gulp.watch(['src/*', 'src/**/*'], build);
    }
));
