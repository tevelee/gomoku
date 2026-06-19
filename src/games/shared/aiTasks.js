const MAIN_THREAD_MODULES = {
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

let nextTaskId = 1

export function runAiTask(game, exportName, args) {
  if (typeof Worker === 'undefined') {
    let cancelled = false
    const promise = MAIN_THREAD_MODULES[game]()
      .then(module => {
        if (cancelled) return undefined
        const fn = module[exportName]
        if (typeof fn !== 'function') throw new Error(`Unknown AI export: ${game}.${exportName}`)
        return fn(...args)
      })

    return {
      promise,
      cancel() {
        cancelled = true
      },
    }
  }

  const id = nextTaskId++
  const worker = new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' })

  const promise = new Promise((resolve, reject) => {
    worker.addEventListener('message', event => {
      if (event.data?.id !== id) return
      worker.terminate()

      if (event.data.error) {
        const error = new Error(event.data.error.message)
        error.stack = event.data.error.stack
        reject(error)
      } else {
        resolve(event.data.result)
      }
    })

    worker.addEventListener('error', event => {
      worker.terminate()
      reject(event.error ?? new Error(event.message))
    })
  })

  worker.postMessage({ id, game, exportName, args })

  return {
    promise,
    cancel() {
      worker.terminate()
    },
  }
}
