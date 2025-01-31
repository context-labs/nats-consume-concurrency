# NATS Consume Concurrency

This example demonstrates how NATS JetStream handles message consumption concurrency using a callback method.

To run the example, install dependencies with `bun` or `npm`, then run with `bun run index.ts` or `npx tsx index.ts`.

You can edit `MAX_CONCURRNECY` and `NUMBER_OF_CONCURRENT_MESSAGES_TO_PUBLISH` to see how the behavior changes with different numbers of messages and concurrency.

This currently demonstrates two major issues:
1. The concurrency limit is not respected. All messages are being processed within 10-20ms, despite multiple batches of max messages being sent and long wait times in the callback.
2. The NATS connection is not draining properly, we have outstanding messages that are not done being processed.

Potential sources of the issues:
- NATS does not await a callback to finish, it simply continues when the function returns. I would consider this a NATS bug since the callback is supposed to be a promise. Will dig into their code to see if this is the case.