import _ from 'lodash';
import ksql, { RequestOptions } from './index';
import { KsqlStream } from './transform';

describe('Ksqldb main package', () => {
  it('should export a KsqlDB type', async () => {
    const client = await ksql.connect(process.env['KSQL_SERVER']);

    const opts: RequestOptions = {
      transform: 'json',
    };

    console.log('------ ROUND 1');

    const stream = <KsqlStream>client.query('select * from "bets";', opts);

    for await (const row of stream) {
      console.log('Query response: ', row);
      _.noop(row);
    }

    // client.closeQuery(stream.queryId);

    // console.log('------ ROUND 2');
    // stream = <KsqlStream>client.query('select * from "bets";', opts);

    // for await (const row of stream) {
    //   // console.log('Query response: ', row);
    //   _.noop(row);
    // }

    client.closeQuery(stream.queryId);
    client.closeConnection();

    expect(ksql).toHaveProperty('connect');
  });
});
