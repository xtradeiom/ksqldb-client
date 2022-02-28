/// <reference types="node" />
import { Transform, TransformCallback } from 'stream';
export declare class JsonResponseStream extends Transform {
    columnNames: Array<string> | null;
    queryId: string;
    private _chunk;
    constructor();
    parseHeader(chunk: string): void;
    _transform(chunk: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    _encoding: BufferEncoding, callback: TransformCallback): void;
}
export declare const toJson: JsonResponseStream;
