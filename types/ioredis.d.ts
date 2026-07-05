declare module "ioredis" {
  type RedisTlsOptions = {
    servername?: string;
  };

  export type RedisOptions = {
    maxRetriesPerRequest?: number | null;
    enableReadyCheck?: boolean;
    tls?: RedisTlsOptions;
  };

  export class Redis {
    constructor(url: string, options?: RedisOptions);
    on(event: "error", listener: (error: Error) => void): this;
    eval(
      script: string,
      numkeys: number,
      ...args: (string | number)[]
    ): Promise<unknown>;
    del(key: string): Promise<number>;
    quit(): Promise<string>;
  }

  export default Redis;
}
