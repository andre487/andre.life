const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpCleanCss = require('gulp-cleaner-css');
const gulpHtmlMinify = require('gulp-html-minifier');
const { pipeline } = require('readable-stream');
const { addCspHashes, compilePages, buildSitemap } = require('./gulp-helpers');

const fsp = fs.promises;

const PROJECT_DIR = path.dirname(__filename);
const SRC_DIR = path.join(PROJECT_DIR, 'src');
const ASSET_DIR = path.join(PROJECT_DIR, 'src', 'assets');
const BUILD_DIR = path.join(PROJECT_DIR, 'build');

function removeBuildDir() {
    if (!fs.existsSync(BUILD_DIR)) {
        return Promise.resolve();
    }
    return fsp.rm(BUILD_DIR, { recursive: true });
}

function buildPages() {
    return pipeline(
        gulp.src(path.join(SRC_DIR, 'templates', 'pages', '*.hbs')),
        compilePages,
        gulpHtmlMinify({
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        }),
        addCspHashes,
        gulpHtmlMinify({
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeOptionalTags: true,
            sortAttributes: true,
            sortClassName: true,
            useShortDoctype: true,
        }),
        gulp.dest(BUILD_DIR)
    );
}

async function buildCss() {
    return pipeline(
        gulp.src(path.join(ASSET_DIR, '**', '*.css')),
        gulpCleanCss(),
        gulp.dest(path.join(BUILD_DIR, 'assets'))
    );
}

async function copyImages() {
    return pipeline(
        gulp.src([path.join(ASSET_DIR, '*.png'), path.join(ASSET_DIR, '*.jpg')]),
        gulp.dest(path.join(BUILD_DIR, 'assets'))
    );
}

function copyRootFiles() {
    return pipeline(
        gulp.src(path.join(PROJECT_DIR, 'src', 'root-files', '*')),
        gulp.dest(BUILD_DIR)
    );
}

const build = gulp.series(
    removeBuildDir,
    gulp.parallel(
        buildPages,
        buildCss,
        copyImages,
        copyRootFiles
    ),
    buildSitemap
);

gulp.task('build', build);
gulp.task('default', build);
