const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { BUILD_DIR, SRC_DIR, YT_DATA_DIR } = require('./consts');

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
            let filePath = path.join(BUILD_DIR, 'assets', file);
            if (!fs.existsSync(filePath)) {
                filePath = path.join(SRC_DIR, 'assets', file);
            }
            if (!fs.existsSync(filePath)) {
                filePath = path.join(YT_DATA_DIR, file);
            }
            if (!fs.existsSync(filePath)) {
                throw new Error(`There is no file ${file}`);
            }

            const hash = crypto.createHash('md5');
            hash.update(fs.readFileSync(filePath));

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
