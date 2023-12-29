const fs = require('fs');
const handlebars = require('handlebars');
const handlebarsLayouts = require('handlebars-layouts');
const through = require('through2');
const Vinyl = require('vinyl');
const registerHelpers = require('./hbs-helpers');
const {LAYOUT_FILE} = require('./consts');
const {getPageContext} = require('./common');

handlebarsLayouts.register(handlebars);
handlebars.registerPartial('layout', fs.readFileSync(LAYOUT_FILE, 'utf8'));
registerHelpers(handlebars);

module.exports = through.obj((file, encoding, callback) => {
    if (file.isNull() || file.isDirectory()) {
        return callback(null, file);
    }

    if (file.isStream()) {
        return callback(new Error('Stream is not supported'), file);
    }

    compilePage(file)
        .then((result) => callback(null, result))
        .catch((e) => callback(e));
});

async function compilePage(file) {
    const {pageName, context} = await getPageContext(file);

    const pageHtml = handlebars
        .compile(file.contents.toString())(context)
        .normalize('NFC');

    const result = new Vinyl(file);
    result.basename = `${pageName}.html`;
    result.contents = Buffer.from(pageHtml);

    return result;
}
