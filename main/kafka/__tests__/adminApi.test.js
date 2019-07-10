import adminApi from '../adminApi';

xdescribe('adminApi unit tests', () => {
  const args = {
    kafkaHostURI: 'k2.tpw.made.industries:9092',
    topicName: 'swipes',
    partitionId: 0
  };
  describe('Testing getEarliestOffset', () => {
    it('Should return a number', () => {
      adminApi.getEarliestOffset(args.kafkaHostURI, args.topicName, args.partitionId).then(num => {
        expect(typeof num).toEqual('number');
      });
    });
  });
  describe('Testing getLatestOffset', () => {
    it('Should return a number', () =>
      adminApi.getLatestOffset(args.kafkaHostURI, args.topicName, 2).then(num => {
        expect(typeof num).toEqual('number');
      }));
  });
  describe('Testing getCurrentMsgCount', () => {
    it('Should return a number', () =>
      adminApi
        .getPartitionMsgCount(args.kafkaHostURI, args.topicName, 2)
        .then(num => {
          console.log('Returned', num);
          expect(typeof num).toEqual('number');
        })
        .catch(err => expect(err).toEqual(null)));
  });
  describe('Testing getTopicMsgCount', () => {
    it('Should return a number', () =>
      adminApi.getTopicMsgCount(args.kafkaHostURI, args.topicName, 2).then(num => {
        expect(typeof num).toEqual('number');
      }));
  });
});
