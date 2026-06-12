import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { WebView } from "react-native-webview";
import {
  assignments,
  certificates,
  courseProgress,
  examStatus,
  journalEntries,
  liveRoomItems,
  messages,
  mobileRoutes,
  type MobileRoute,
  studentProfile
} from "./src/academyData";
import { getWebRoute } from "./src/academyApi";
import { colors, spacing, typography } from "./src/theme";

export default function App() {
  const [activeRoute, setActiveRoute] = useState<MobileRoute>("Dashboard");
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  const content = useMemo(() => {
    switch (activeRoute) {
      case "Courses":
        return <CoursesScreen />;
      case "Journal":
        return <JournalScreen />;
      case "Assignments":
        return <AssignmentsScreen />;
      case "Live Room":
        return <LiveRoomScreen compact={isCompact} />;
      case "Exams":
        return <ExamsScreen />;
      case "Certificates":
        return <CertificatesScreen />;
      case "Messages":
        return <MessagesScreen />;
      default:
        return <DashboardScreen setActiveRoute={setActiveRoute} />;
    }
  }, [activeRoute, isCompact]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>AFF</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Academy for Financial Future</Text>
          <Text style={styles.division}>Academy for Financial Future</Text>
        </View>
      </View>

      <View style={styles.navShell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
          {mobileRoutes.map((route) => (
            <Pressable
              key={route}
              style={[styles.navPill, activeRoute === route ? styles.navPillActive : null]}
              onPress={() => setActiveRoute(route)}
            >
              <Text style={[styles.navText, activeRoute === route ? styles.navTextActive : null]}>{route}</Text>
              {route === "Messages" && studentProfile.unreadMessages > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{studentProfile.unreadMessages}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardScreen({ setActiveRoute }: { setActiveRoute: (route: MobileRoute) => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Student Dashboard</Text>
      <Text style={styles.title}>Welcome to Academy for Financial Future</Text>
      <View style={styles.profileCard}>
        <Text style={styles.cardLabel}>Student Profile</Text>
        <Text style={styles.cardTitle}>{studentProfile.name}</Text>
        <Text style={styles.muted}>{studentProfile.email}</Text>
        <Text style={styles.goldLine}>{studentProfile.membership}</Text>
      </View>
      <View style={styles.metricGrid}>
        <Metric label="Certificates" value={String(studentProfile.certificates)} />
        <Metric label="Unread" value={String(studentProfile.unreadMessages)} />
      </View>
      <View style={styles.cardGrid}>
        {mobileRoutes.filter((route) => route !== "Dashboard").map((route) => (
          <Pressable key={route} style={styles.menuCard} onPress={() => setActiveRoute(route)}>
            <Text style={styles.cardTitle}>{route}</Text>
            <Text style={styles.muted}>Open your {route.toLowerCase()} workspace.</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CoursesScreen() {
  return (
    <ScreenFrame label="Course Library" title="Mobile course progress">
      {courseProgress.map((course) => (
        <View key={course.title} style={styles.card}>
          <Text style={styles.cardTitle}>{course.title}</Text>
          <Text style={styles.muted}>{course.lessons}</Text>
          <ProgressBar value={course.progress} />
          <Text style={styles.goldLine}>{course.progress}% complete</Text>
          <Text style={styles.muted}>Resume: {course.next}</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

function JournalScreen() {
  return (
    <ScreenFrame label="Trading Journal" title="Review and log trade plans">
      <View style={styles.actionPanel}>
        <Text style={styles.cardTitle}>Quick Journal Form</Text>
        <Text style={styles.muted}>Currency pair, direction, entry, stop loss, take profit, risk, notes, and screenshot URL are ready for Supabase sync.</Text>
      </View>
      {journalEntries.map((entry) => (
        <View key={`${entry.pair}-${entry.direction}`} style={styles.card}>
          <Text style={styles.cardTitle}>{entry.pair} - {entry.direction}</Text>
          <Text style={styles.goldLine}>Risk {entry.risk} - {entry.result}</Text>
          <Text style={styles.muted}>{entry.notes}</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

function AssignmentsScreen() {
  return (
    <ScreenFrame label="Assignments" title="Submit and track coursework">
      <View style={styles.actionPanel}>
        <Text style={styles.cardTitle}>Mobile Upload Ready</Text>
        <Text style={styles.muted}>The companion app is prepared for document picker uploads to Supabase Storage and lesson-connected submissions.</Text>
      </View>
      {assignments.map((assignment) => (
        <View key={assignment.title} style={styles.card}>
          <Text style={styles.cardTitle}>{assignment.title}</Text>
          <Text style={styles.muted}>{assignment.course}</Text>
          <Text style={styles.goldLine}>{assignment.status} - {assignment.grade}</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

function LiveRoomScreen({ compact }: { compact: boolean }) {
  return (
    <ScreenFrame label="Live Trading Room" title="Charts, broadcasts, and live desk">
      <View style={[styles.webViewShell, compact ? styles.webViewCompact : null]}>
        <WebView
          source={{ uri: "https://www.tradingview.com/chart/?symbol=FX%3AEURUSD" }}
          style={styles.webView}
          startInLoadingState
        />
      </View>
      {liveRoomItems.map((item) => (
        <View key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.muted}>{item.time}</Text>
          <Text style={styles.goldLine}>{item.status}</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

function ExamsScreen() {
  return (
    <ScreenFrame label="Certification Exams" title="Exam readiness and history">
      {examStatus.map((exam) => (
        <View key={exam.title} style={styles.card}>
          <Text style={styles.cardTitle}>{exam.title}</Text>
          <Text style={styles.goldLine}>{exam.status}</Text>
          <Text style={styles.muted}>Score: {exam.score}</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

function CertificatesScreen() {
  return (
    <ScreenFrame label="Certificates" title="Verified academy credentials">
      {certificates.map((certificate) => (
        <View key={certificate.number} style={styles.card}>
          <Text style={styles.cardLabel}>{certificate.status}</Text>
          <Text style={styles.cardTitle}>{certificate.number}</Text>
          <Text style={styles.muted}>{certificate.course}</Text>
          <Pressable style={styles.button} onPress={() => Linking.openURL(getWebRoute("/verify"))}>
            <Text style={styles.buttonText}>Open Verification Portal</Text>
          </Pressable>
        </View>
      ))}
    </ScreenFrame>
  );
}

function MessagesScreen() {
  return (
    <ScreenFrame label="Messaging Center" title="Inbox and academy notifications">
      {messages.map((message) => (
        <View key={message.title} style={[styles.card, message.unread ? styles.unreadCard : null]}>
          <Text style={styles.cardTitle}>{message.title}</Text>
          <Text style={styles.muted}>{message.body}</Text>
          <Text style={styles.goldLine}>{message.unread ? "Unread" : "Read"}</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

function ScreenFrame({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.stack}>{children}</View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(value, 100))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navy950
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.navy950
  },
  logoMark: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: colors.gold500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy800
  },
  logoText: {
    color: colors.gold300,
    fontWeight: "800",
    letterSpacing: 1
  },
  headerText: {
    flex: 1
  },
  brand: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  division: {
    color: colors.gold300,
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 2
  },
  navShell: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.navy900
  },
  nav: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm
  },
  navPill: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  navPillActive: {
    backgroundColor: colors.gold500,
    borderColor: colors.gold500
  },
  navText: {
    color: colors.gold300,
    fontWeight: "700",
    fontSize: 12
  },
  navTextActive: {
    color: colors.navy950
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.navy950,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: colors.gold300,
    fontSize: 10,
    fontWeight: "800"
  },
  content: {
    flex: 1
  },
  contentInner: {
    padding: spacing.lg,
    paddingBottom: 60
  },
  screen: {
    gap: spacing.lg
  },
  eyebrow: {
    ...typography.label
  },
  title: {
    ...typography.title
  },
  profileCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy900,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardGrid: {
    gap: spacing.md
  },
  menuCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy900,
    padding: spacing.lg
  },
  stack: {
    gap: spacing.md
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy900,
    padding: spacing.lg,
    gap: spacing.sm
  },
  unreadCard: {
    borderColor: colors.gold500,
    backgroundColor: colors.navy800
  },
  actionPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy800,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardLabel: {
    ...typography.label
  },
  cardTitle: {
    ...typography.sectionTitle
  },
  muted: {
    ...typography.body
  },
  goldLine: {
    color: colors.gold300,
    fontSize: 14,
    fontWeight: "700"
  },
  metricGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy900,
    padding: spacing.md
  },
  metricValue: {
    color: colors.gold300,
    fontSize: 26,
    fontWeight: "800"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.navy950,
    overflow: "hidden"
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.gold500
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.gold500,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center"
  },
  buttonText: {
    color: colors.navy950,
    fontWeight: "800"
  },
  webViewShell: {
    height: 420,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy950,
    overflow: "hidden"
  },
  webViewCompact: {
    height: 320
  },
  webView: {
    flex: 1,
    backgroundColor: colors.navy950
  }
});
