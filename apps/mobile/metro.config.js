const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo: watch the shared packages too
config.watchFolders = [monorepoRoot]

// Prioritize mobile's own node_modules, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Resolve workspace packages directly from TypeScript source (no dist/ needed)
config.resolver.extraNodeModules = {
  '@runmate/types': path.resolve(monorepoRoot, 'packages/types/src'),
  '@runmate/validators': path.resolve(monorepoRoot, 'packages/validators/src'),
}

module.exports = withNativeWind(config, { input: './global.css' })
