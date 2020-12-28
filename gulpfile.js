const crypto = require('crypto');
const { promises: fs, existsSync, readFileSync } = require('fs');
const gulp = require('gulp');
const gulpHbs = require('gulp-compile-handlebars');
const gulpCopy = require('gulp-copy');
const gulpFilter = require('gulp-filter');
const gulpRename = require('gulp-rename');
const hbsLayouts = require('handlebars-layouts');
const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const rm = util.promisify(require('rimraf'));

const BASE_URL_PATH = process.env['BASE_URL_PATH'] || '/';

const PROJECT_DIR = path.dirname(__filename);
const BUILD_DIR = path.join(PROJECT_DIR, 'build');
const SRC_DIR = path.join(PROJECT_DIR, 'src');
const LAYOUT_FILE = path.join(SRC_DIR, 'layout.hbs');

const handlebars = gulpHbs.Handlebars;
hbsLayouts.register(handlebars);
handlebars.registerPartial('layout', readFileSync(LAYOUT_FILE, 'utf8'));

handlebars.registerHelper('urlFor', function(page) {
    if (page == 'index') {
        return BASE_URL_PATH;
    }
    const snakeCasePage = page.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    return BASE_URL_PATH + snakeCasePage + '.html';
});

const assetCache = {};

handlebars.registerHelper('asset', function(file) {
    let version = assetCache[file];
    if (!version) {
        const hash = crypto.createHash('md5');
        hash.update(readFileSync(path.join(SRC_DIR, 'assets', file)));

        const digest = hash.digest();
        const num = digest.readBigUInt64BE() + digest.readBigUInt64BE(8);

        version = assetCache[file] = num.toString(36);
    }
    return `${BASE_URL_PATH}assets/${file}?v=${version}`;
});

handlebars.registerHelper('ifEquals', function(a, b, ops) {
    return a === b ? ops.fn(this) : ops.inverse(this);
});

handlebars.registerHelper('ifNotEquals', function(a, b, ops) {
    return a !== b ? ops.fn(this) : ops.inverse(this);
});

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
    const layout = path.join(SRC_DIR, 'layout.hbs');

    const context = require('./template-data');
    const options = { defaultLayout: layout };

    return gulp.src(await glob(tplPattern))
        .pipe(gulpFilter(['**', '!**/layout.hbs']))
        .pipe(gulpHbs(context, options))
        .pipe(gulpRename(path => path.extname = '.html'))
        .pipe(gulp.dest(BUILD_DIR));
}

function handleAssets() {
    const assets = path.join(PROJECT_DIR, 'src', 'assets', '**', '*');

    return gulp.src(assets)
        .pipe(gulpCopy(BUILD_DIR, { prefix: 1 }));
}

function handleRootFiles() {
    const rootFiles = path.join(PROJECT_DIR, 'src', 'root_files', '**', '*');

    return gulp.src(rootFiles)
        .pipe(gulpCopy(BUILD_DIR, { prefix: 2 }));
}

exports.default = gulp.series(
    prepareBuildDir,
    gulp.parallel(
        handleTemplates,
        handleAssets,
        handleRootFiles,
    )
);
