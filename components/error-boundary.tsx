import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — mencegah white screen / Force Close
 * ketika salah satu komponen di pohon React gagal render.
 *
 * Menampilkan UI fallback dengan tombol "Coba Lagi" agar pengguna
 * tidak terjebak di layar kosong.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Di production, log diredam.
    // Untuk crash reporting (Sentry/Crashlytics), integrasikan di sini.
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🌱</Text>
          <Text style={styles.title}>Oops! Terjadi Kesalahan</Text>
          <Text style={styles.message}>
            Aplikasi mengalami masalah tak terduga. Silakan coba lagi.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.devError}>{this.state.error.toString()}</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f8fafc",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  devError: {
    fontSize: 12,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "monospace",
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
