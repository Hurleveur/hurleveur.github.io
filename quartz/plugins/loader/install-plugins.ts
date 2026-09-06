#!/usr/bin/env node
import { installPlugins, parsePluginSource, isLocalSource, regeneratePluginIndex } from "./gitLoader.js"
import { readPluginsJson } from "./config-loader.js"

async function main() {
  const pluginsJson = readPluginsJson()
  const entries = pluginsJson?.plugins ?? []
  const specs = entries
    .filter((entry) => entry.enabled && !isLocalSource(entry.source))
    .map((entry) => parsePluginSource(entry.source))

  if (specs.length === 0) {
    console.log("No external plugins to install.")
    await regeneratePluginIndex({ verbose: true })
    return
  }

  console.log(`Installing ${specs.length} plugin(s) from Git...`)

  const installed = await installPlugins(specs, { verbose: true })

  if (installed.size === specs.length) {
    console.log("✓ All plugins installed successfully")
  } else {
    console.error(`✗ Only ${installed.size}/${specs.length} plugins installed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Failed to install plugins:", err)
  process.exit(1)
})
