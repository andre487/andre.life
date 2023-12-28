const path = require('path');

exports.IS_PROD = process.env.NODE_ENV === 'prod';

const PROJECT_DIR = exports.PROJECT_DIR = path.resolve(path.join(path.dirname(__filename), '..'));

exports.SRC_DIR = path.join(PROJECT_DIR, 'src');
exports.ASSET_DIR = path.join(PROJECT_DIR, 'src', 'assets');
const DATA_DIR = exports.DATA_DIR = path.join(PROJECT_DIR, 'data');
exports.LAYOUT_FILE = path.join(PROJECT_DIR, 'src', 'templates', 'layout', 'main.hbs');
exports.YT_DATA_DIR = path.join(DATA_DIR, 'youtube');
exports.BUILD_DIR = path.join(PROJECT_DIR, 'build');

exports.YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
