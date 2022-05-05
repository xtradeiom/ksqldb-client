"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const lodash_1 = __importDefault(require("lodash"));
const http2 = __importStar(require("http2"));
const axios_1 = __importDefault(require("axios"));
const transform_1 = require("./transform");
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
// Converts an unknown value to quote all object keys
const convertItem = (e) => {
    // Anything that is not an object or array gets returned
    if (!lodash_1.default.isObjectLike(e))
        return e;
    // Arrays are returned mapped through this function to convert any nested objects
    if (lodash_1.default.isArray(e))
        return e.map(convertItem);
    // Objects are reassembled to quote their keys and map their values
    return lodash_1.default.zipObject(lodash_1.default.keys(e).map((key) => `"${key}"`), lodash_1.default.values(e).map(convertItem));
};
// Quotes object keys and converts to json strings
const convertInsertPayload = (data) => lodash_1.default.castArray(data).map((e) => JSON.stringify(convertItem(e)));
// Executes a statement against the http 1 /ksql endpoint
const executeStatement = (url, sql) => {
    const response = axios_1.default.post(`${url}/ksql`, JSON.stringify({
        ksql: sql,
    }), {
        headers: {
            'Content-Type': 'application/vnd.ksql.v1+json',
        },
    });
    return response;
};
const connect = (url = 'http://localhost:8088') => new Promise((resolve, reject) => {
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
            const resultStream = options.transform !== 'json' ? stream : stream.pipe(new transform_1.KsqlStream());
            stream.end(payload);
            return resultStream;
        },
        // Maps to the /insert-stream endpoint
        insert: (target, data, options = {}) => {
            const stream = createInsertStream(client, options);
            const mappedData = lodash_1.default.concat(
            // Ensure double quotes are removed and added back to ensure case sensitivity
            JSON.stringify({ target: `"${lodash_1.default.replace(target, '"', '')}"` }), convertInsertPayload(data));
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
        closeQuery: (query) => {
            const queryId = lodash_1.default.get(query, 'queryId', query);
            const stream = createRequest(client, createHeaders('/close-query'));
            return queryId ? stream.end(JSON.stringify({ queryId })) : stream.end();
        },
        closeConnection: (cb) => client.close(cb),
    };
    client.on('error', reject);
    client.on('connect', () => resolve(ksqldb));
});
exports.connect = connect;
exports.default = { connect: exports.connect };
//# sourceMappingURL=client.js.map