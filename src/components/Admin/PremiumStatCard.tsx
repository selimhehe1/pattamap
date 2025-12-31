import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PremiumStatCardProps {
  title: string;
  value: number;
  pending?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  delay?: number;
}

// Animated counter hook
const useAnimatedCounter = (endValue: number, duration: number = 1500) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = countRef.current;
    const difference = endValue - startValue;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      // Easing function: easeOutExpo
      const easedProgress = 1 - Math.pow(2, -10 * progress);

      const currentValue = Math.floor(startValue + difference * easedProgress);
      setCount(currentValue);
      countRef.current = currentValue;

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
        countRef.current = endValue;
      }
    };

    startTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [endValue, duration]);

  return count;
};

// Color to RGB helper
const colorToRgb = (color: string): string => {
  if (color.startsWith('var(--')) {
    // Handle CSS variables - return a fallback
    const colorMap: Record<string, string> = {
      'var(--color-primary)': '232, 121, 249',
      'var(--color-secondary)': '0, 229, 255',
      'var(--color-accent)': '232, 121, 249',
      'var(--color-success)': '16, 185, 129',
      'var(--color-error)': '248, 113, 113',
      'var(--color-gold)': '255, 215, 0'
    };
    return colorMap[color] || '232, 121, 249';
  }

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  return '232, 121, 249';
};

const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
  title,
  value,
  pending = 0,
  icon,
  color,
  subtitle,
  trend,
  onClick,
  delay = 0
}) => {
  const animatedValue = useAnimatedCounter(value);
  const rgbColor = colorToRgb(color);

  return (
    <motion.div
      className="stat-card-premium"
      onClick={onClick}
      style={{
        '--stat-color': color,
        '--stat-color-rgb': rgbColor,
        '--stat-glow': `rgba(${rgbColor}, 0.4)`,
        cursor: onClick ? 'pointer' : 'default'
      } as React.CSSProperties}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        y: -8,
        rotateX: 5,
        transition: { duration: 0.3 }
      }}
    >
      {/* Background Icon */}
      <div className="stat-card-premium__bg-icon" style={{ color }}>
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 120 })}
      </div>

      {/* Icon */}
      <motion.div
        className="stat-card-premium__icon"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ duration: 0.3 }}
      >
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 28 })}
      </motion.div>

      {/* Title */}
      <h3 className="stat-card-premium__title">{title}</h3>

      {/* Animated Value */}
      <motion.div
        className="stat-card-premium__value"
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.2 }}
      >
        {animatedValue.toLocaleString()}
      </motion.div>

      {/* Subtitle */}
      {subtitle && (
        <p className="stat-card-premium__subtitle">{subtitle}</p>
      )}

      {/* Pending Badge */}
      {pending > 0 && (
        <motion.div
          className="stat-card-premium__pending"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.4, type: 'spring', stiffness: 500 }}
        >
          <span className="stat-card-premium__pending-dot" />
          <span>{pending} pending</span>
        </motion.div>
      )}

      {/* Trend Indicator */}
      {trend && (
        <div className={`stat-card-premium__trend stat-card-premium__trend--${trend.isPositive ? 'up' : 'down'}`}>
          {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
        </div>
      )}
    </motion.div>
  );
};

export default PremiumStatCard;
