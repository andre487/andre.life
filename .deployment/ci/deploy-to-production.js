#!/usr/bin/env node
var fs = require('fs');
var path = require('path');

var sh = require('shelljs');
var template = require('lodash.template');

// Params
sh.config.fatal = true;

var PROJECT_USER = process.env.PROJECT_USER;
var DST_DIR = process.env.DST_DIR;

var KEY_FILE = path.join(__dirname, 'deploy_id');
var SRC_DIR = './build/';

var SSH_COMMAND = [
    'ssh',
    '-i ' + KEY_FILE,
    '-o stricthostkeychecking=no ',
    '-o userknownhostsfile=/dev/null ',
    '-o batchmode=yes ',
    '-o passwordauthentication=no'
].join(' ');

var createRsyncCommand = template([
    'rsync -e "' + SSH_COMMAND + '"',
    '-av',
    '--delete',
    '${srcDir}',
    '${projectUser}@andre.life:${dstDir}'
].join(' '));

// Deployment
sh.echo('Deploy project');

var rsyncCommand = createRsyncCommand({
    srcDir: SRC_DIR,
    dstDir: DST_DIR,
    projectUser: PROJECT_USER
});

var res = sh.exec(rsyncCommand);
if (res.code) {
    throw new Error("Can't copy files");
}

sh.echo('Success!');
