const fs = require('fs')
const os = require('os')
const path = require('path')
const core = require('@actions/core')
const io = require('@actions/io')
const tc = require('@actions/tool-cache')
const rubyBuilderVersions = require('./ruby-install-builder-versions')
const axios = require('axios')

const builderReleaseTag = 'builds-newer-openssl'
const releasesURL = 'https://github.com/eregon/ruby-install-builder/releases'

export function getAvailableVersions(platform, engine) {
  return rubyBuilderVersions.getVersions(platform)[engine]
}

export async function install(platform, ruby) {
  const rubyPrefix = await downloadAndExtract(platform, ruby)

  if (platform.startsWith('ubuntu-') &&
      ruby.startsWith('ruby-') &&
      core.getInput('fix-home-permissions') === 'true') {
    // Fix "Insecure world writable dir" warnings on Ubuntu with MRI
    const mode = fs.statSync(os.homedir()).mode
    console.log(mode)
    console.log(mode & ~fs.constants.S_IWOTH)
    fs.chmodSync(os.homedir(), mode & ~fs.constants.S_IWOTH)
  }

  core.addPath(path.join(rubyPrefix, 'bin'))
  if (ruby.startsWith('rubinius')) {
    core.addPath(path.join(rubyPrefix, 'gems', 'bin'))
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

async function getDownloadURL(platform, ruby) {
  if (ruby.endsWith('-head')) {
    return getLatestHeadBuildURL(platform, ruby)
  } else {
    return `${releasesURL}/download/${builderReleaseTag}/${ruby}-${platform}.tar.gz`
  }
}

async function getLatestHeadBuildURL(platform, ruby) {
  const engine = ruby.split('-')[0]
  const repository = `eregon/${engine}-dev-builder`
  const metadataURL = `https://raw.githubusercontent.com/${repository}/metadata/latest_build.tag`
  const releasesURL = `https://github.com/${repository}/releases/download`

  const response = await axios.get(metadataURL)
  const tag = response.data.trim()
  return `${releasesURL}/${tag}/${ruby}-${platform}.tar.gz`
}
