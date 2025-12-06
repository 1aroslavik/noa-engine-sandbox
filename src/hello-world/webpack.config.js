/**
 * Рабочий Webpack config для сборки примера Noa Engine
 */

const path = require('path')

// -----------------------------
// Пути
// -----------------------------
const buildPath = path.resolve(__dirname, '../../docs/hello-world')
const entryPath = path.resolve(__dirname, './index.js')
const babylonPath = path.resolve(__dirname, '../../node_modules/@babylonjs')

// -----------------------------
// Экспорт конфигурации
// -----------------------------
module.exports = (env) => ({
    mode: (env && env.prod) ? 'production' : 'development',

    entry: entryPath,
    output: {
        path: buildPath,
        filename: 'bundle.js',
        clean: true, // очищает старые сборки перед новой
    },

    resolve: {
        alias: {
            '@babylonjs': babylonPath,
        },
    },

    // -----------------------------
    // Правила для загрузки текстур и других файлов
    // -----------------------------
    module: {
        rules: [
            {
                test: /\.(png|jpe?g|gif|bmp)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'textures/[name][ext]', // куда класть картинки
                },
            },
        ],
    },

    performance: {
        maxEntrypointSize: 1.5e6,
        maxAssetSize: 1.5e6,
    },

    stats: 'minimal',
    devtool: 'source-map',

    devServer: {
        static: buildPath,
        compress: true,
        port: 8080,
        open: true, // автоматически открывает браузер
    },

    watchOptions: {
        aggregateTimeout: 500,
        poll: 1000,
        ignored: ['node_modules'],
    },

    optimization: {
        splitChunks: {
            cacheGroups: {
                babylon: {
                    chunks: 'initial',
                    test: /babylonjs/,
                    filename: 'babylon.js',
                },
            },
        },
    },
})
