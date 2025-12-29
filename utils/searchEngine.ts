
import { Table } from 'dexie';

/**
 * High-Performance Smart Search Engine
 * Handles millions of records by leveraging IndexedDB indices efficiently.
 */
export async function smartSearch<T>(
  table: Table<T, any>,
  query: string,
  searchFields: (keyof T)[],
  limit: number = 50
): Promise<T[]> {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  
  if (tokens.length === 0) {
    return await table.orderBy(searchFields[0] as string).limit(limit).toArray();
  }

  // Use the first token for a high-speed index-based prefix scan
  const primaryToken = tokens[0];
  const primaryField = searchFields[0] as string;

  // Search across all specified fields using the primary token
  const results = await Promise.all(
    searchFields.map(field => 
      table.where(field as string)
        .startsWithIgnoreCase(primaryToken)
        .limit(limit * 2) // Over-fetch to allow for subsequent refinement
        .toArray()
    )
  );

  // Flatten and de-duplicate results by ID
  // Fix: Explicitly type uniqueResults and use reduce for reliable type inference across environments
  const flattened: T[] = results.reduce((acc, val) => acc.concat(val), [] as T[]);
  const uniqueResults: T[] = Array.from(
    new Map<any, T>(flattened.map(item => [(item as any).id, item])).values()
  );

  // If more than one token, refine the results
  if (tokens.length > 1) {
    const remainingTokens = tokens.slice(1);
    return uniqueResults.filter(item => {
      const itemString = Object.values(item as object)
        .join(' ')
        .toLowerCase();
      return remainingTokens.every(token => itemString.includes(token));
    }).slice(0, limit);
  }

  return uniqueResults.slice(0, limit);
}
