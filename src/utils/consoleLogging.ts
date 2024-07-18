
import { Readable } from 'svelte/store';
import type { TaggedLine } from '../types';
import { logger } from './logger';
// Utility function to print the store value
export function printReadableStore(store: Readable<Record<string, TaggedLine[]>>): void {
    store.subscribe(value => {
        logger.info(JSON.stringify(value, null, 2));
    })();
}
