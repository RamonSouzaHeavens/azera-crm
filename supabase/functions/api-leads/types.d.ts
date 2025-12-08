declare module 'supabase';

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: any) => Promise<Response>): void;
}

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
};
