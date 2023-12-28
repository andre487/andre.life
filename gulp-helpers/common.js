const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const thr = require('throw');
const yaml = require('js-yaml');
const merge = require('lodash/merge');
const { DATA_DIR, IS_PROD, YT_DATA_DIR } = require('./consts');

const commonData = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'common.yaml')));

const getYtVideoId = exports.getYtVideoId = function getYtVideoId(url) {
    const urlData = new URL(url);
    if (urlData.host === 'youtu.be') {
        return urlData.pathname.slice(1);
    }
    return urlData.searchParams.get('watch') || thr(`Unsupported YouTube URL: ${url}`);
}

exports.getPageContext = async function getPageContext(file) {
    const baseName = file.basename;
    const pageName = baseName.substring(0, baseName.lastIndexOf('.'));

    const templatePath = path.join(DATA_DIR, 'pages', `${pageName}.yaml`);
    const pageData = yaml.load(await fsp.readFile(templatePath));
    const context = merge({}, commonData, pageData);
    context.addMetrika = IS_PROD;

    if (context.techTalks) {
        context.techTalks = await handleVideoLinkList(context.techTalks);
    }
    return { pageName, context };
}

async function handleVideoLinkList(linkList) {
    return Promise.all(
        linkList.map(item => {
            if (item.autoSnippet) {
                return getAutoSnippetData(item);
            }
            return item;
        })
    );
}

async function getAutoSnippetData(item) {
    const videoId = getYtVideoId(item.link);
    const dataFilePath = path.join(YT_DATA_DIR, `${videoId}.yaml`);
    if (!fs.existsSync(dataFilePath)) {
        return { ...item };
    }

    const data = yaml.load(await fsp.readFile(dataFilePath));
    return {
        ...item,
        ...data,
    };
}
