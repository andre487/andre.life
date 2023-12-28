const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const gulp = require('gulp');
const gulpCleanCss = require('gulp-cleaner-css');
const gulpHtmlMinify = require('gulp-htmlmin');
const {pipeline} = require('readable-stream');
const {
    addCspHashes,
    compilePages,
    buildSitemap,
    getYouTubeData,
} = require('./gulp-helpers');
const {
    SRC_DIR,
    BUILD_DIR,
    PROJECT_DIR,
    YT_DATA_DIR, ASSET_DIR,
} = require('./gulp-helpers/consts');

const pagesPaths = path.join(SRC_DIR, 'templates', 'pages', '*.hbs');

function removeBuildDir() {
    if (!fs.existsSync(BUILD_DIR)) {
        return Promise.resolve();
    }
    return fsp.rm(BUILD_DIR, {recursive: true});
}

function fetchYouTubeData() {
    return pipeline(
        gulp.src(pagesPaths),
        getYouTubeData,
        gulp.dest(YT_DATA_DIR),
    );
}

function buildPages() {
    return pipeline(
        gulp.src(pagesPaths),
        compilePages,
        gulpHtmlMinify({
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
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
        gulp.dest(BUILD_DIR),
    );
}

async function buildCss() {
    return pipeline(
        gulp.src(path.join(ASSET_DIR, '**', '*.css')),
        gulpCleanCss(),
        gulp.dest(path.join(BUILD_DIR, 'assets')),
    );
}

async function copyImages() {
    return pipeline(
        gulp.src([
            path.join(ASSET_DIR, '*.png'),
            path.join(ASSET_DIR, '*.jpg'),
            path.join(YT_DATA_DIR, '*.png'),
            path.join(YT_DATA_DIR, '*.jpg'),
        ]),
        gulp.dest(path.join(BUILD_DIR, 'assets')),
    );
}

function copyRootFiles() {
    return pipeline(
        gulp.src(path.join(PROJECT_DIR, 'src', 'root-files', '*')),
        gulp.dest(BUILD_DIR),
    );
}

const build = gulp.series(
    removeBuildDir,
    gulp.parallel(
        buildCss,
        copyImages,
        copyRootFiles,
    ),
    buildPages,
    buildSitemap,
);

gulp.task('fetch-yt-data', fetchYouTubeData);
gulp.task('build', build);
gulp.task('default', gulp.series(
    fetchYouTubeData,
    build,
));
