import * as Lucide from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export function Icon({ name, className, size = 20 }: IconProps) {
  // Retrieve icon component dynamically, default to Music icon if not found
  const IconComponent = (Lucide as any)[name] || Lucide.Music;
  return <IconComponent className={className} size={size} />;
}
