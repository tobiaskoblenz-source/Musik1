import { NextResponse } from 'next/server';

export async function GET(request) {
  const url = new URL(request.url);
  const target = new URL('/spotify/callback', url.origin);

  for (const [key, value] of url.searchParams.entries()) {
    target.searchParams.append(key, value);
  }

  return NextResponse.redirect(target);
}
