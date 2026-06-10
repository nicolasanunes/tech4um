declare module 'socket.io-client' {
  export type Socket = {
    connected: boolean;
    on: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
    disconnect: () => void;
  };

  export function io(
    uri?: string,
    opts?: {
      withCredentials?: boolean;
    },
  ): Socket;
}
