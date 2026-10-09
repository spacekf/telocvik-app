/**
 * Název session cookie. Záměrně samostatný modul BEZ "server-only" importů,
 * aby ho mohl použít i middleware (Edge runtime) bez tažení Prisma/node API.
 */
export const SESSION_COOKIE = "telocvik_session";
