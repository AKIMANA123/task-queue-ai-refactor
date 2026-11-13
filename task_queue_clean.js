'use strict';

// ---------- Tiny event emitter ----------
class Emitter {
  #handlers = new Map();

  on(event, handler) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
    this.#handlers.get(event).add(handler);
    return () => this.#handlers.get(event)?.delete(handler); // unsubscribe
  }

  emit(event, payload) {
    for (const h of this.#handlers.get(event) ?? []) h(payload);
  }
}

// ---------- Storage: the queue's ONLY job is to hold tasks ----------
class TaskQueue {
  #tasks = [];
  #isProcessing = false;
  #events = new Emitter();

  constructor(name) {
    this.name = name;
  }

  get tasks() {
    return this.#tasks.slice(); // defensive copy
  }

  get isProcessing() {
    return this.#isProcessing;
  }

  /** Add a task. No logging, no scheduling: just validate, store, emit. */
  addTask(taskFn, priority) {
    if (typeof taskFn !== 'function') {
      throw new TypeError('addTask: taskFn must be a function');
    }
    const task = { taskFn, priority, timestamp: Date.now() };
    this.#tasks.push(task);
    this.#events.emit('task:added', { queue: this, task, size: this.#tasks.length });
    return task;
  }

  /** Called by whoever owns scheduling policy. Idempotent. */
  startProcessing() {
    if (this.#isProcessing || this.#tasks.length === 0) return false;
    this.#isProcessing = true;
    this.#events.emit('processing:started', { queue: this });
    // ... logic to process tasks ...
    return true;
  }

  on(event, handler) {
    return this.#events.on(event, handler);
  }
}

// ---------- Logging concern ----------
class TaskLogger {
  constructor({ log = console.log, warn = console.warn } = {}) {
    this.log = log;
    this.warn = warn;
    this.detach = null;
  }

  attach(queue, { highPriorityThreshold = 9 } = {}) {
    const offAdded = queue.on('task:added', ({ queue: q, task, size }) => {
      if (size === 1) this.log(`Starting queue ${q.name}.`);
      if (task.priority > highPriorityThreshold) {
        this.warn(`High priority task added to ${q.name}.`);
      }
    });
    const offStarted = queue.on('processing:started', ({ queue: q }) => {
      this.log(`Queue ${q.name} is now processing.`);
    });
    this.detach = () => { offAdded(); offStarted(); };
    return this;
  }

  detachFrom() {
    this.detach?.();
    this.detach = null;
  }
}

// ---------- Scheduling concern ----------
class ImmediateScheduler {
  constructor({ autoStart = true } = {}) {
    this.autoStart = autoStart;
    this.detach = null;
  }

  attach(queue) {
    if (!this.autoStart) return this;
    this.detach = queue.on('task:added', ({ queue: q }) => {
      q.startProcessing(); // idempotent: safe on every add
    });
    return this;
  }

  detachFrom() {
    this.detach?.();
    this.detach = null;
  }
}

module.exports = { Emitter, TaskQueue, TaskLogger, ImmediateScheduler };

// ---------- Composition root (demo) ----------
if (require.main === module) {
  const queue = new TaskQueue('ingest');
  new TaskLogger().attach(queue);
  new ImmediateScheduler().attach(queue);
  queue.addTask(() => {}, 10); // high priority: warns + starts
}
