/**
 * # Automated Build Tasks with Grunt
 */

/**
 * ## Node Webkit
 * Building the app for desktop.
 * - Mac
 * - Windows
 * - Linux (disabled)
 */
var node_webkit = {
  options: {
      app_name: "Study",
      credits: './README.md',
      build_dir: './build', // Where the build version of my node-webkit app is saved
      mac: true, // We want to build it for mac
      win: true, // We want to build it for win
      linux32: false, // We don't need linux32
      linux64: false // We don't need linux64
  },
  src: ['./public/**/*'] // Your node-wekit app
};


/**
 * ## Dox
 * Documentation Generation
 * Build documentation with `grunt dox` from the command line.
 */
var dox_documentation = {
    options: {
      title: "SVRA docs"
    },
    files: {
      src: ['public/js/**/*'],
      dest: 'docs'
    }
};



module.exports = function(grunt) {
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({

      nodewebkit: node_webkit,
      dox:        dox_documentation
      
    });

    grunt.loadNpmTasks('grunt-node-webkit-builder');
    grunt.registerTask('default', ['nodewebkit']);
};
