import path from 'path'
import fs from 'fs-extra'
import serveStatic from 'serve-static'
import externalGlobals from 'rollup-plugin-external-globals'
import { HtmlTagDescriptor, normalizePath, Plugin, UserConfig } from 'vite'

/**
 * rebuild cesium library, default: true
 */
interface VitePluginBuildCesiumOptions {
  cesiumBaseUrl?: string;
  rebuildCesium?: boolean;
  cesiumBuildPath?: string;
  devMinifyCesium?: boolean;
  cesiumBuildRootPath?: string;
}

export default function vitePluginBuildCesium(options: VitePluginBuildCesiumOptions = {}): Plugin {
  const {
    rebuildCesium = true,
    devMinifyCesium = false,
    cesiumBaseUrl = 'cesium/',
    cesiumBuildRootPath = 'node_modules/cesium/Build',
    cesiumBuildPath = 'node_modules/cesium/Build/Cesium/'
  } = options

  let viteBase: string = './'
  let isBuild: boolean = false
  let targetOutDir = 'dist'

  let CESIUM_BASE_URL = cesiumBaseUrl.endsWith('/') ? cesiumBaseUrl : `${cesiumBaseUrl}/`

  const cesiumTargetUrl = CESIUM_BASE_URL

  return {
    name: 'vite-plugin-build-cesium',

    config(c, { command }) {
      isBuild = command === 'build'
      viteBase = c.base || viteBase
      targetOutDir = c.build?.outDir || targetOutDir

      CESIUM_BASE_URL = path.posix.join(viteBase, CESIUM_BASE_URL)
      const userConfig: UserConfig = {}
      if (!isBuild) {
        // -----------dev-----------
        userConfig.define = {
          CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL)
        }
      } else {
        // -----------build------------
        if (rebuildCesium) {
          // build 1) rebuild cesium library
          userConfig.build = {
            assetsInlineLimit: c.build?.assetsInlineLimit || 4096,
            chunkSizeWarningLimit: c.build?.chunkSizeWarningLimit || 500,
            rollupOptions: {
              output: {
                intro: `window.CESIUM_BASE_URL = ${JSON.stringify(CESIUM_BASE_URL)};`
              }
            }
          }
        } else {
          // build 2) copy Cesium.js later
          userConfig.build = {
            rollupOptions: {
              external: ['cesium'],
              plugins: [externalGlobals({ cesium: 'Cesium' })]
            }
          }
        }
      }
      return userConfig
    },

    configureServer({ middlewares }) {
      const cesiumPath = path.join(cesiumBuildRootPath, devMinifyCesium ? 'CesiumUnminified' : 'Cesium')
      middlewares.use(path.posix.join('/', CESIUM_BASE_URL), serveStatic(cesiumPath, {
        setHeaders: (res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
        }
      }))
    },

    async closeBundle() {
      if (isBuild) {
        try {
          await fs.copy(path.join(cesiumBuildPath, 'Assets'), path.join(targetOutDir, cesiumTargetUrl, 'Assets'))
          await fs.copy(path.join(cesiumBuildPath, 'Workers'), path.join(targetOutDir, cesiumTargetUrl, 'Workers'))
          await fs.copy(path.join(cesiumBuildPath, 'Widgets'), path.join(targetOutDir, cesiumTargetUrl, 'Widgets'))
          await fs.copy(path.join(cesiumBuildPath, 'ThirdParty'), path.join(targetOutDir, cesiumTargetUrl, 'ThirdParty'))
          if (!rebuildCesium) {
            await fs.copy(path.join(cesiumBuildPath, 'Cesium.js'), path.join(targetOutDir, cesiumTargetUrl, 'Cesium.js'))
          }
        } catch (err) {
          console.error('copy failed', err)
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(path.join(CESIUM_BASE_URL, 'Widgets/widgets.css'))
          }
        }
      ]
      if (isBuild && !rebuildCesium) {
        tags.push({
          tag: 'script',
          attrs: {
            src: normalizePath(path.join(CESIUM_BASE_URL, 'Cesium.js'))
          }
        })
      }
      return tags
    }
  }
}
