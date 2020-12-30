const CspPolicy = require('csp-parse');
const cspHash = require('csp-hash-generator');
const through = require('through2');

function splitFileByInlineTags(content) {
    const itChunks = content.matchAll(/<((?:script)|(?:style))[^>]*?>(.+?)<\/(?:(?:script)|(?:style))>/gi);

    const chunks = [];
    let prevEnd = 0;

    for (const { 0: outerHtml, 1: type, 2: innerHtml, index: start } of itChunks) {
        chunks.push({
            type: 'passive',
            outerHtml: content.slice(prevEnd, start),
        }, {
            type,
            outerHtml,
            innerHtml,
        });
        prevEnd = start + outerHtml.length;
    }

    chunks.push({
        type: 'passive',
        outerHtml: content.slice(prevEnd),
    });

    const firstChunk = chunks.shift();
    const metaCspMatch = firstChunk.outerHtml.match(/<meta[^>]+?Content-Security-Policy[^>]*?>/i);

    if (!metaCspMatch) {
        throw new Error('No CSP meta tag in the first chunk');
    }

    const { 0: outerHtml, index: start } = metaCspMatch;
    const end = start + outerHtml.length;

    chunks.unshift({
        type: 'passive',
        outerHtml: firstChunk.outerHtml.slice(0, start),
    }, {
        type: 'meta',
        outerHtml,
    }, {
        type: 'passive',
        outerHtml: firstChunk.outerHtml.slice(end),
    });

    return chunks;
}

function subscribeTags(chunks) {
    let metaIdx = -1;
    let meta;

    const styleHashes = [];
    const scriptHashes = [];

    for (let i = 0; i < chunks.length; ++i) {
        const chunk = chunks[i];
        if (chunk.type == 'passive') {
            continue;
        }

        if (chunk.type == 'meta') {
            meta = chunk;
            metaIdx = i;
            continue;
        }

        const hash = cspHash(chunk.innerHtml);
        if (chunk.type == 'style') {
            styleHashes.push(hash);
        } else {
            scriptHashes.push(hash);
        }
    }

    const policyMatch = meta.outerHtml.match(/<meta.+content="(.+?)".*>/i);
    if (!policyMatch) {
        throw new Error('Can not parse CSP meta tag');
    }

    const policy = new CspPolicy(policyMatch[1]);
    for (const hash of styleHashes) {
        policy.add('style-src', `'${hash}'`);
    }

    for (const hash of scriptHashes) {
        policy.add('script-src', `'${hash}'`);
    }

    meta.outerHtml = `<meta content="${policy.toString()}" http-equiv=Content-Security-Policy>`;
}

function compileChunks(chunks) {
    let result = '';
    for (const chunk of chunks) {
        result += chunk.outerHtml;
    }
    return result;
}

module.exports = function() {
    return through.obj(function(file, encoding, callback) {
        if (file.isNull() || file.isDirectory()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            return callback(new Error('Stream is not supported'), file);
        }

        try {
            const chunks = splitFileByInlineTags(file.contents.toString());
            subscribeTags(chunks);
            file.contents = Buffer.from(compileChunks(chunks));

            callback(null, file);
        } catch (e) {
            callback(e);
        }
    });
};
