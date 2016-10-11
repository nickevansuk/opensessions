/**
 * DEVELOPMENT WEBPACK CONFIGURATION
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// PostCSS plugins
const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');
const postcssImport = require('postcss-partial-import');
const postcssNested = require('postcss-nested');
const postcssLost = require('lost');
const dotenv = require('dotenv');
dotenv.config({ silent: true });
dotenv.load();

module.exports = require('./webpack.base.babel')({
  // Add hot reloading in development
  entry: [
    'eventsource-polyfill', // Necessary for hot reloading with IE
    'webpack-hot-middleware/client',
    path.join(process.cwd(), 'app/app.js'), // Start with js/app.js
  ],

  // Don't use hashes in dev mode for better performance
  output: {
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
  },

  // Load the CSS in a style tag in development
  cssLoaders: 'style-loader!css-loader?localIdentName=[local]--[hash:base64:5]&modules&importLoaders=1&sourceMap!postcss-loader',

  // Process the CSS with PostCSS
  postcssPlugins: [
    postcssImport(),
    postcssNested(),
    postcssFocus(), // Add a :focus to every :hover
    cssnext({ // Allow future CSS features to be used, also auto-prefixes the CSS...
      browsers: ['last 2 versions', 'IE > 10'], // ...based on this browser list
    }),
    postcssLost(),
    postcssReporter({ // Posts messages from plugins to the terminal
      clearMessages: true,
    }),
  ],

  // Add hot reloading
  plugins: [
    new webpack.HotModuleReplacementPlugin(), // Tell webpack we want hot reloading
    new webpack.NoErrorsPlugin(),
    new HtmlWebpackPlugin({
      template: 'app/index.html',
      inject: true, // Inject all files that are generated by webpack, e.g. bundle.js
    }),
  ],

  // Tell babel that we want to hot-reload
  babelQuery: {
    plugins: ['transform-decorators-legacy'],
    presets: ['react-hmre'],
  },

  // Emit a source map for easier debugging
  devtool: 'cheap-module-eval-source-map',
});
