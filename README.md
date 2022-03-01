# KsqlDB Client for Node JS

This repo contains a simple ksqldb client for node js

## Install

Refer to the root `odds-engine-plus` repo readme for information on how to install in an app within the mono repo

## Usage

The client provides a very simple interface for interacting with ksql in node js, the definition is the following

```ts
// This is the main exported 'ksqldb' client export
interface KsqlDb {
  connect: (url?: string) => Client;
}

// This is the client interface per above
interface Client {
  // Performs a query via http2 /query-stream endpoint
  query: (query: string, options?: RequestOptions) => Duplex | KsqlStream;

  // Inserts into a 'stream|table' as the target the given data via http2 /insert-stream endpoint
  insert: (
    target: string,
    data: Array<Record<string, unknown>> | Record<string, unknown>,
    options?: RequestOptions,
  ) => Duplex;

  // Executes a regular http request via the /ksql endpoint
  statement: (sql: string) => Promise<AxiosResponse>;

  // Returns the results of a 'list streams' statement via the /ksql endpoint
  listStreams: () => Promise<AxiosResponse>;

  // Closes the open http2 connection
  closeConnection: (cb?: VoidFunction) => void;

  // Closes an open query, such as when it is emitting changes
  closeQuery: (queryId: string | KsqlStream) => Duplex;
}
```

## Insert data example

This is an example of what a small insert program might look like

```ts
import ksqldb from '@xtradeiom/ksqldb-client';

(async () => {
  const client = await ksqldb.connect();

  const data = [
    {
      id: '1',
      clientRef: '1234',
      amount: 100.23,
    },
    {
      id: '2'
      clientRef: '1234',
      amount: 206.0,
    },
  ];

  // Note that insert is case SENSITIVE
  const stream = client.insert('bets', data);

  for await (const row of stream) {
    console.log('Insert response: ', row);
  }

  client.closeConnection();
})();
```

## Query data example

This is an example of what a small query program might look like

```ts
import ksqldb, { RequestOptions, KsqlStream } from '@xtradeiom/ksqldb-client';

(async () => {
  const client = await ksqldb.connect();

  // Setting this is needed to get lovely json objects returned
  const opts: RequestOptions = {
    transform: 'json',
  };

  // Would have 'emit changes' on the end if we wanted streaming data
  // Notice that "bets" is quoted to enforce case sensitivity
  const stream = <KsqlStream>client.query('select * from "bets";', opts);

  for await (const row of stream) {
    console.log('Query response: ', row);
  }

  client.closeQuery(stream);
  client.closeConnection();
})();
```
