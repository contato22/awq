/**
 * Node 20 (o do CI) não tem WebSocket global. @supabase/realtime-js 2.105
 * lança ao construir o client, e test:recon importa lib/supabase.ts.
 * Os testes puros não abrem socket: um construtor vazio basta para o
 * detectEnvironment seguir. No Node 22+ o global já existe e isto não faz nada.
 */
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class WebSocket {
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
