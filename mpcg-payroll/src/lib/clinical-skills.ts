export const CLINICAL_SKILL_PRESETS = [
  {
    id: 'advanced-physio',
    name: 'Advanced Physiotherapy',
    detail: 'Manual Therapy, Osteopathy, Chiropractic, Dry Needling',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'modalities',
    name: 'Modalities',
    detail: 'IFT, Ultrasound, Laser, Traction, TENS, Heat/Cryo',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'wellness',
    name: 'Wellness & Fitness',
    detail: 'Ergonomics, Posture Correction, Core & Strength Training',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'ortho',
    name: 'Orthopedic Rehab',
    detail: 'Spine, Knee, Shoulder, Joint Replacements & Fractures',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'neuro',
    name: 'Neuro Rehab',
    detail: 'Stroke, Parkinson’s, Paralysis, Balance & Gait',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'sports',
    name: 'Sports Injury Rehab',
    detail: 'Ligament Tears, Athletic Conditioning, Return to Sport',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'pediatric',
    name: 'Pediatric Physiotherapy',
    detail: 'Developmental Milestones, Cerebral Palsy, Posture',
    color: '#14b8a6',
    bgColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
];

export function parseClinicalSkills(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    // Comma-separated fallback
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
