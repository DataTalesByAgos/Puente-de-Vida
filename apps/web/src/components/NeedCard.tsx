'use client';

import { motion } from 'framer-motion';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  NEED_STATUS_LABELS,
  NEED_SCOPE_LABELS,
  PRIORITY_LABELS,
  SUBCATEGORY_LABELS,
  type LocalNeed,
} from '@/lib/types';
import { PRIORITY_CHIP, CATEGORY_CHIP, STATUS_CHIP, SCOPE_CHIP, timeAgo } from '@/lib/format';

export function NeedCard({
  need,
  onSelect,
}: {
  need: LocalNeed;
  onSelect?: (n: LocalNeed) => void;
}) {
  const critical = need.priority === 'critica';
  const scopeLabel = NEED_SCOPE_LABELS[need.scope];
  const subLabel = need.subcategory
    ? (SUBCATEGORY_LABELS[need.subcategory] ?? need.subcategory)
    : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.5 }}
      className={`card flex flex-col gap-2.5 cursor-pointer transition-shadow hover:shadow-md ${critical ? 'border-l-4 border-l-coral' : ''}`}
      onClick={() => onSelect?.(need)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-xl"
            aria-hidden
          >
            {CATEGORY_ICONS[need.category]}
          </span>
          <div>
            <p className="font-display text-sm font-bold">{need.title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span className={`chip ${CATEGORY_CHIP[need.category]}`}>
                {CATEGORY_LABELS[need.category]}
              </span>
              {subLabel && <span className="chip border border-line bg-paper">{subLabel}</span>}
              <span>· {timeAgo(need.createdAt)}</span>
            </div>
          </div>
        </div>
        <span className={`chip ${PRIORITY_CHIP[need.priority]}`}>
          {PRIORITY_LABELS[need.priority]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-ink/90">{need.description}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {need.locationText && <span>📍 {need.locationText}</span>}
        {need.peopleRequired != null && need.peopleRequired > 0 && (
          <span>👥 {need.peopleRequired} personas requeridas</span>
        )}
        {need.resourcesNeeded && <span>📦 {need.resourcesNeeded}</span>}
        {need.orgName && <span>🏛️ {need.orgName}</span>}
        {need.synced === 0 && (
          <span className="chip border border-amber/50 bg-amber/20 text-amberInk">sin subir</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        <div className="flex items-center gap-1.5">
          <span className={`chip ${STATUS_CHIP[need.status]}`}>
            {NEED_STATUS_LABELS[need.status]}
          </span>
          <span className={`chip ${SCOPE_CHIP[need.scope]}`}>{scopeLabel}</span>
        </div>
      </div>
    </motion.article>
  );
}
