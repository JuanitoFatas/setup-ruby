const os = require('os')
const path = require('path')
const core = require('@actions/core')
const io = require('@actions/io')
const tc = require('@actions/tool-cache')
const rubyBuilderVersions = require('./ruby-builder-versions')

const builderReleaseTag = 'builds-no-warn'
const releasesURL = 'https://github.com/ruby/ruby-builder/releases'

export function getAvailableVersions(platform, engine) {
  return rubyBuilderVersions.getVersions(platform)[engine]
}

export async function install(platform, ruby) {
  const rubyPrefix = await downloadAndExtract(platform, ruby)

  if (platform === 'windows-latest') {
    require('./windows').setupPath(undefined, rubyPrefix)
  } else {
    core.addPath(path.join(rubyPrefix, 'bin'))
    if (ruby.startsWith('rubinius')) {
      core.addPath(path.join(rubyPrefix, 'gems', 'bin'))
    }
  }

  return rubyPrefix
}

async function downloadAndExtract(platform, ruby) {
  const rubiesDir = path.join(os.homedir(), '.rubies')
  await io.mkdirP(rubiesDir)

  const url = await getDownloadURL(platform, ruby)
  console.log(url)

  const downloadPath = await tc.downloadTool(url)
  await tc.extractTar(downloadPath, rubiesDir)

  return path.join(rubiesDir, ruby)
}

function getDownloadURL(platform, ruby) {
  if (ruby.endsWith('-head')) {
    return getLatestHeadBuildURL(platform, ruby)
  } else {
    return `${releasesURL}/download/${builderReleaseTag}/${ruby}-${platform}.tar.gz`
  }
}

function getLatestHeadBuildURL(platform, ruby) {
  const engine = ruby.split('-')[0]
  return `https://github.com/ruby/${engine}-dev-builder/releases/latest/download/${engine}-head-${platform}.tar.gz`
}
