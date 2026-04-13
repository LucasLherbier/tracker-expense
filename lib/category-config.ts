/**
 * Category configuration: icons (emoji) and brand colors for each category.
 * Used across Add, Journal, Home, Metrics, and Graphs screens.
 */

export interface CategoryConfig {
  icon: string;
  color: string;      // hex color for charts / badges
  bgColor: string;    // light background for icon containers
}

/** Ordered list of category names (matches Google Sheet column G) */
export const CATEGORY_NAMES = [
  "Logement", "Nourriture", "Restaurant", "Bar/Café", "Transport",
  "Sports", "Aviron", "Vacances", "Week End", "Soirée", "Multimédia",
  "Vêtements", "Cadeau", "Spectacles", "Santé", "Education",
  "Administratif", "Autres", "Impôts",
] as const;

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  "Logement":       { icon: "🏠", color: "#6366F1", bgColor: "#EEF2FF" },
  "Nourriture":     { icon: "🛒", color: "#F59E0B", bgColor: "#FFFBEB" },
  "Restaurant":     { icon: "🍽️", color: "#EF4444", bgColor: "#FEF2F2" },
  "Bar/Café":       { icon: "☕", color: "#92400E", bgColor: "#FEF3C7" },
  "Transport":      { icon: "🚗", color: "#3B82F6", bgColor: "#EFF6FF" },
  "Sports":         { icon: "🏃", color: "#10B981", bgColor: "#ECFDF5" },
  "Aviron":         { icon: "🚣", color: "#0EA5E9", bgColor: "#F0F9FF" },
  "Vacances":       { icon: "✈️", color: "#8B5CF6", bgColor: "#F5F3FF" },
  "Week End":       { icon: "🌅", color: "#F97316", bgColor: "#FFF7ED" },
  "Soirée":         { icon: "🎉", color: "#EC4899", bgColor: "#FDF2F8" },
  "Multimédia":     { icon: "💻", color: "#64748B", bgColor: "#F8FAFC" },
  "Vêtements":      { icon: "👕", color: "#A855F7", bgColor: "#FAF5FF" },
  "Cadeau":         { icon: "🎁", color: "#F43F5E", bgColor: "#FFF1F2" },
  "Spectacles":     { icon: "🎭", color: "#D946EF", bgColor: "#FDF4FF" },
  "Santé":          { icon: "💊", color: "#14B8A6", bgColor: "#F0FDFA" },
  "Education":      { icon: "📚", color: "#0284C7", bgColor: "#F0F9FF" },
  "Administratif":  { icon: "📋", color: "#78716C", bgColor: "#FAFAF9" },
  "Autres":         { icon: "📦", color: "#9CA3AF", bgColor: "#F9FAFB" },
  "Impôts":         { icon: "🏛️", color: "#DC2626", bgColor: "#FEF2F2" },
};

const DEFAULT_CONFIG: CategoryConfig = {
  icon: "💰",
  color: "#6B7280",
  bgColor: "#F9FAFB",
};

export function getCategoryConfig(categoryName: string): CategoryConfig {
  return CATEGORY_MAP[categoryName] ?? DEFAULT_CONFIG;
}

/**
 * Get a deterministic color for a category not in the map.
 */
const PALETTE = [
  "#6366F1", "#F59E0B", "#EF4444", "#10B981", "#3B82F6",
  "#8B5CF6", "#F97316", "#EC4899", "#0EA5E9", "#14B8A6",
  "#D946EF", "#A855F7", "#F43F5E", "#64748B", "#0284C7",
];

export function getCategoryColor(categoryName: string, index?: number): string {
  if (CATEGORY_MAP[categoryName]) return CATEGORY_MAP[categoryName].color;
  if (index !== undefined) return PALETTE[index % PALETTE.length];
  // Hash the name for a stable color
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = (hash * 31 + categoryName.charCodeAt(i)) & 0xffffffff;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function getCategoryIcon(categoryName: string): string {
  return CATEGORY_MAP[categoryName]?.icon ?? "💰";
}
