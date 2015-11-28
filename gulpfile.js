var path = require('path');
var gulp = require('gulp');
var mocha = require('gulp-mocha');

var plumber = require('gulp-plumber');
var jshint = require('gulp-jshint');

gulp.task('static', function () {
  return gulp.src('**/*.js')
    .pipe(excludeGitignore())
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['pre-test'], function (cb) {
  var mochaErr;

  gulp.src('test/**/*.js')
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec'}))
    .on('error', function (err) {
      mochaErr = err;
    })
    .on('end', function () {
      cb(mochaErr);
    });
});

gulp.task('publish', function(){});
