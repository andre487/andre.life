const { readFileSync } = require('fs');
const crypto = require('crypto');
const path = require('path');
const { BUILD_DIR } = require('./consts');

const BASE_URL_PATH = process.env['BASE_URL_PATH'] || '/';

module.exports = function(handlebars) {
    const assetCache = {};

    handlebars.registerHelper('urlFor', function(page) {
        if (page == 'index') {
            return BASE_URL_PATH;
        }
        const snakeCasePage = page.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        return BASE_URL_PATH + snakeCasePage + '.html';
    });

    handlebars.registerHelper('asset', function(file) {
        let version = assetCache[file];
        if (!version) {
            const hash = crypto.createHash('md5');
            hash.update(readFileSync(path.join(BUILD_DIR, 'assets', file)));

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
};
