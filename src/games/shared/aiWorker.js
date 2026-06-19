const AI_MODULES = {
  ataxx: () => import('../ataxx/ai.js'),
  backgammon: () => import('../backgammon/ai.js'),
  checkers: () => import('../checkers/ai.js'),
  connect4: () => import('../connect4/ai.js'),
  'dots-boxes': () => import('../dots-boxes/ai.js'),
  gomoku: () => import('../gomoku/ai.js'),
  hive: () => import('../hive/ai.js'),
  morris: () => import('../morris/ai.js'),
  othello: () => import('../othello/ai.js'),
}

self.addEventListener('message', async event => {
  const { id, game, exportName, args } = event.data ?? {}

  try {
    const loadModule = AI_MODULES[game]
    if (!loadModule) throw new Error(`Unknown AI game: ${game}`)

    const module = await loadModule()
    const fn = module[exportName]
    if (typeof fn !== 'function') throw new Error(`Unknown AI export: ${game}.${exportName}`)

    self.postMessage({ id, result: fn(...args) })
  } catch (error) {
    self.postMessage({
      id,
      error: {
        message: error?.message ?? String(error),
        stack: error?.stack ?? '',
      },
    })
  }
})
