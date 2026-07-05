import { createConnection, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";

function decodeRedisUrlCredential(value: string): string {
  return decodeURIComponent(value);
}

function buildRedisAuthCommand(redisUrl: string): string | null {
  const parsed = new URL(redisUrl);
  const username =
    parsed.username.length > 0
      ? decodeRedisUrlCredential(parsed.username)
      : undefined;
  const password =
    parsed.password.length > 0
      ? decodeRedisUrlCredential(parsed.password)
      : undefined;

  if (username !== undefined && password !== undefined) {
    return `AUTH ${username} ${password}\r\n`;
  }

  if (password !== undefined) {
    return `AUTH ${password}\r\n`;
  }

  return null;
}

function getRedisSocketTarget(redisUrl: string): {
  host: string;
  port: number;
  tls: boolean;
} {
  const parsed = new URL(redisUrl);
  const defaultPort = parsed.protocol === "rediss:" ? 6380 : 6379;
  return {
    host: parsed.hostname,
    port: parsed.port.length > 0 ? Number(parsed.port) : defaultPort,
    tls: parsed.protocol === "rediss:",
  };
}

function readRedisResponse(buffer: string): {
  remaining: string;
  lines: string[];
} {
  const parts = buffer.split("\r\n");
  const remaining = parts.pop() ?? "";
  return { remaining, lines: parts };
}

function closeSocket(socket: Socket): void {
  socket.removeAllListeners();
  socket.destroy();
}

function createRedisSocket(redisUrl: string): Socket {
  const { host, port, tls } = getRedisSocketTarget(redisUrl);
  if (tls) {
    return tlsConnect({ host, port, servername: host });
  }

  return createConnection({ host, port });
}

export async function pingRedisUrl(
  redisUrl: string,
  timeoutMs: number,
): Promise<void> {
  const authCommand = buildRedisAuthCommand(redisUrl);

  await new Promise<void>((resolve, reject) => {
    const socket = createRedisSocket(redisUrl);
    let buffer = "";
    let awaiting: "auth" | "ping" | null = authCommand === null ? "ping" : "auth";

    const timer = setTimeout(() => {
      closeSocket(socket);
      reject(Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }));
    }, timeoutMs);

    const fail = (error: Error) => {
      clearTimeout(timer);
      closeSocket(socket);
      reject(error);
    };

    const succeed = () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    };

    socket.on("error", (error) => {
      fail(error);
    });

    socket.on("connect", () => {
      if (authCommand !== null) {
        socket.write(authCommand);
        return;
      }

      socket.write("PING\r\n");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const { remaining, lines } = readRedisResponse(buffer);
      buffer = remaining;

      for (const line of lines) {
        if (line.startsWith("+PONG")) {
          succeed();
          return;
        }

        if (line.startsWith("+OK") && awaiting === "auth") {
          awaiting = "ping";
          socket.write("PING\r\n");
          continue;
        }

        if (line.startsWith("-NOAUTH") || line.startsWith("-WRONGPASS")) {
          fail(
            Object.assign(new Error(line.slice(1)), {
              code: line.startsWith("-WRONGPASS") ? "WRONGPASS" : "NOAUTH",
            }),
          );
          return;
        }

        if (line.startsWith("-")) {
          fail(new Error(line.slice(1)));
          return;
        }
      }
    });
  });
}
