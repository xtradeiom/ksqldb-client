import ksql from './index';

describe('Ksqldb main package', () => {
  it('should export a KsqlDB type', () => {
    expect(ksql).toHaveProperty('connect');
  });
});
