// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv')
dotenv.config()

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.shiki-01.lumina',
  productName: 'Lumina',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    'LICENSE',
    'out/**',
    '!**/.vscode/*',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintrc.json,.prettierrc,.travis.yml,docs,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}',
    '!src/*'
  ],
  asarUnpack: ['resources/**'],
  npmRebuild: true,
  extraMetadata: {
    ignoreGitIgnore: true
  },
  publish: {
    provider: 'github',
    owner: 'shiki-01',
    repo: 'Lumina',
    token: process.env.GH_TOKEN,
    private: false,
    releaseType: 'draft'
  },
  win: {
    executableName: 'Lumina',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ]
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ]
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64']
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true
  }
}

module.exports = config
