import { AxiosResponse } from 'axios';
import type { OutgoingHttpHeaders } from 'http2';
import { Duplex } from 'stream';
import type { KsqlStream } from './transform';

export type VoidFunction = () => void;

export interface Client {
  query: (query: string, options?: RequestOptions) => Duplex | KsqlStream;
  insert: (
    target: string,
    data: Array<Record<string, unknown>> | Record<string, unknown>,
    options?: RequestOptions,
  ) => Duplex;
  statement: (sql: string) => Promise<AxiosResponse>;
  listStreams: () => Promise<AxiosResponse>;
  closeConnection: (cb?: VoidFunction) => void;
  closeQuery: (query: string | KsqlStream) => Duplex;
}

export interface QueryStream {
  sql: string;
}

export interface RequestOptions {
  headers?: OutgoingHttpHeaders;
  encoding?: BufferEncoding;
  transform?: string;
}

export default interface KsqlDb {
  connect: (url?: string) => Promise<Client>;
}
