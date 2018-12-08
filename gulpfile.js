/* eslint-env node */

const gulp = require('gulp');
const eslint  = require('gulp-eslint');
const htmlmin  = require('gulp-htmlmin');
const cleanCSS  = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const imageminPNG = require('imagemin-pngquant');
const imageminJPEG = require('imagemin-jpeg-recompress');


gulp.task('default', ['html', 'styles', 'scripts', 'images', 'static']);

gulp.task('html', () => {
	return gulp.src('./*.html')
		.pipe(htmlmin({ collapseWhitespace: true }))
		.pipe(gulp.dest('dist'));
});

/**
 * Tasks to process the styles
 */
gulp.task('styles', function() {
	gulp.src('./css/*.css')
		.pipe(sourcemaps.init())
		.pipe(cleanCSS({ compatibility: 'ie8' }))
		.pipe(autoprefixer({ browsers: ['last 2 versions'] }))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./dist/css'));
});


/**
 * Tasks to process the scripts
 */

gulp.task('scripts', [
	'vendor-scripts',
	'index-scripts',
	'restaurant-scripts',
	'sw-script',
]);

const vendorScripts = [
	'node_modules/idb/lib/idb.js'
];

const indexScripts = [
	'./js/main.js',
	'./js/dbhelper.js'
];

const restaurantScripts = [
	'./js/restaurant_info.js',
	'./js/dbhelper.js'
];

gulp.task('vendor-scripts', () => {
	return gulp.src(vendorScripts)
		.pipe(sourcemaps.init())
		.pipe(babel({presets: ['@babel/preset-env']}))
		.pipe(concat('vendors.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('index-scripts', () => {
	return gulp.src(indexScripts)
		.pipe(sourcemaps.init())
		.pipe(babel({presets: ['@babel/preset-env']}))
		.pipe(concat('index.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('restaurant-scripts', () => {
	return gulp.src(restaurantScripts)
		.pipe(sourcemaps.init())
		.pipe(babel({presets: ['@babel/preset-env']}))
		.pipe(concat('restaurant.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('sw-script', () => {
	return gulp.src('./service-worker.js')
		.pipe(sourcemaps.init())
		.pipe(babel({presets: ['@babel/preset-env']}))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist'));
});


/**
 * Tasks to process the images
 */
gulp.task('images', function() {
	return gulp.src('img/*')
		.pipe(imagemin({
			verbose: true,
			progressive: true,
			use: [imageminPNG(), imageminJPEG()],
		}))
		.pipe(gulp.dest('dist/img'));
});

/**
 * Tasks to move static files
 */
gulp.task('static', function() {
	return gulp.src('static/*')
		.pipe(gulp.dest('dist'));
});

/**
 * Tasks to check linting errors
 */
gulp.task('lint', function() {
	return gulp.src(['js/**/*.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failOnError());
});