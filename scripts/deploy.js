#!/usr/bin/env node
var fs = require('fs');
var path = require('path');

var shell = require('shelljs');
var template = require('lodash.template');

// Params
shell.config.fatal = true;

var HOME = process.env.HOME;
var KEY_FILE = path.join(HOME, '.ssh', 'id_rsa');

var PROJECT_USER = 'data';
var SRC_DIR = './build/';
var DST_DIR = '~/var/www/andre.life';

var SSH_COMMAND = [
    'ssh',
    '-o stricthostkeychecking=no ',
    '-o userknownhostsfile=/dev/null ',
    '-o batchmode=yes ',
    '-o passwordauthentication=no'
].join(' ');

var createRsyncCommand = template([
    'rsync -e "${sshCommand}"',
    '-av',
    '--delete',
    '${srcDir}',
    '${projectUser}@andre.life:${dstDir}'
].join(' '));

// Auth
shell.echo('Prepare auth');

var sshRawKey = process.env.KEY;
if (!sshRawKey) {
    throw new Error('SSH key required');
}

var keyParts = /(-----BEGIN .+? PRIVATE KEY-----)(.+)(-----END .+? PRIVATE KEY-----)/.exec(sshRawKey);
if (!keyParts) {
    throw new Error('Invalid key format');
}

var sshKey = [
    keyParts[1],
    keyParts[2].trim().split(' ').join('\n'),
    keyParts[3]
].join('\n');

fs.writeFileSync(KEY_FILE, sshKey);
shell.chmod('600', KEY_FILE);

// Deployment
shell.echo('Deploy project');

var rsyncCommand = createRsyncCommand({
    sshCommand: SSH_COMMAND,
    srcDir: SRC_DIR,
    dstDir: DST_DIR,
    projectUser: PROJECT_USER
});
var res = shell.exec(rsyncCommand);
if (res.code) {
    throw new Error("Can't copy files");
}

shell.echo('Success!');
