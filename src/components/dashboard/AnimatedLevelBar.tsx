'use client';
// src/components/dashboard/AnimatedLevelBar.tsx
// Animated level track with spring pop-in, glowing active node, pulsing ring
import { motion, AnimatePresence } from 'framer-motion';
import { DAY_LEVEL_CONFIG, DayLevel } from '@/types';

interface Props {
  level: DayLevel;
  pct: number;          // 0-1
  done: number;
  total: number;
}

const LEVELS: DayLevel[] = [1, 2, 3, 4, 5, 6];

export default function AnimatedLevelBar({ level, pct, done, total }: Props) {
  const nextLevel = Math.min(level + 1, 6) as DayLevel;
  const nextCfg   = DAY_LEVEL_CONFIG[nextLevel];
  const currCfg   = DAY_LEVEL_CONFIG[level];

  // Tasks needed to reach next level
  const nextMin = nextCfg.minRate;
  const tasksNeeded = total > 0
    ? Math.max(0, Math.ceil(nextMin * total) - done)
    : 0;

  return (
    <div>
      {/* Node track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {LEVELS.map((lv, i) => {
          const cfg    = DAY_LEVEL_CONFIG[lv];
          const isDone = lv < level;
          const isActive = lv === level;
          const isLocked = lv > level;

          return (
            <div key={lv} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {/* Node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative' }}>
                {/* Glow ring — only on active */}
                {isActive && (
                  <motion.div
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '50%',
                      border: '2px solid var(--accent)',
                    }}
                    animate={{ opacity: [0.35, 0.08, 0.35], scale: [1, 1.18, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: isLocked ? 0.28 : 1 }}
                  transition={{
                    delay: i * 0.07,
                    type: 'spring',
                    stiffness: 380,
                    damping: 22,
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: isDone
                      ? 'var(--accent3)'
                      : isActive
                      ? 'var(--accent)'
                      : 'var(--surface)',
                    border: `2px solid ${
                      isDone
                        ? 'var(--accent3)'
                        : isActive
                        ? 'var(--accent)'
                        : 'var(--border2)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    position: 'relative',
                    zIndex: 1,
                    cursor: 'default',
                  }}
                  title={cfg.label}
                >
                  {cfg.emoji}
                </motion.div>

                <div style={{
                  fontSize: 10,
                  color: isActive ? 'var(--accent)' : 'var(--text3)',
                  fontWeight: isActive ? 500 : 400,
                  textAlign: 'center',
                  maxWidth: 48,
                  lineHeight: 1.3,
                }}>
                  {cfg.label}
                </div>
              </div>

              {/* Connector line */}
              {i < LEVELS.length - 1 && (
                <motion.div
                  style={{
                    flex: 1,
                    height: 2,
                    borderRadius: 1,
                    background: isDone ? 'var(--accent3)' : 'var(--border)',
                    alignSelf: 'center',
                    marginBottom: 22,
                    transformOrigin: 'left center',
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.1 + 0.1, duration: 0.4, ease: 'easeOut' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <motion.div
        key={level}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}
      >
        {level === 6
          ? `🎉 Maximum level reached today — ${currCfg.emoji} ${currCfg.label}!`
          : tasksNeeded === 0
          ? `Almost at ${nextCfg.emoji} ${nextCfg.label}!`
          : `Complete ${tasksNeeded} more task${tasksNeeded > 1 ? 's' : ''} to reach ${nextCfg.emoji} ${nextCfg.label}`}
      </motion.div>
    </div>
  );
}
