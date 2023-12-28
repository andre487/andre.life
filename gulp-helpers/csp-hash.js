const htmlParser = require('node-html-parser');
const CspPolicy = require('csp-parse');
const cspHash = require('csp-hash-generator');
const through = require('through2');

function addCspHashes(html) {
    const root = htmlParser.parse(html);

    const styleHashes = new Set();
    for (const node of root.querySelectorAll('style')) {
        styleHashes.add(cspHash(node.textContent));
    }

    let wasInlineStyle = false;
    for (const node of root.querySelectorAll('[style]')) {
        styleHashes.add(cspHash(node.getAttribute('style')));
        wasInlineStyle = true;
    }

    const scriptHashes = new Set();
    for (const node of root.querySelectorAll('script')) {
        scriptHashes.add(cspHash(node.textContent));
    }

    const metaCsp = root.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const policy = new CspPolicy(metaCsp.getAttribute('content'));
    if (wasInlineStyle) {
        policy.add('style-src', '\'unsafe-hashes\'');
    }

    for (const hash of styleHashes) {
        policy.add('style-src', `'${hash}'`);
    }

    for (const hash of scriptHashes) {
        policy.add('script-src', `'${hash}'`);
    }
    metaCsp.setAttribute('content', policy.toString());

    return root.toString();
}

module.exports = through.obj(function(file, encoding, callback) {
    if (file.isNull() || file.isDirectory()) {
        return callback(null, file);
    }

    if (file.isStream()) {
        return callback(new Error('Stream is not supported'), file);
    }

    try {
        const newHtml = addCspHashes(file.contents.toString());
        file.contents = Buffer.from(newHtml);
        callback(null, file);
    } catch (e) {
        callback(e);
    }
});
