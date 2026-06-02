const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  const appPath = path.join(context.appOutDir, 'VideoDLP.app')
  console.log('Ad-hoc signing:', appPath)
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
  console.log('Ad-hoc signing complete')
}
