/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import _ from 'lodash';
import { Transform } from 'stream';
export class JsonResponseStream extends Transform {
    constructor() {
        super({ objectMode: true });
        this.columnNames = null;
        this.queryId = '';
        this._chunk = '';
    }
    parseHeader(chunk) {
        const row = JSON.parse(chunk);
        this.columnNames = row.columnNames;
        this.queryId = row.queryId;
    }
    _transform(chunk, // eslint-disable-line @typescript-eslint/no-explicit-any
    _encoding, callback) {
        try {
            // If includes columnNames its the header row so capture that and push out no data
            if (chunk.includes('columnNames')) {
                this.parseHeader(chunk);
                return callback();
            }
            // If the columnNames are not set just push out no data
            if (!this.columnNames)
                return callback();
            // If the chunk doesnt end in a newline, capture the string and send back no data
            if (!_.endsWith(chunk, '\n')) {
                this._chunk = chunk;
                return callback();
            }
            // --------------------------------------------------------------------------------------------------------
            // TODO: this will be absolutely wrong if the newlines are nested in text, we will have to test that
            // and fix it to instead find those newlines where they split each arraylike string [] item if so
            // --------------------------------------------------------------------------------------------------------
            // At this stage the chunk must end in a new line so we can process it
            _(`${this._chunk}${chunk}`)
                .split('\n')
                .compact()
                .forEach((c) => {
                const row = JSON.parse(c);
                // Pointlessly check columnNames again due to incorrect tslint
                if (!this.columnNames)
                    return;
                // Push each parsed object individually
                this.push(_.zipObject(this.columnNames, row));
            });
            // Reset the internal chunk value
            this._chunk = '';
            callback();
        }
        catch (err) {
            callback(err);
        }
    }
}
export const toJson = new JsonResponseStream();
//# sourceMappingURL=transform.js.map