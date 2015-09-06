module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-compile-handlebars');

    grunt.initConfig({
        'compile-handlebars': {
            allStatic: {
                files: [{
                    src: 'src/index.hbs',
                    dest: 'build/index.html'
                }],
                templateData: require('./src/context')
            }
        }
    });

    grunt.registerTask('default', 'compile-handlebars');
};
