export function decodeCursor<T>(cursor: string): T {
  const json = Buffer.from(cursor, 'base64url').toString('utf8');
  return JSON.parse(json) as T;
}

export function encodeCursor<T>(data: T): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}
