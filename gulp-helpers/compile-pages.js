const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const handlebarsLayouts = require('handlebars-layouts');
const through = require('through2');
const Vinyl = require('vinyl');
const yaml = require('js-yaml');
const registerHelpers = require('./hbs-helpers');

const fsp = fs.promises;

const PROJECT_DIR = path.resolve(path.join(path.dirname(__filename), '..'));
const DATA_DIR = path.join(PROJECT_DIR, 'template-data');
const LAYOUT_FILE = path.join(PROJECT_DIR, 'src', 'templates', 'layout', 'main.hbs');

handlebarsLayouts.register(handlebars);
handlebars.registerPartial('layout', fs.readFileSync(LAYOUT_FILE, 'utf8'));
registerHelpers(handlebars);

const commonData = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'common.yaml')));

module.exports = through.obj((file, encoding, callback) => {
    if (file.isNull() || file.isDirectory()) {
        return callback(null, file);
    }

    if (file.isStream()) {
        return callback(new Error('Stream is not supported'), file);
    }

    compilePage(file)
        .then(result => callback(null, result))
        .catch(e => callback(e));
});

async function compilePage(file) {
    const baseName = file.basename;
    const pageName = baseName.substring(0, baseName.lastIndexOf('.'));

    const templatePath = path.join(DATA_DIR, 'pages', `${pageName}.yaml`);
    const pageData = yaml.load(await fsp.readFile(templatePath));
    const context = Object.assign({}, commonData, pageData);

    const pageHtml = handlebars.compile(file.contents.toString())(context);

    const result = new Vinyl(file);
    result.basename = `${pageName}.html`;
    result.contents = Buffer.from(pageHtml);

    return result;
}
