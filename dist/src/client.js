import _ from 'lodash';
import * as http2 from 'http2';
import axios from 'axios';
import { toJson } from './transform';
const createRequest = (client, headers) => client.request(headers);
const createHeaders = (path, options = {}, method = 'POST') => (Object.assign({ [http2.constants.HTTP2_HEADER_PATH]: path, [http2.constants.HTTP2_HEADER_METHOD]: method, [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/vnd.ksql.v1+json' }, options.headers));
const createQueryStream = (client, options = {}) => {
    var _a;
    const stream = createRequest(client, createHeaders('/query-stream', options));
    stream.setEncoding((_a = options.encoding) !== null && _a !== void 0 ? _a : 'utf8');
    return stream;
};
const createInsertStream = (client, options = {}) => {
    var _a;
    const stream = createRequest(client, createHeaders('/inserts-stream', options));
    stream.setEncoding((_a = options.encoding) !== null && _a !== void 0 ? _a : 'utf8');
    return stream;
};
// Quotes object keys and converts to json strings
const convertInsertPayload = (data) => _.castArray(data).map((e) => JSON.stringify(_.zipObject(_.keys(e).map((key) => `"${key}"`), _.values(e))));
// Executes a statement against the http 1 /ksql endpoint
const executeStatement = (url, sql) => {
    const response = axios.post(`${url}/ksql`, JSON.stringify({
        ksql: sql,
    }), {
        headers: {
            'Content-Type': 'application/vnd.ksql.v1+json',
        },
    });
    return response;
};
export const connect = (url = 'http://localhost:8088') => new Promise((resolve, reject) => {
    const client = http2.connect(url);
    const ksqldb = {
        // Maps to the /query-stream endpoint
        query: (query, options = {}) => {
            const stream = createQueryStream(client, options);
            const payload = Buffer.from(JSON.stringify(typeof query === 'string'
                ? {
                    sql: query,
                }
                : query));
            const resultStream = options.transform !== 'json' ? stream : stream.pipe(toJson);
            stream.end(payload);
            return resultStream;
        },
        // Maps to the /insert-stream endpoint
        insert: (target, data, options = {}) => {
            const stream = createInsertStream(client, options);
            const mappedData = _.concat(
            // Ensure double quotes are removed and added back to ensure case sensitivity
            JSON.stringify({ target: `"${_.replace(target, '"', '')}"` }), convertInsertPayload(data));
            stream.write(mappedData.join('\n'));
            stream.end();
            return stream;
        },
        statement: (sql) => {
            return executeStatement(url, sql);
        },
        // Convenience function to quickly list all of the streams
        listStreams: () => {
            return executeStatement(url, 'list streams;');
        },
        closeQuery: (queryId) => {
            const stream = createRequest(client, createHeaders('/close-query'));
            stream.end(JSON.stringify({ queryId }));
            return stream;
        },
        closeConnection: (cb) => client.close(cb),
    };
    client.on('error', reject);
    client.on('connect', () => resolve(ksqldb));
});
export default { connect };
//# sourceMappingURL=client.js.map