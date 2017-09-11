module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-compile-handlebars');

    grunt.initConfig({
        clean: {
            build: 'build'
        },
        'compile-handlebars': {
            allStatic: {
                files: [{
                    src: 'src/index.hbs',
                    dest: 'build/index.html'
                }],
                templateData: require('./src/context')
            }
        },
        copy: {
            main: {
                files: [
                    {expand: true, cwd: 'src/root_files', src: '**', dest: 'build', filter: 'isFile'},
                    {expand: true, cwd: 'src/assets', src: '**', dest: 'build/assets', filter: 'isFile'},
                    {expand: true, cwd: 'src/assets', src: 'b888ae721f40.html', dest: 'build'}
                ]
            }
        }
    });

    grunt.registerTask('default', ['clean', 'compile-handlebars', 'copy']);
};
