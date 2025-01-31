import {
  AckPolicy,
  jetstream,
  jetstreamManager,
  type JetStreamClient,
  type JetStreamManager,
  type JsMsg,
} from "@nats-io/jetstream";
import { connect, nanos } from "@nats-io/transport-node";

const MAX_CONCURRNECY = 5;
const NUMBER_OF_CONCURRENT_MESSAGES_TO_PUBLISH = 10;

// Create logger helper
const logger = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

async function main() {
  logger("Connecting to NATS...");
  const nc = await connect({
    servers: "localhost:4223",
  });

  const jsm: JetStreamManager = await jetstreamManager(nc);
  const js: JetStreamClient = jetstream(nc);

  const streamName = "TEST_STREAM";
  const subject = "test";

  try {
    await jsm.streams.delete(streamName);
  } catch (error) {
    logger(`Error deleting stream: ${error}`);
  }

  logger("Creating stream...");
  await jsm.streams.add({
    name: streamName,
    subjects: [`${subject}.>`],

    max_age: nanos(3 * 24 * 60 * 60 * 1000),
    max_bytes: -1,
    max_msgs: -1,
  });

  const createConsumer = async () => {
    logger("Creating consumer...");
    await jsm.consumers.add(streamName, {
      name: "test-consumer",
      durable_name: "test-consumer",
      ack_policy: AckPolicy.Explicit,
      filter_subject: `${subject}.>`,
      max_deliver: -1,
      max_ack_pending: -1,
      max_batch: 10,
      // we will wait for 1 millisecond for the consumer to ack the messages
      // this will ensure that the messages don't get stuck as
      // outstanding ack's
      ack_wait: nanos(1000 * 1),
      max_waiting: 100_000,
    });
    logger("Consumer created");
  };

  const publishMessages = async () => {
    logger("Publishing test messages...");
    for (let i = 0; i < NUMBER_OF_CONCURRENT_MESSAGES_TO_PUBLISH; i++) {
      await js.publish(`${subject}.${i}`, i.toString());
      logger(`Published message ${i}`);
    }
  };

  logger("Creating consumer instance...");
  await createConsumer();

  const consumer = await js.consumers.get(streamName, "test-consumer");

  logger("Initializing message consumption...");
  const messages = await consumer.consume({
    max_messages: MAX_CONCURRNECY,
    callback: async (message) => {
      logger(`Processing message: ${message.data.toString()}`);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      logger(`Finished processing message: ${message.data.toString()}`);
      message.ack();
    },
  });

  console.log("Publishing messages...");
  await publishMessages();

  await nc.drain();
  logger("Drained");
  process.exit(0)
}

main().catch(console.error);
