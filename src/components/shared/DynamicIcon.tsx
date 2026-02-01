'use client';

import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

// Map of icon names to Lucide icons
const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  // Income icons
  Briefcase: LucideIcons.Briefcase,
  Laptop: LucideIcons.Laptop,
  TrendingUp: LucideIcons.TrendingUp,
  Gift: LucideIcons.Gift,
  Plus: LucideIcons.Plus,
  // Expense icons
  Utensils: LucideIcons.Utensils,
  ShoppingBag: LucideIcons.ShoppingBag,
  Car: LucideIcons.Car,
  Film: LucideIcons.Film,
  Zap: LucideIcons.Zap,
  Heart: LucideIcons.Heart,
  GraduationCap: LucideIcons.GraduationCap,
  Home: LucideIcons.Home,
  Shield: LucideIcons.Shield,
  User: LucideIcons.User,
  CreditCard: LucideIcons.CreditCard,
  Plane: LucideIcons.Plane,
  MoreHorizontal: LucideIcons.MoreHorizontal,
  // Additional common icons
  DollarSign: LucideIcons.DollarSign,
  Wallet: LucideIcons.Wallet,
  PiggyBank: LucideIcons.PiggyBank,
  Building: LucideIcons.Building,
  Building2: LucideIcons.Building2,
  Coffee: LucideIcons.Coffee,
  Wine: LucideIcons.Wine,
  Pizza: LucideIcons.Pizza,
  ShoppingCart: LucideIcons.ShoppingCart,
  Bus: LucideIcons.Bus,
  Train: LucideIcons.Train,
  Bike: LucideIcons.Bike,
  Fuel: LucideIcons.Fuel,
  Tv: LucideIcons.Tv,
  Music: LucideIcons.Music,
  Gamepad2: LucideIcons.Gamepad2,
  Book: LucideIcons.Book,
  BookOpen: LucideIcons.BookOpen,
  Lightbulb: LucideIcons.Lightbulb,
  Droplets: LucideIcons.Droplets,
  Wifi: LucideIcons.Wifi,
  Phone: LucideIcons.Phone,
  Smartphone: LucideIcons.Smartphone,
  Pill: LucideIcons.Pill,
  Stethoscope: LucideIcons.Stethoscope,
  Baby: LucideIcons.Baby,
  Dog: LucideIcons.Dog,
  Cat: LucideIcons.Cat,
  Scissors: LucideIcons.Scissors,
  Shirt: LucideIcons.Shirt,
  Watch: LucideIcons.Watch,
  Gem: LucideIcons.Gem,
  Palette: LucideIcons.Palette,
  Camera: LucideIcons.Camera,
  MapPin: LucideIcons.MapPin,
  Landmark: LucideIcons.Landmark,
  Banknote: LucideIcons.Banknote,
  Receipt: LucideIcons.Receipt,
  FileText: LucideIcons.FileText,
  Tag: LucideIcons.Tag,
  Star: LucideIcons.Star,
  Sparkles: LucideIcons.Sparkles,
  PartyPopper: LucideIcons.PartyPopper,
  Cake: LucideIcons.Cake,
  // Default fallback
  CircleDollarSign: LucideIcons.CircleDollarSign,
};

interface DynamicIconProps extends Omit<LucideProps, 'ref' | 'name'> {
  name: string | undefined | null;
  fallback?: React.ComponentType<LucideProps>;
}

export function DynamicIcon({ name, fallback: Fallback = LucideIcons.CircleDollarSign, ...props }: DynamicIconProps) {
  // If the icon is an emoji (single character or emoji), render it as text
  if (name && (name.length <= 2 || /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(name))) {
    return (
      <span className="flex items-center justify-center" style={{ fontSize: props.size || 16 }}>
        {name}
      </span>
    );
  }

  const IconComponent = name ? iconMap[name] : Fallback;
  
  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  // Return fallback if icon not found
  return <Fallback {...props} />;
}

// Export the icon map keys for use in icon pickers
export const availableIcons = Object.keys(iconMap);
