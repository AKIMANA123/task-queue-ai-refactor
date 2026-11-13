# TaskQueue: AI-Assisted Audit and Refactor

Pair-programming exercise: auditing a legacy JavaScript class for Single Responsibility Principle (SRP) violations and scope/closure problems, then refactoring it with AI assistance.

## Files
- `task_queue_legacy.js` — original class (mixed responsibilities, `name` scope bug in `notify`)
- `task_queue_clean.js` — refactored version (`TaskQueue`, `TaskLogger`, `ImmediateScheduler`, small `Emitter`)

## Docstring
`TaskQueue.addTask(taskFn, priority)` validates the task (throws `TypeError` if it is not a function), stores it, emits a `task:added` event, and returns the stored task. It does not log or schedule. `TaskLogger` handles logging and `ImmediateScheduler` starts processing; both subscribe to the queue's events.

## Reflection
An LLM is a pattern-matching engine, not a code executor: it never ran my TaskQueue, it recognized patterns such as a function declaration referencing an undeclared `name` and a method that both stores data and writes logs. Asking it to audit for scope and SRP taught me why the code was fragile (`name` resolves up the scope chain and throws a ReferenceError in Node when priority is above 9, while the class had `this.queueName` all along), which a "fix the code" request would have hidden. I then had to run the code myself to confirm the AI's reasoning.
