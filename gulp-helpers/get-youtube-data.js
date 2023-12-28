const fs = require('fs');
const path = require('path');
const thr = require('throw');
const fetch = require('node-fetch');
const moment = require('moment/moment');
require('moment/locale/ru');
const through = require('through2');
const yaml = require('js-yaml');
const Vinyl = require('vinyl');
const { DATA_DIR, YOUTUBE_API_URL, YT_DATA_DIR } = require('./consts');
const { getYtVideoId } = require('./common');

const fsp = fs.promises;

module.exports = through.obj(function(file, encoding, callback) {
    if (file.isNull() || file.isDirectory()) {
        return callback(null, file);
    }

    if (file.isStream()) {
        return callback(new Error('Stream is not supported'), file);
    }

    const stream = this;
    getYouTubeDataFiles(file)
        .then(result => {
            result.forEach(vinylFile => stream.push(vinylFile));
            callback();
        })
        .catch(e => callback(e));
});

async function getYouTubeDataFiles(file) {
    const baseName = file.basename;
    const pageName = baseName.substring(0, baseName.lastIndexOf('.'));
    const dataFilePath = path.join(DATA_DIR, 'pages', `${pageName}.yaml`);

    const pageData = yaml.load(await fsp.readFile(dataFilePath));
    if (!pageData?.techTalks) {
        return [];
    }

    const videosSnippetsData = await getVideosSnippetsData(pageData.techTalks);
    const result = [];
    for (const snippetData of videosSnippetsData) {
        const { videoId, picBaseName } = snippetData;
        result.push(
            new Vinyl({
                path: `${videoId}.yaml`,
                contents: Buffer.from(yaml.dump(snippetData)),
            }),
            new Vinyl({
                path: picBaseName,
                contents: await downloadPic(snippetData.pic.url),
            })
        );
    }

    return result;
}

async function getVideosSnippetsData(linkList) {
    return Promise
        .all(linkList.map(item => {
            if (item.autoSnippet) {
                return getAutoSnippetData(item);
            }
            return null;
        }))
        .then(res => res.filter(Boolean));
}

let youTubeApiKey = null;

async function getAutoSnippetData(item) {
    const videoId = getYtVideoId(item.link);
    const destDataFile = path.join(YT_DATA_DIR, `${videoId}.yaml`);
    if (fs.existsSync(destDataFile)) {
        console.log('We already have data about video', videoId);
        return null;
    }

    if (!youTubeApiKey) {
        youTubeApiKey = process.env.YOUTUBE_API_KEY || thr('You should provide YOUTUBE_API_KEY');
    }

    const reqUrl = new URL(YOUTUBE_API_URL);
    reqUrl.searchParams.set('id', videoId);
    reqUrl.searchParams.set('part', 'snippet');
    reqUrl.searchParams.set('key', youTubeApiKey);

    console.log('Requesting data about video', videoId);
    const resp = await fetch(reqUrl.toString());
    if (!resp.ok) {
        throw new Error(`YouTube API answers with ${resp.status}`);
    }

    const apiResult = await resp.json();
    const snippetData = apiResult?.items?.[0]?.snippet || thr(new Error('No snippet data'));

    const pic = snippetData.thumbnails.medium;
    const picExt = path.extname(pic.url);
    const picBaseName = `${videoId}${picExt}`;

    return {
        url: item.link,
        videoId,
        title: snippetData.title,
        pic,
        picBaseName,
        published: moment(snippetData.publishedAt).calendar(),
    };
}

async function downloadPic(picUrl) {
    const resp = await fetch(picUrl);
    if (!resp.ok) {
        throw new Error(`YouTube picture answers with ${resp.status}`);
    }
    return resp.buffer();
}
