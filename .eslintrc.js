module.exports = {
    env: {
        browser: true,
        commonjs: true,
        node: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'google'],
    overrides: [
        {
            env: {
                node: true,
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script',
            },
        },
    ],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    rules: {
        'indent': ['error', 4],
        'max-len': ['error', 120],
        'require-jsdoc': 0,
    },
};
