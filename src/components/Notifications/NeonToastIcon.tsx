/**
 * NeonToastIcon - Animated icon with glow and sparkles
 *
 * Features:
 * - Gradient background circle
 * - Glow pulse animation
 * - Animated icon drawing (checkmark, x-mark)
 * - Floating sparkles
 */

import { ReactNode, memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, Sparkles } from 'lucide-react';
import { NotificationType } from '../../stores/notificationStore';
import {
  iconContainerVariants,
  sparkleVariants,
  spinnerVariants,
} from '../../animations/toastVariants';

// ============================================
// TYPES
// ============================================

interface NeonToastIconProps {
  type: NotificationType;
  customIcon?: ReactNode;
  showSparkles?: boolean;
}

// ============================================
// ICON MAPPING
// ============================================

const getIcon = (type: NotificationType): ReactNode => {
  const iconProps = { size: 20, strokeWidth: 2.5 };

  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} />;
    case 'error':
      return <XCircle {...iconProps} />;
    case 'warning':
      return <AlertTriangle {...iconProps} />;
    case 'info':
      return <Info {...iconProps} />;
    case 'loading':
      return (
        <motion.div
          variants={spinnerVariants}
          animate="spinning"
          style={{ display: 'flex' }}
        >
          <Loader2 {...iconProps} />
        </motion.div>
      );
    default:
      return <Info {...iconProps} />;
  }
};

// ============================================
// SPARKLE COMPONENT
// ============================================

const SparkleIcon = memo(({ index }: { index: number }) => (
  <motion.div
    className="neon-toast__sparkle"
    variants={sparkleVariants}
    initial="hidden"
    animate="visible"
    custom={index}
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
    }}
  >
    <Sparkles size={10} />
  </motion.div>
));

SparkleIcon.displayName = 'SparkleIcon';

// ============================================
// MAIN COMPONENT
// ============================================

const NeonToastIcon = memo(({
  type,
  customIcon,
  showSparkles = true,
}: NeonToastIconProps) => {
  const shouldShowSparkles = showSparkles && (type === 'success' || type === 'warning');
  const sparkleCount = type === 'success' ? 4 : 3;

  return (
    <motion.div
      className={`neon-toast__icon neon-toast__icon--${type}`}
      variants={iconContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Main Icon */}
      <span className="neon-toast__icon-inner">
        {customIcon || getIcon(type)}
      </span>

      {/* Sparkles */}
      {shouldShowSparkles && (
        <div className="neon-toast__sparkles">
          {Array.from({ length: sparkleCount }).map((_, i) => (
            <SparkleIcon key={i} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
});

NeonToastIcon.displayName = 'NeonToastIcon';

export default NeonToastIcon;
