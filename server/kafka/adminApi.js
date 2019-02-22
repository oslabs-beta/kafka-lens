const kafka = require('kafka-node');

const adminApi = {};

/**
 *
 * @param {String} topic
 * @param {Number} partition
 * @param {Number} messages
 *
 * Will receive from get topic data the parameters and will return an obj with topic, partition, and messages
 */
function buildTopicObj(topic, partition, messages) {
  return {
    topic,
    partition,
    messages,
  };
}

adminApi.getCurrentMsgCount = (kafkaHost, topic, partition = 0) => {
  const promises = [];
  return new Promise((resolve, reject) => {
    promises.push(adminApi.getEarliestOffset(kafkaHost, topic, partition));
    promises.push(adminApi.getLatestOffset(kafkaHost, topic, partition));
    Promise.all(promises)
      .then(offsets => {
        resolve(offsets[1] - offsets[0]);
      })
      .catch(error => {
        reject(error);
      });
  });
};

adminApi.getTopicMsgCount = (kafkaHost, topic, partitions) => {
  const results = [];
  // Return a new promise
  return new Promise((resolve, reject) => {
    // Create for loop with limit of n-partition iterations
    for (let i = 0; i < partitions; i += 1) {
      // Push a promise from call to getCurrentMsgCount with the arguments of host, topic, and ith-partition number into array
      results.push(adminApi.getCurrentMsgCount(kafkaHost, topic, i));
    }
    // Resolve promise when promise all resolves all promises from array sending back a single number
    Promise.all(results)
      .then(counts => {
        resolve(counts.reduce((total, curr) => (total += curr)));
      })
      .catch(err => reject(err));
  });
};

adminApi.getEarliestOffset = (kafkaHost, topic, partition) => {
  const client = new kafka.KafkaClient({ kafkaHost });
  const offset = new kafka.Offset(client);
  return new Promise((resolve, reject) => {
    offset.fetchEarliestOffsets(topic, (err, data) => {
      if (err) reject(err);
      else resolve(data[topic][partition]);
    });
  });
};

adminApi.getLatestOffset = (kafkaHost, topic, partition) => {
  const client = new kafka.KafkaClient({ kafkaHost });
  const offset = new kafka.Offset(client);
  return new Promise((resolve, reject) => {
    offset.fetchLatestOffsets(topic, (err, data) => {
      if (err) reject(err);
      else resolve(data[topic][partition]);
    });
  });
};

/**
 *
 * @param {String} kafkaHost the connection uri that the user types into connection input
 * @param {Electron Window} mainWindow Main window that gets data
 *
 * Makes a connection to Kafka server to fetch a list of topics
 * Transforms the data coming back from the Kafka broker into pertinent data to send back to client
 *
 *
 */
adminApi.getTopicData = (kafkaHost, mainWindow) => {
  // Declares a new instance of client that will be used to make a connection
  const client = new kafka.KafkaClient({ kafkaHost });
  // Declaring a new kafka.Admin instance creates a connection to the Kafka admin API
  const admin = new kafka.Admin(client);
  const resultTopic = [];
  let isRunning = false;
  console.log(kafkaHost);

  admin.listTopics((err, topics) => {
    if (err) console.error(err);
    topics = topics[1].metadata;
    isRunning = true;
    Object.keys(topics).forEach(topic => {
      // for each topic, get # of partitions and storing that in topic partitions
      const topicPartitions = Object.keys(topics[topic]).length;
      resultTopic.push({
        topic,
        partition: topicPartitions,
        messages: adminApi.getTopicMsgCount(kafkaHost, [topic], topicPartitions),
      });
    });
    Promise.all(resultTopic.map(x => x.messages)).then(() => {
      console.log(resultTopic);
      mainWindow.webContents.send('topic:getTopics', resultTopic);
    });
  });
  // needed for error handling to check if connection timed out
  setTimeout(() => {
    if (!isRunning) {
      mainWindow.webContents.send('topic:getTopics', 'Error');
    }
  }, 3000);
};

adminApi.getPartitionData = (kafkaHost, topic, partition = 0, mainWindow) => {
  const client = new kafka.KafkaClient({ kafkaHost });
  const admin = new kafka.Admin(client);
  const data = [];
  const testData = [
    { partition: 1, broker: 'test.data:9092', currentOffset: 99999, msgCount: 99999 },
    { partition: 2, broker: 'test.data:9092', currentOffset: 99999, msgCount: 99999 },
    { partition: 3, broker: 'test.data:9092', currentOffset: 99999, msgCount: 99999 },
  ];
  if (topic === 'asdf') return testData;

  // DATA NEEDED: 1. Highwater Offset; 2. Total message count; 3. Current message in buffer(?)
  // 1. Determine current highwater offset
  data[0] = adminApi.getLatestOffset(kafkaHost, topic, partition);
  // 2. Call getCurrentMsgCount to get current message count
  data[1] = adminApi.getCurrentMsgCount(kafkaHost, topic, partition);
  // 3. Maybe get current message in buffer (?????)

  Promise.all(data)
    .then(data => {
      mainWindow.webContents.send('partition:getData', {
        highwaterOffset: data[0],
        messageCount: data[1],
      });
    })
    .catch(err => console.error(err));
};

module.exports = adminApi;
