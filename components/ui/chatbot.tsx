import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Bot, Construction, Send, User } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Interfaces & Data (Sama dengan Web) ---
interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const quickQuestions = [
  "Kapan waktu pemupukan terbaik?",
  "Cara mengatasi daun menguning?",
  "Berapa kali penyiraman per hari?",
  "Tanda tanaman kurang nutrisi?",
];

const botResponses: { [key: string]: string } = {
  "kapan waktu pemupukan terbaik":
    "Waktu pemupukan terbaik adalah pagi hari (06:00-08:00) atau sore hari (16:00-18:00) saat suhu tidak terlalu panas. Pemupukan sebaiknya dilakukan 2-4 minggu sekali tergantung jenis tanaman dan fase pertumbuhan.",
  "cara mengatasi daun menguning":
    "Daun menguning bisa disebabkan oleh: 1) Kekurangan nitrogen - berikan pupuk NPK, 2) Kelebihan air - kurangi frekuensi penyiraman, 3) Kekurangan sinar matahari - pindahkan ke lokasi lebih terang, 4) Penyakit - aplikasikan fungisida jika perlu.",
  "berapa kali penyiraman per hari":
    "Frekuensi penyiraman tergantung cuaca dan jenis tanaman. Umumnya: Musim kemarau: 2x sehari (pagi dan sore), Musim hujan: 1x sehari atau sesuai kebutuhan. Pastikan media tanam tidak terlalu basah atau kering.",
  "tanda tanaman kurang nutrisi":
    "Tanda kekurangan nutrisi: 1) Daun menguning (kurang Nitrogen), 2) Tepi daun kecoklatan (kurang Kalium), 3) Pertumbuhan terhambat (kurang Fosfor), 4) Daun muda pucat (kurang Zat Besi). Solusi: berikan pupuk lengkap NPK.",
};

export default function ChatbotPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showDevModal, setShowDevModal] = useState(true);

  // Reset modal setiap kali screen mendapat focus
  useFocusEffect(
    useCallback(() => {
      setShowDevModal(true);
    }, []),
  );

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Halo! Saya Asisten AI untuk membantu Anda dalam budidaya tanaman. Ada yang bisa saya bantu?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Ref untuk ScrollView agar bisa scroll ke bawah otomatis
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    // Delay sedikit agar layout render dulu baru scroll
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [messages, isTyping]);

  // Cleanup bot response timer saat unmount
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    for (const [key, response] of Object.entries(botResponses)) {
      if (
        lowerMessage.includes(key.split(" ")[0]) ||
        lowerMessage.includes(key)
      ) {
        return response;
      }
    }

    return "Maaf, saya belum bisa menjawab pertanyaan tersebut dengan spesifik. Silakan coba pertanyaan lain atau pilih dari menu pertanyaan cepat.";
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    setIsTyping(true);

    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      const botResponse = getBotResponse(text);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <View style={styles.container}>
      {/* Development Modal Overlay */}
      <Modal
        visible={showDevModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Construction color="#f97316" size={48} />
            </View>
            <Text style={styles.modalTitle}>Fitur Dalam Pengembangan</Text>
            <Text style={styles.modalSubtitle}>
              Fitur Asisten AI sedang dalam tahap pengembangan dan belum dapat
              digunakan sepenuhnya. Kami sedang bekerja keras untuk
              menyelesaikannya!
            </Text>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>🚧 Coming Soon</Text>
            </View>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setShowDevModal(false);
                router.replace("/(tabs)" as any);
              }}
            >
              <ArrowLeft color="#fff" size={20} />
              <Text style={styles.modalBackButtonText}>Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Config Header */}
      <Stack.Screen
        options={{
          headerShown: false, // Kita pakai custom header
        }}
      />

      {/* Header Custom */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.botIconContainer}>
            <Bot size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Asisten AI</Text>
            <Text style={styles.headerSubtitle}>Tanya jawab pertanian</Text>
          </View>
        </View>
      </View>

      {/* Area Chat & Input harus dibungkus KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Message List */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.sender === "user" ? styles.rowReverse : styles.rowStart,
              ]}
            >
              {/* Avatar */}
              <View
                style={[
                  styles.avatar,
                  message.sender === "bot"
                    ? styles.avatarBot
                    : styles.avatarUser,
                ]}
              >
                {message.sender === "bot" ? (
                  <Bot size={18} color="#ea580c" />
                ) : (
                  <User size={18} color="#16a34a" />
                )}
              </View>

              {/* Chat Bubble */}
              <View
                style={[
                  styles.bubble,
                  message.sender === "bot"
                    ? styles.bubbleBot
                    : styles.bubbleUser,
                ]}
              >
                <Text
                  style={
                    message.sender === "bot" ? styles.textBot : styles.textUser
                  }
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.timestamp,
                    message.sender === "bot" ? styles.timeBot : styles.timeUser,
                  ]}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageRow, styles.rowStart]}>
              <View style={[styles.avatar, styles.avatarBot]}>
                <Bot size={18} color="#ea580c" />
              </View>
              <View
                style={[
                  styles.bubble,
                  styles.bubbleBot,
                  { flexDirection: "row", gap: 4, paddingVertical: 16 },
                ]}
              >
                <View style={styles.dot} />
                <View style={[styles.dot, { opacity: 0.6 }]} />
                <View style={[styles.dot, { opacity: 0.3 }]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Questions (Hanya muncul jika chat masih sedikit) */}
        {messages.length <= 3 && !isTyping && (
          <View style={styles.quickQaContainer}>
            <Text style={styles.quickQaLabel}>Pertanyaan Cepat:</Text>
            <View style={styles.quickQaGrid}>
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleQuickQuestion(question)}
                  style={styles.quickQaButton}
                >
                  <Text style={styles.quickQaText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ketik pertanyaan Anda..."
            placeholderTextColor="#9ca3af"
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage(inputText)} // Handle tombol Enter keyboard
          />
          <TouchableOpacity
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              !inputText.trim()
                ? styles.sendButtonDisabled
                : styles.sendButtonActive,
            ]}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    backgroundColor: "#f97316", // orange-500
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  botIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#ffedd5" },

  scrollContent: { padding: 16, paddingBottom: 20 },

  messageRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "flex-end",
  },
  rowStart: { justifyContent: "flex-start" },
  rowReverse: { flexDirection: "row-reverse" },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBot: { backgroundColor: "#ffedd5" }, // orange-100
  avatarUser: { backgroundColor: "#dcfce7" }, // green-100

  bubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },
  bubbleBot: {
    backgroundColor: "#f3f4f6", // gray-100
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: "#22c55e", // green-500
    borderBottomRightRadius: 4,
  },

  textBot: { color: "#1f2937", fontSize: 14, lineHeight: 20 },
  textUser: { color: "#ffffff", fontSize: 14, lineHeight: 20 },

  timestamp: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  timeBot: { color: "#6b7280" },
  timeUser: { color: "#dcfce7" },

  // Typing Dots
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#6b7280" },

  // Quick QA
  quickQaContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  quickQaLabel: { fontSize: 12, color: "#4b5563", marginBottom: 8 },
  quickQaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickQaButton: {
    width: "48%", // Grid 2 kolom
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    borderRadius: 12,
  },
  quickQaText: { fontSize: 11, color: "#374151" },

  // Input Area
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: { backgroundColor: "#f97316" },
  sendButtonDisabled: { backgroundColor: "#d1d5db" },

  // Development Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIconCircle: {
    backgroundColor: "#fff7ed",
    borderRadius: 50,
    padding: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#fed7aa",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  modalBadgeText: {
    color: "#92400e",
    fontWeight: "600",
    fontSize: 14,
  },
  modalBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#f97316",
  },
  modalBackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
