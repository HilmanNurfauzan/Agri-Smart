import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

type NetworkListener = (isConnected: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkListener> = new Set();
  private _isConnected: boolean = false;
  private unsubscribe: (() => void) | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  start() {
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = !!(
        state.isConnected && state.isInternetReachable !== false
      );

      if (connected !== this._isConnected) {
        this._isConnected = connected;
        this.notifyListeners(connected);
      }
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(isConnected: boolean) {
    this.listeners.forEach((listener) => listener(isConnected));
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this._isConnected = !!(
      state.isConnected && state.isInternetReachable !== false
    );
    return this._isConnected;
  }
}

export const networkMonitor = new NetworkMonitor();
