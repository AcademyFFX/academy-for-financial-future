export const colors = {
  navy950: "#07111f",
  navy900: "#0b1728",
  navy800: "#10233c",
  navy700: "#17365c",
  gold500: "#d6ad55",
  gold400: "#e3c675",
  gold300: "#f3dc9b",
  ink: "#dce6f5",
  muted: "rgba(220, 230, 245, 0.68)",
  border: "rgba(214, 173, 85, 0.24)",
  danger: "#fecaca",
  success: "#bbf7d0"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28
};

export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    color: colors.ink
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700" as const,
    color: colors.ink
  },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    color: colors.gold300,
    fontWeight: "700" as const
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted
  }
};
