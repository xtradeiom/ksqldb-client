import _ from 'lodash';
import * as http2 from 'http2';
import axios, { AxiosResponse } from 'axios';
import type { Duplex } from 'stream';
import type {
  Client,
  QueryStream,
  RequestOptions,
  VoidFunction,
} from './types';
import { KsqlStream } from './transform';

const createRequest = (
  client: http2.ClientHttp2Session,
  headers: http2.OutgoingHttpHeaders,
): Duplex => client.request(headers);

const createHeaders = (
  path: string,
  options: RequestOptions = {},
  method = 'POST',
): http2.OutgoingHttpHeaders => ({
  [http2.constants.HTTP2_HEADER_PATH]: path,
  [http2.constants.HTTP2_HEADER_METHOD]: method,
  [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/vnd.ksql.v1+json',
  ...options.headers,
});

const createQueryStream = (
  client: http2.ClientHttp2Session,
  options: RequestOptions = {},
): Duplex => {
  const stream = createRequest(client, createHeaders('/query-stream', options));

  stream.setEncoding(options.encoding ?? 'utf8');

  return stream;
};

const createInsertStream = (
  client: http2.ClientHttp2Session,
  options: RequestOptions = {},
): Duplex => {
  const stream = createRequest(
    client,
    createHeaders('/inserts-stream', options),
  );

  stream.setEncoding(options.encoding ?? 'utf8');

  return stream;
};

// Converts an unknown value to quote all object keys
const convertItem = (e: unknown): unknown => {
  // Anything that is not an object or array gets returned
  if (!_.isObjectLike(e)) return e;

  // Arrays are returned mapped through this function to convert any nested objects
  if (_.isArray(e)) return e.map(convertItem);

  // Objects are reassembled to quote their keys and map their values
  return _.zipObject(
    _.keys(e).map((key) => `"${key}"`),
    _.values(e).map(convertItem),
  );
};

// Quotes object keys and converts to json strings
const convertInsertPayload = (
  data: Array<Record<string, unknown>> | Record<string, unknown>,
) => _.castArray(data).map((e) => JSON.stringify(convertItem(e)));

// Executes a statement against the http 1 /ksql endpoint
const executeStatement = (url: string, sql: string) => {
  const response = axios.post(
    `${url}/ksql`,
    JSON.stringify({
      ksql: sql,
    }),
    {
      headers: {
        'Content-Type': 'application/vnd.ksql.v1+json',
      },
    },
  );

  return response;
};

export const connect = (url = 'http://localhost:8088'): Promise<Client> =>
  new Promise((resolve, reject) => {
    const client = http2.connect(url);

    const ksqldb = {
      // Maps to the /query-stream endpoint
      query: (
        query: string | QueryStream,
        options: RequestOptions = {},
      ): Duplex | KsqlStream => {
        const stream = createQueryStream(client, options);

        const payload = Buffer.from(
          JSON.stringify(
            typeof query === 'string'
              ? {
                  sql: query,
                }
              : query,
          ),
        );

        const resultStream =
          options.transform !== 'json' ? stream : stream.pipe(new KsqlStream());

        stream.end(payload);

        return resultStream;
      },

      // Maps to the /insert-stream endpoint
      insert: (
        target: string,
        data: Array<Record<string, unknown>> | Record<string, unknown>,
        options: RequestOptions = {},
      ): Duplex => {
        const stream = createInsertStream(client, options);
        const mappedData = _.concat(
          // Ensure double quotes are removed and added back to ensure case sensitivity
          JSON.stringify({ target: `"${_.replace(target, '"', '')}"` }),
          convertInsertPayload(data),
        );

        stream.write(mappedData.join('\n'));
        stream.end();

        return stream;
      },

      statement: (sql: string): Promise<AxiosResponse> => {
        return executeStatement(url, sql);
      },

      // Convenience function to quickly list all of the streams
      listStreams: (): Promise<AxiosResponse> => {
        return executeStatement(url, 'list streams;');
      },

      closeQuery: (query: string | KsqlStream): Duplex => {
        const queryId = _.get(query, 'queryId', query);

        const stream = createRequest(client, createHeaders('/close-query'));

        return queryId ? stream.end(JSON.stringify({ queryId })) : stream.end();
      },

      closeConnection: (cb?: VoidFunction) => client.close(cb),
    };

    client.on('error', reject);
    client.on('connect', () => resolve(ksqldb));
  });

export default { connect };
