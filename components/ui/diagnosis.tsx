import { Stack } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  Apple,
  ArrowLeft,
  Bug,
  Check,
  CheckCircle2,
  Circle,
  GitBranch,
  Leaf,
  RotateCcw,
  Search,
  Sprout,
  Stethoscope,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "../../src/contexts/data-context";
import {
  differentiatingQuestions,
  diseasesData,
  plantParts,
  symptomsData,
  type DifferentiatingQuestion,
  type MatchLevel,
  type PlantPart,
} from "../../src/data/melon-diseases";
import { logger } from "../../src/utils/logger";
import SyncStatusBar from "./sync-status-bar";

// ============================================================
// CONSTANTS
// ============================================================

const screenWidth = Dimensions.get("window").width;
const CARD_WIDTH = (screenWidth - 40 - 12) / 2;

const PART_ICONS: Record<PlantPart, React.ComponentType<any>> = {
  daun: Leaf,
  batang: GitBranch,
  buah: Apple,
  akar: Sprout,
  serangga: Bug,
};

const PART_COLORS: Record<
  PlantPart,
  { bg: string; icon: string; border: string }
> = {
  daun: { bg: "#dcfce7", icon: "#16a34a", border: "#86efac" },
  batang: { bg: "#fef3c7", icon: "#d97706", border: "#fcd34d" },
  buah: { bg: "#fce7f3", icon: "#db2777", border: "#f9a8d4" },
  akar: { bg: "#e0e7ff", icon: "#4f46e5", border: "#a5b4fc" },
  serangga: { bg: "#fee2e2", icon: "#dc2626", border: "#fca5a5" },
};

// ============================================================
// TYPES
// ============================================================

interface ScoredDisease {
  diseaseId: string;
  score: number;
  matchCount: number;
}

// ============================================================
// FORWARD CHAINING ENGINE
// ============================================================

/**
 * Menghitung skor kecocokan setiap penyakit terhadap gejala yang dipilih
 * dan jawaban pertanyaan pembeda.
 *
 * Base score = (gejala cocok / total gejala penyakit) * 100
 * Adjustment = +15 jika jawaban mendukung, -10 jika berlawanan
 */
function calculateScores(
  selectedSymptoms: string[],
  answers: Record<string, "ya" | "tidak" | "tidak_yakin">,
): ScoredDisease[] {
  if (selectedSymptoms.length === 0) return [];

  const scored: ScoredDisease[] = [];

  for (const disease of diseasesData) {
    const matchCount = disease.symptoms.filter((s) =>
      selectedSymptoms.includes(s),
    ).length;

    if (matchCount === 0) continue;

    const baseScore = (matchCount / disease.symptoms.length) * 100;

    let adjustment = 0;
    for (const [qId, answer] of Object.entries(answers)) {
      if (answer === "tidak_yakin") continue;
      const q = differentiatingQuestions.find((dq) => dq.id === qId);
      if (!q || !q.targetDiseases.includes(disease.id)) continue;

      if (answer === "ya") {
        adjustment += q.yesSupports.includes(disease.id) ? 15 : -10;
      } else {
        adjustment += q.noSupports.includes(disease.id) ? 15 : -10;
      }
    }

    scored.push({
      diseaseId: disease.id,
      score: Math.min(100, Math.max(0, Math.round(baseScore + adjustment))),
      matchCount,
    });
  }

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.matchCount - a.matchCount;
  });
}

/**
 * Mencari pertanyaan pembeda berikutnya yang relevan dengan
 * kandidat penyakit teratas dan belum pernah dijawab.
 * Hanya mengembalikan pertanyaan yang targetDiseases-nya memiliki
 * minimal 2 kandidat aktif.
 */
function getNextQuestion(
  topCandidateIds: string[],
  answeredIds: string[],
): DifferentiatingQuestion | null {
  return (
    differentiatingQuestions.find(
      (q) =>
        !answeredIds.includes(q.id) &&
        q.targetDiseases.filter((d) => topCandidateIds.includes(d)).length >= 2,
    ) ?? null
  );
}

/** Konversi skor numerik ke label kecocokan. */
function getMatchLabel(score: number): MatchLevel {
  if (score >= 80) return "Sangat Tinggi";
  if (score >= 60) return "Tinggi";
  if (score >= 40) return "Sedang";
  return "Rendah";
}

/** Warna dinamis berdasarkan skor kecocokan. */
function getMatchColors(score: number) {
  if (score >= 80) return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" };
  if (score >= 60) return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
  if (score >= 40) return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" };
  return { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" };
}

// ============================================================
// COMPONENT
// ============================================================

export default function DiagnosisPage() {
  const insets = useSafeAreaInsets();
  const { addDiagnosisRecord } = useData();

  // ── State ──
  const [step, setStep] = useState(1);
  const [selectedPart, setSelectedPart] = useState<PlantPart | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, "ya" | "tidak" | "tidak_yakin">
  >({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Computed (memoized) ──
  const scores = useMemo(
    () => calculateScores(selectedSymptoms, answers),
    [selectedSymptoms, answers],
  );

  const filteredSymptoms = useMemo(
    () =>
      selectedPart
        ? symptomsData.filter((s) => s.category === selectedPart)
        : [],
    [selectedPart],
  );

  const currentQuestion = useMemo((): DifferentiatingQuestion | null => {
    if (step !== 3) return null;
    const topIds = scores.slice(0, 3).map((s) => s.diseaseId);
    return getNextQuestion(topIds, Object.keys(answers));
  }, [step, scores, answers]);

  const topDisease = useMemo(() => {
    if (scores.length === 0) return null;
    return diseasesData.find((d) => d.id === scores[0].diseaseId) ?? null;
  }, [scores]);

  // Auto-transition: jika Step 3 tanpa pertanyaan tersedia → Step 4
  useEffect(() => {
    if (step === 3 && !currentQuestion) {
      setStep(4);
    }
  }, [step, currentQuestion]);

  // ── Handlers ──
  const handleSelectPart = (part: PlantPart) => {
    setSelectedPart(part);
    setStep(2);
  };

  const handleToggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleDiagnose = () => {
    const computed = calculateScores(selectedSymptoms, {});
    const topIds = computed.slice(0, 3).map((s) => s.diseaseId);
    const firstQ = getNextQuestion(topIds, []);

    const skipToResult =
      computed.length <= 1 ||
      (computed.length > 1 && computed[0].score - computed[1].score > 30) ||
      !firstQ;

    setStep(skipToResult ? 4 : 3);
  };

  const handleAnswer = (answer: "ya" | "tidak" | "tidak_yakin") => {
    if (!currentQuestion) return;

    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    const newScores = calculateScores(selectedSymptoms, newAnswers);
    const answeredCount = Object.keys(newAnswers).length;
    const topIds = newScores.slice(0, 3).map((s) => s.diseaseId);
    const nextQ = getNextQuestion(topIds, Object.keys(newAnswers));

    const shouldFinish =
      !nextQ ||
      answeredCount >= 5 ||
      newScores.length <= 1 ||
      (newScores.length > 1 && newScores[0].score - newScores[1].score > 25);

    if (shouldFinish) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setSelectedPart(null);
      setSelectedSymptoms([]);
      setStep(1);
    } else if (step === 3) {
      setAnswers({});
      setStep(2);
    } else if (step === 4) {
      setAnswers({});
      setIsSaved(false);
      setStep(2);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedPart(null);
    setSelectedSymptoms([]);
    setAnswers({});
    setIsSaved(false);
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!topDisease || scores.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      await addDiagnosisRecord({
        date: new Date().toISOString().split("T")[0],
        selected_symptoms: JSON.stringify(selectedSymptoms),
        risk_level: topDisease.severity,
        result_title: topDisease.name,
        result_description: `${topDisease.scientificName} — Kecocokan: ${scores[0].score}% (${getMatchLabel(scores[0].score)})`,
        recommendations: JSON.stringify(topDisease.recommendations),
      });
      setIsSaved(true);
      Alert.alert("Berhasil", "Hasil diagnosis telah disimpan.");
    } catch (error) {
      logger.error("[Diagnosis] Failed to save:", error);
      Alert.alert("Gagal", "Tidak dapat menyimpan hasil diagnosis.");
    } finally {
      setIsSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <Stethoscope size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Diagnosis Penyakit Melon</Text>
            <Text style={styles.headerSubtitle}>Sistem Pakar Interaktif</Text>
          </View>
        </View>
        <SyncStatusBar />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Progress Indicator ── */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.progressDot,
                  s <= step
                    ? styles.progressDotActive
                    : styles.progressDotInactive,
                  s === step && styles.progressDotCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.progressDotText,
                    s <= step
                      ? styles.progressDotTextActive
                      : styles.progressDotTextInactive,
                  ]}
                >
                  {s}
                </Text>
              </View>
              {s < 4 && (
                <View
                  style={[
                    styles.progressLine,
                    s < step
                      ? styles.progressLineActive
                      : styles.progressLineInactive,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.progressLabel}>Langkah {step} dari 4</Text>

        {/* ══════════════════════════════════════════════════════
            STEP 1: Pilih Bagian Tanaman
            ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <View style={styles.body}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Pilih{" "}
                <Text style={{ fontWeight: "bold" }}>satu bagian tanaman</Text>{" "}
                yang mengalami gejala atau masalah.
              </Text>
            </View>

            <View style={styles.partGrid}>
              {plantParts.map((part, index) => {
                const Icon = PART_ICONS[part.id];
                const colors = PART_COLORS[part.id];
                const isLastOdd =
                  index === plantParts.length - 1 &&
                  plantParts.length % 2 !== 0;

                return (
                  <TouchableOpacity
                    key={part.id}
                    style={[
                      styles.partCard,
                      { borderColor: colors.border },
                      isLastOdd && styles.partCardFull,
                    ]}
                    onPress={() => handleSelectPart(part.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.partIconBox,
                        { backgroundColor: colors.bg },
                      ]}
                    >
                      <Icon size={28} color={colors.icon} />
                    </View>
                    <Text style={styles.partLabel}>{part.label}</Text>
                    <Text style={styles.partDesc}>{part.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2: Pilih Gejala
            ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <View style={styles.body}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#6b7280" />
              <Text style={styles.backBtnText}>Kembali</Text>
            </TouchableOpacity>

            {/* Selected Part Badge */}
            {selectedPart && (
              <View
                style={[
                  styles.partBadge,
                  {
                    backgroundColor: PART_COLORS[selectedPart].bg,
                    borderColor: PART_COLORS[selectedPart].border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.partBadgeText,
                    { color: PART_COLORS[selectedPart].icon },
                  ]}
                >
                  Gejala pada:{" "}
                  {plantParts.find((p) => p.id === selectedPart)?.label}
                </Text>
              </View>
            )}

            {/* Symptom List */}
            <View style={styles.symptomList}>
              {filteredSymptoms.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom.id);

                return (
                  <TouchableOpacity
                    key={symptom.id}
                    onPress={() => handleToggleSymptom(symptom.id)}
                    style={[
                      styles.symptomCard,
                      isSelected && styles.symptomCardActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.symptomRow}>
                      {isSelected ? (
                        <View style={styles.cbChecked}>
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={styles.cbUnchecked} />
                      )}
                      <Text
                        style={[
                          styles.symptomLabel,
                          isSelected && styles.symptomLabelActive,
                        ]}
                      >
                        {symptom.label}
                      </Text>
                      {symptom.severity === "high" && (
                        <View style={styles.severityBadge}>
                          <Text style={styles.severityBadgeText}>Serius</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Diagnose Button */}
            <TouchableOpacity
              onPress={handleDiagnose}
              disabled={selectedSymptoms.length === 0}
              style={[
                styles.diagnoseBtn,
                selectedSymptoms.length === 0 && styles.diagnoseBtnDisabled,
              ]}
              activeOpacity={0.8}
            >
              <Search size={20} color="#fff" />
              <Text style={styles.diagnoseBtnText}>
                Diagnosis Sekarang ({selectedSymptoms.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3: Pertanyaan Pembeda
            ══════════════════════════════════════════════════════ */}
        {step === 3 && currentQuestion && (
          <View style={styles.body}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#6b7280" />
              <Text style={styles.backBtnText}>Kembali</Text>
            </TouchableOpacity>

            {/* Question Card */}
            <View style={styles.questionCard}>
              <Text style={styles.questionBadge}>
                Pertanyaan Pembeda #{Object.keys(answers).length + 1}
              </Text>
              <Text style={styles.questionText}>
                {currentQuestion.question}
              </Text>
            </View>

            {/* Answer Buttons */}
            <View style={styles.answerBtnRow}>
              <TouchableOpacity
                style={[styles.answerBtn, styles.answerBtnYes]}
                onPress={() => handleAnswer("ya")}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={20} color="#16a34a" />
                <Text style={styles.answerBtnYesText}>Ya</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.answerBtn, styles.answerBtnNo]}
                onPress={() => handleAnswer("tidak")}
                activeOpacity={0.8}
              >
                <AlertCircle size={20} color="#dc2626" />
                <Text style={styles.answerBtnNoText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.answerBtn, styles.answerBtnUnsure]}
                onPress={() => handleAnswer("tidak_yakin")}
                activeOpacity={0.8}
              >
                <Circle size={20} color="#6b7280" />
                <Text style={styles.answerBtnUnsureText}>Tidak Yakin</Text>
              </TouchableOpacity>
            </View>

            {/* Current Candidates */}
            <View style={styles.candidateSection}>
              <Text style={styles.candidateTitle}>Kemungkinan saat ini:</Text>
              {scores.slice(0, 3).map((s, idx) => {
                const disease = diseasesData.find((d) => d.id === s.diseaseId);
                if (!disease) return null;
                return (
                  <View
                    key={s.diseaseId}
                    style={[
                      styles.candidateRow,
                      idx === Math.min(scores.length, 3) - 1 &&
                        styles.candidateRowLast,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.candidateName}>{disease.name}</Text>
                      <Text style={styles.candidateScientific}>
                        {disease.scientificName}
                      </Text>
                    </View>
                    <View style={styles.candidateScoreBadge}>
                      <Text style={styles.candidateScoreText}>{s.score}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 4: Hasil Diagnosis
            ══════════════════════════════════════════════════════ */}
        {step === 4 &&
          topDisease &&
          scores.length > 0 &&
          (() => {
            const topScore = scores[0];
            const matchLabel = getMatchLabel(topScore.score);
            const mc = getMatchColors(topScore.score);

            const SevIcon =
              topDisease.severity === "high"
                ? AlertCircle
                : topDisease.severity === "medium"
                  ? AlertTriangle
                  : CheckCircle2;
            const severityLabel =
              topDisease.severity === "high"
                ? "Tinggi"
                : topDisease.severity === "medium"
                  ? "Sedang"
                  : "Rendah";
            const severityColor =
              topDisease.severity === "high"
                ? "#dc2626"
                : topDisease.severity === "medium"
                  ? "#f59e0b"
                  : "#22c55e";

            return (
              <View style={styles.body}>
                {/* ── Main Result Card ── */}
                <View
                  style={[
                    styles.resultCard,
                    { backgroundColor: mc.bg, borderColor: mc.border },
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <View
                      style={[
                        styles.resultIconCircle,
                        { backgroundColor: severityColor },
                      ]}
                    >
                      <SevIcon color="#fff" size={28} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{topDisease.name}</Text>
                      <Text style={styles.resultScientific}>
                        {topDisease.scientificName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultMetrics}>
                    <View style={styles.resultMetric}>
                      <Text style={styles.resultMetricLabel}>Kecocokan</Text>
                      <Text
                        style={[styles.resultMetricValue, { color: mc.text }]}
                      >
                        {topScore.score}%
                      </Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.resultMetric}>
                      <Text style={styles.resultMetricLabel}>Tingkat</Text>
                      <Text
                        style={[styles.resultMetricValue, { color: mc.text }]}
                      >
                        {matchLabel}
                      </Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.resultMetric}>
                      <Text style={styles.resultMetricLabel}>Risiko</Text>
                      <Text
                        style={[
                          styles.resultMetricValue,
                          { color: severityColor },
                        ]}
                      >
                        {severityLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Deskripsi ── */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Deskripsi</Text>
                  <Text style={styles.cardText}>{topDisease.description}</Text>
                </View>

                {/* ── Rekomendasi Penanganan ── */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Rekomendasi Penanganan</Text>
                  {topDisease.recommendations.map((rec, i) => (
                    <View key={i} style={styles.recItem}>
                      <View style={styles.recNum}>
                        <Text style={styles.recNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.recText}>{rec}</Text>
                    </View>
                  ))}
                </View>

                {/* ── Kemungkinan Lain ── */}
                {scores.length > 1 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Kemungkinan Lain</Text>
                    {scores.slice(1, 4).map((s, idx) => {
                      const disease = diseasesData.find(
                        (d) => d.id === s.diseaseId,
                      );
                      if (!disease) return null;
                      const otherMc = getMatchColors(s.score);
                      return (
                        <View
                          key={s.diseaseId}
                          style={[
                            styles.otherRow,
                            idx === Math.min(scores.length - 1, 3) - 1 &&
                              styles.otherRowLast,
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.otherName}>{disease.name}</Text>
                            <Text style={styles.otherScientific}>
                              {disease.scientificName}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.otherScoreBadge,
                              {
                                backgroundColor: otherMc.bg,
                                borderColor: otherMc.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.otherScoreText,
                                { color: otherMc.text },
                              ]}
                            >
                              {s.score}%
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* ── Gejala yang Dipilih ── */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Gejala yang Dipilih</Text>
                  <View style={styles.chipRow}>
                    {symptomsData
                      .filter((s) => selectedSymptoms.includes(s.id))
                      .map((s) => (
                        <View key={s.id} style={styles.chip}>
                          <Text style={styles.chipText}>{s.label}</Text>
                        </View>
                      ))}
                  </View>
                </View>

                {/* ── Pertanyaan yang Dijawab ── */}
                {Object.keys(answers).length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Pertanyaan Dijawab</Text>
                    {Object.entries(answers).map(([qId, answer]) => {
                      const q = differentiatingQuestions.find(
                        (dq) => dq.id === qId,
                      );
                      if (!q) return null;
                      const answerLabel =
                        answer === "ya"
                          ? "Ya"
                          : answer === "tidak"
                            ? "Tidak"
                            : "Tidak Yakin";
                      const answerColor =
                        answer === "ya"
                          ? "#16a34a"
                          : answer === "tidak"
                            ? "#dc2626"
                            : "#6b7280";
                      return (
                        <View key={qId} style={styles.answeredItem}>
                          <Text style={styles.answeredQuestion}>
                            {q.question}
                          </Text>
                          <View
                            style={[
                              styles.answeredBadge,
                              {
                                backgroundColor:
                                  answer === "ya"
                                    ? "#f0fdf4"
                                    : answer === "tidak"
                                      ? "#fef2f2"
                                      : "#f9fafb",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.answeredBadgeText,
                                { color: answerColor },
                              ]}
                            >
                              {answerLabel}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* ── Action Buttons ── */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaved || isSaving}
                  style={[
                    styles.saveBtn,
                    (isSaved || isSaving) && styles.saveBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {isSaved
                      ? "Tersimpan"
                      : isSaving
                        ? "Menyimpan..."
                        : "Simpan ke Riwayat"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReset}
                  style={styles.resetBtn}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={18} color="#fff" />
                  <Text style={styles.resetBtnText}>Diagnosis Baru</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

        {/* ── Empty State (tidak ada kandidat cocok) ── */}
        {step === 4 && scores.length === 0 && (
          <View style={styles.body}>
            <View style={styles.emptyState}>
              <AlertCircle size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                Tidak ditemukan penyakit yang cocok dengan gejala yang dipilih.
                Coba pilih gejala lain atau bagian tanaman yang berbeda.
              </Text>
              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetBtn}
                activeOpacity={0.8}
              >
                <RotateCcw size={18} color="#fff" />
                <Text style={styles.resetBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scrollContent: { paddingBottom: 40 },

  // ── Header ──
  header: {
    backgroundColor: "#ef4444",
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#fee2e2" },

  // ── Progress Indicator ──
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    marginTop: 20,
    marginBottom: 8,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: { backgroundColor: "#ef4444" },
  progressDotInactive: { backgroundColor: "#e5e7eb" },
  progressDotCurrent: { borderWidth: 3, borderColor: "#fca5a5" },
  progressDotText: { fontSize: 14, fontWeight: "bold" },
  progressDotTextActive: { color: "#fff" },
  progressDotTextInactive: { color: "#9ca3af" },
  progressLine: { width: 28, height: 3, borderRadius: 2 },
  progressLineActive: { backgroundColor: "#ef4444" },
  progressLineInactive: { backgroundColor: "#e5e7eb" },
  progressLabel: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 16,
    fontWeight: "500",
  },

  // ── Body ──
  body: { paddingHorizontal: 20, paddingBottom: 20 },

  // ── Back Button ──
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtnText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },

  // ── Info Box ──
  infoBox: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: { color: "#1e40af", fontSize: 14, lineHeight: 20 },

  // ── Step 1: Part Grid ──
  partGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  partCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  partCardFull: {
    width: "100%" as any,
  },
  partIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  partLabel: { fontSize: 16, fontWeight: "bold", color: "#1f2937" },
  partDesc: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
  },

  // ── Step 2: Part Badge ──
  partBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  partBadgeText: { fontSize: 15, fontWeight: "600" },

  // ── Step 2: Symptom List ──
  symptomList: { gap: 10, marginBottom: 20 },
  symptomCard: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  symptomCardActive: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  symptomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cbChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  cbUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  symptomLabel: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  symptomLabelActive: { color: "#166534", fontWeight: "600" },
  severityBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  severityBadgeText: {
    color: "#b91c1c",
    fontSize: 10,
    fontWeight: "bold",
  },

  // ── Step 2: Diagnose Button ──
  diagnoseBtn: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
  },
  diagnoseBtnDisabled: { backgroundColor: "#d1d5db" },
  diagnoseBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  // ── Step 3: Question Card ──
  questionCard: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  questionBadge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ef4444",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 16,
    color: "#1f2937",
    lineHeight: 24,
    fontWeight: "500",
  },

  // ── Step 3: Answer Buttons ──
  answerBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  answerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  answerBtnYes: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  answerBtnNo: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  answerBtnUnsure: {
    backgroundColor: "#f9fafb",
    borderColor: "#d1d5db",
  },
  answerBtnYesText: { color: "#16a34a", fontWeight: "bold", fontSize: 14 },
  answerBtnNoText: { color: "#dc2626", fontWeight: "bold", fontSize: 14 },
  answerBtnUnsureText: { color: "#6b7280", fontWeight: "bold", fontSize: 12 },

  // ── Step 3: Candidates ──
  candidateSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  candidateTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 12,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  candidateRowLast: {
    borderBottomWidth: 0,
  },
  candidateName: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  candidateScientific: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  candidateScoreBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  candidateScoreText: {
    color: "#1d4ed8",
    fontWeight: "bold",
    fontSize: 14,
  },

  // ── Step 4: Result Card ──
  resultCard: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  resultIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  resultScientific: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 2,
  },
  resultMetrics: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: 12,
  },
  resultMetric: { alignItems: "center", flex: 1 },
  resultMetricLabel: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  resultMetricValue: { fontSize: 18, fontWeight: "bold" },
  metricDivider: { width: 1, height: 32, backgroundColor: "#e5e7eb" },

  // ── Step 4: Generic Card ──
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  cardText: { fontSize: 14, color: "#374151", lineHeight: 22 },

  // ── Recommendations ──
  recItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  recNum: {
    width: 24,
    height: 24,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recNumText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  recText: { flex: 1, color: "#374151", fontSize: 14, lineHeight: 20 },

  // ── Other Candidates ──
  otherRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  otherRowLast: { borderBottomWidth: 0 },
  otherName: { fontSize: 14, fontWeight: "600", color: "#374151" },
  otherScientific: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  otherScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  otherScoreText: { fontWeight: "bold", fontSize: 14 },

  // ── Chips ──
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipText: { fontSize: 12, color: "#374151" },

  // ── Answered Questions ──
  answeredItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  answeredQuestion: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  answeredBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  answeredBadgeText: { fontSize: 12, fontWeight: "bold" },

  // ── Action Buttons ──
  saveBtn: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
    marginBottom: 12,
  },
  saveBtnDisabled: { backgroundColor: "#86efac" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  resetBtn: {
    backgroundColor: "#4b5563",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
  },
  resetBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // ── Empty State ──
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
