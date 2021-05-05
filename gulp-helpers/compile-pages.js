const fs = require('fs');
const path = require('path');
const get = require('lodash/get');
const fetch = require('node-fetch');
const merge = require('lodash/merge');
const handlebars = require('handlebars');
const handlebarsLayouts = require('handlebars-layouts');
const moment = require('moment');
const through = require('through2');
const thr = require('throw');
const Vinyl = require('vinyl');
const yaml = require('js-yaml');
const registerHelpers = require('./hbs-helpers');
require('moment/locale/ru');

const fsp = fs.promises;

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
let YOUTUBE_API_KEY = null;

const PROJECT_DIR = path.resolve(path.join(path.dirname(__filename), '..'));
const DATA_DIR = path.join(PROJECT_DIR, 'data');
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
    const context = merge({}, commonData, pageData);

    if (context.techTalks) {
        context.techTalks = await handleVideoLinkList(context.techTalks);
    }

    const pageHtml = handlebars.compile(file.contents.toString())(context);

    const result = new Vinyl(file);
    result.basename = `${pageName}.html`;
    result.contents = Buffer.from(pageHtml);

    return result;
}

async function handleVideoLinkList(linkList) {
    return Promise.all(
        linkList.map(async item => {
            if (item.autoSnippet) {
                return merge({}, item, await getAutoSnippetData(item));
            }
            return item;
        })
    );
}

async function getAutoSnippetData(item) {
    const urlData = new URL(item.link);
    if (urlData.host !== 'youtu.be') {
        throw new Error(`Only youtu.be is supported, not ${urlData.host}`);
    }

    if (!YOUTUBE_API_KEY) {
        YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || thr('You should provide YOUTUBE_API_KEY');
    }

    const videoId = urlData.pathname.slice(1);

    const reqUrl = new URL(YOUTUBE_API_URL);
    reqUrl.searchParams.set('id', videoId);
    reqUrl.searchParams.set('part', 'snippet');
    reqUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log('Requesting data about video', videoId);

    const resp = await fetch(reqUrl.toString());
    if (!resp.ok) {
        throw new Error(`YouTube API answers with ${resp.status}`);
    }

    const snippetData = get(await resp.json(), ['items', 0, 'snippet']) || thr(new Error('No snippet data'));
    return {
        title: snippetData.title,
        pic: snippetData.thumbnails.medium,
        published: moment(snippetData.publishedAt).calendar()
    };
}
